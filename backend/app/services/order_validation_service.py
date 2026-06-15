"""Order validation rules engine with FEFO, credit, stock, and promotion checks."""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import asc
from sqlalchemy.orm import Session, joinedload

from app.models import (
    Customer,
    Order,
    OrderItem,
    OrderStatusEnum,
    Product,
    ProductItemStock,
    ProductItemStockDetail,
)
from app.models_platform import (
    CustomerCreditBalance,
    OrderBatchAllocation,
    OrderValidationMessage,
    OrderValidationRun,
    RiskLevelEnum,
    ValidationRuleConfig,
    ValidationStatusEnum,
)
from app.services.audit_service import AuditService
from app.services.promotion_service import PromotionService
from app.services.status_service import StatusTransitionService
from app.services.stock_reservation_service import StockReservationService


DEFAULT_RULES = [
    ("CUSTOMER_ACTIVE", "Customer must be active", "ERROR", True),
    ("PRODUCT_ACTIVE", "Product must be active", "ERROR", True),
    ("CREDIT_LIMIT", "Credit limit check", "ERROR", True),
    ("CREDIT_PERIOD", "Credit period / day-of-month rule", "ERROR", True),
    ("STOCK_AVAILABLE", "Sellable stock availability", "ERROR", True),
    ("FEFO_ALLOCATION", "FEFO batch allocation", "ERROR", True),
    ("PRICE_AVAILABLE", "Price must exist", "ERROR", True),
    ("DISCOUNT_VALID", "Discount within limits", "WARNING", False),
    ("PROMOTION_APPLY", "Promotion scheme application", "WARNING", False),
    ("HIGH_VALUE", "High value order flag", "WARNING", False),
    ("OVERDUE_CUSTOMER", "Overdue customer flag", "ERROR", True),
]


class OrderValidationService:
    HIGH_VALUE_THRESHOLD = Decimal("500000")

    @staticmethod
    def ensure_default_rules(db: Session) -> None:
        for code, name, severity, enabled in DEFAULT_RULES:
            existing = db.query(ValidationRuleConfig).filter(ValidationRuleConfig.rule_code == code).first()
            if not existing:
                db.add(ValidationRuleConfig(
                    rule_code=code, rule_name=name, severity=severity, enabled=enabled,
                    config_json={"credit_order_days": list(range(1, 8))},
                ))
        db.commit()

    @staticmethod
    def _order_total(order: Order, items: List[OrderItem]) -> Decimal:
        total = Decimal("0")
        for item in items:
            if not item.selected:
                continue
            unit_price = item.unit_price or item.trade_price or Decimal("0")
            discount = item.discount_percent or Decimal("0")
            price_after = unit_price * (1 - discount / 100)
            qty = item.total_quantity or (item.quantity + (item.free_goods or 0))
            total += price_after * qty
        return total

    @staticmethod
    def _get_customer(db: Session, order: Order) -> Optional[Customer]:
        if order.customer_code:
            return db.query(Customer).filter(Customer.code == order.customer_code).first()
        return db.query(Customer).filter(Customer.code == order.customer_id).first()

    @staticmethod
    def _get_outstanding(db: Session, customer_id: int) -> Decimal:
        bal = db.query(CustomerCreditBalance).filter(CustomerCreditBalance.customer_id == customer_id).first()
        if bal:
            return Decimal(str(bal.balance_amount or 0))
        # Estimate from pending collection orders
        pending = db.query(Order).filter(
            Order.customer_code == db.query(Customer).filter(Customer.id == customer_id).first().code
            if db.query(Customer).filter(Customer.id == customer_id).first() else None
        ).all()
        return Decimal("0")

    @staticmethod
    def _allocate_fefo(
        db: Session,
        product: Product,
        required_qty: Decimal,
        depot_id: Optional[int],
    ) -> Tuple[List[dict], Decimal]:
        """FEFO from product_item_stock_details (sellable/unrestricted only)."""
        remaining = float(required_qty)
        allocations: List[dict] = []
        shortfall = Decimal("0")

        stock_headers = db.query(ProductItemStock).filter(ProductItemStock.product_id == product.id)
        if depot_id:
            stock_headers = stock_headers.filter(ProductItemStock.depot_id == depot_id)
        header_ids = [h.id for h in stock_headers.all()]
        if not header_ids:
            return [], required_qty

        details = (
            db.query(ProductItemStockDetail)
            .filter(
                ProductItemStockDetail.item_code.in_(header_ids),
                ProductItemStockDetail.available_quantity > 0,
            )
            .filter(
                (ProductItemStockDetail.status == "Unrestricted")
                | (ProductItemStockDetail.status == "Sellable")
                | (ProductItemStockDetail.status.is_(None))
            )
            .order_by(asc(ProductItemStockDetail.expiry_date).nullslast(), asc(ProductItemStockDetail.batch_no))
            .all()
        )

        for detail in details:
            if remaining <= 0:
                break
            available = float(detail.available_quantity or 0)
            if available <= 0:
                continue
            allocated = min(available, remaining)
            allocations.append({
                "product_id": product.id,
                "batch_no": detail.batch_no,
                "expiry_date": detail.expiry_date,
                "allocated_qty": Decimal(str(allocated)),
                "stock_source_id": detail.id,
            })
            remaining -= allocated

        if remaining > 0:
            shortfall = Decimal(str(remaining))
        return allocations, shortfall

    @staticmethod
    def validate_order(
        db: Session,
        order: Order,
        user,
        *,
        auto_approve_low_risk: bool = True,
    ) -> OrderValidationRun:
        OrderValidationService.ensure_default_rules(db)

        StockReservationService.release_for_order(db, order.id, user)

        # Supersede previous current run
        db.query(OrderValidationRun).filter(
            OrderValidationRun.order_id == order.id,
            OrderValidationRun.is_current == True,
        ).update({"is_current": False})

        selected_items = [i for i in order.items if i.selected]
        if not selected_items:
            run = OrderValidationRun(
                order_id=order.id,
                validation_status=ValidationStatusEnum.FAILED,
                risk_level=RiskLevelEnum.HIGH,
                requires_approval=False,
            )
            db.add(run)
            db.flush()
            db.add(OrderValidationMessage(
                validation_run_id=run.id, order_id=order.id,
                severity="ERROR", rule_code="ITEMS_SELECTED", message="No items selected",
                blocking=True,
            ))
            db.commit()
            return run

        rules = {r.rule_code: r for r in db.query(ValidationRuleConfig).filter(ValidationRuleConfig.enabled == True).all()}
        messages: List[OrderValidationMessage] = []
        batch_rows: List[OrderBatchAllocation] = []
        blocking = False
        requires_approval = False
        risk = RiskLevelEnum.LOW
        short_stock_total = Decimal("0")
        order_total = OrderValidationService._order_total(order, selected_items)
        customer = OrderValidationService._get_customer(db, order)
        order_type = (order.order_type or "COD").upper()
        today = date.today()

        # Customer active
        if rules.get("CUSTOMER_ACTIVE") and customer and not customer.is_active:
            messages.append(OrderValidationMessage(
                order_id=order.id, severity="ERROR", rule_code="CUSTOMER_ACTIVE",
                message=f"Customer {customer.name} is inactive", blocking=True,
            ))
            blocking = True

        if rules.get("CUSTOMER_ACTIVE") and not customer:
            messages.append(OrderValidationMessage(
                order_id=order.id, severity="ERROR", rule_code="CUSTOMER_ACTIVE",
                message="Customer not found in master", blocking=True,
            ))
            blocking = True

        outstanding = Decimal("0")
        credit_limit = Decimal("0")
        if customer:
            credit_limit = Decimal(str(customer.credit_limit or 0))
            cb = db.query(CustomerCreditBalance).filter(CustomerCreditBalance.customer_id == customer.id).first()
            outstanding = Decimal(str(cb.balance_amount if cb else 0))

        exposure = outstanding + order_total

        # Credit rules
        if order_type in ("CREDIT", "INVOICE") and customer:
            if rules.get("CREDIT_LIMIT") and credit_limit > 0 and exposure > credit_limit:
                messages.append(OrderValidationMessage(
                    order_id=order.id, severity="ERROR", rule_code="CREDIT_LIMIT",
                    message=f"Credit exposure {exposure} exceeds limit {credit_limit}",
                    blocking=True,
                ))
                blocking = True
                requires_approval = True
                risk = RiskLevelEnum.HIGH

            if rules.get("CREDIT_PERIOD"):
                credit_days = rules["CREDIT_PERIOD"].config_json or {}
                allowed_days = credit_days.get("credit_order_days", list(range(1, 8)))
                if order_type == "CREDIT" and today.day not in allowed_days:
                    messages.append(OrderValidationMessage(
                        order_id=order.id, severity="ERROR", rule_code="CREDIT_PERIOD",
                        message=f"Credit orders only allowed on days {allowed_days} unless approved",
                        blocking=True,
                    ))
                    blocking = True
                    requires_approval = True
                    risk = RiskLevelEnum.HIGH

        if order_total >= OrderValidationService.HIGH_VALUE_THRESHOLD:
            messages.append(OrderValidationMessage(
                order_id=order.id, severity="WARNING", rule_code="HIGH_VALUE",
                message=f"High value order: {order_total}", blocking=False,
            ))
            risk = RiskLevelEnum.MEDIUM
            requires_approval = True

        depot_id = None
        if order.depot_code:
            from app.models import Depot
            depot = db.query(Depot).filter(Depot.code == order.depot_code).first()
            depot_id = depot.id if depot else None

        # Per-item stock + FEFO
        for item in selected_items:
            product = db.query(Product).filter(
                (Product.code == item.product_code) | (Product.sku == item.product_code)
            ).first()
            if not product:
                messages.append(OrderValidationMessage(
                    order_id=order.id, order_item_id=item.id, severity="ERROR",
                    rule_code="PRODUCT_ACTIVE", message=f"Product {item.product_code} not found", blocking=True,
                ))
                blocking = True
                continue

            if rules.get("PRODUCT_ACTIVE") and not product.is_active:
                messages.append(OrderValidationMessage(
                    order_id=order.id, order_item_id=item.id, severity="ERROR",
                    rule_code="PRODUCT_ACTIVE", message=f"Product {product.name} inactive", blocking=True,
                ))
                blocking = True

            qty = item.total_quantity or (item.quantity + (item.free_goods or 0))
            allocations, shortfall = OrderValidationService._allocate_fefo(db, product, Decimal(str(qty)), depot_id)
            if shortfall > 0:
                unit_price = item.unit_price or item.trade_price or Decimal("0")
                short_stock_total += shortfall * unit_price
                messages.append(OrderValidationMessage(
                    order_id=order.id, order_item_id=item.id, severity="ERROR",
                    rule_code="STOCK_AVAILABLE",
                    message=f"Short stock {shortfall} for {product.name}", blocking=True,
                ))
                blocking = True

            for alloc in allocations:
                batch_rows.append({**alloc, "order_item_id": item.id})

            if item.discount_percent and Decimal(str(item.discount_percent)) > Decimal("50"):
                messages.append(OrderValidationMessage(
                    order_id=order.id, order_item_id=item.id, severity="WARNING",
                    rule_code="DISCOUNT_VALID", message="Discount exceeds 50%", blocking=False,
                ))

        # Promotions
        promo_msgs = PromotionService.simulate_for_order(db, order, selected_items, customer)
        for pm in promo_msgs:
            messages.append(OrderValidationMessage(
                order_id=order.id, severity=pm.get("severity", "INFO"),
                rule_code="PROMOTION_APPLY", message=pm.get("message", ""), blocking=False,
            ))

        # Determine status
        if blocking:
            val_status = ValidationStatusEnum.PENDING if requires_approval else ValidationStatusEnum.FAILED
        elif requires_approval:
            val_status = ValidationStatusEnum.PENDING_APPROVAL
        else:
            val_status = ValidationStatusEnum.VALIDATED

        run = OrderValidationRun(
            order_id=order.id,
            validation_status=val_status,
            risk_level=risk,
            total_requested_value=order_total,
            total_validated_value=order_total - short_stock_total if not blocking else Decimal("0"),
            total_short_stock_value=short_stock_total,
            credit_limit=credit_limit,
            outstanding_amount=outstanding,
            credit_exposure_after_order=exposure,
            requires_approval=requires_approval,
            approval_reason="; ".join(m.message for m in messages if m.blocking) if blocking else None,
            validated_by=user.id if val_status == ValidationStatusEnum.VALIDATED else None,
            validated_at=datetime.utcnow() if val_status == ValidationStatusEnum.VALIDATED else None,
            is_current=True,
        )
        db.add(run)
        db.flush()

        for m in messages:
            m.validation_run_id = run.id
            db.add(m)

        created_allocations: List[OrderBatchAllocation] = []
        for alloc in batch_rows:
            row = OrderBatchAllocation(
                validation_run_id=run.id,
                order_id=order.id,
                order_item_id=alloc["order_item_id"],
                product_id=alloc["product_id"],
                batch_no=alloc["batch_no"],
                expiry_date=alloc["expiry_date"],
                allocated_qty=alloc["allocated_qty"],
                stock_source_id=alloc["stock_source_id"],
            )
            db.add(row)
            created_allocations.append(row)
        db.flush()

        if val_status == ValidationStatusEnum.VALIDATED and created_allocations:
            StockReservationService.reserve_allocations(db, order.id, created_allocations, user)

        # Apply validation to order if passed
        if val_status == ValidationStatusEnum.VALIDATED:
            all_selected = all(i.selected for i in order.items)
            order.validated = True
            order.validation_status = val_status.value
            order.risk_level = risk.value
            order.requires_approval = False
            order.status = OrderStatusEnum.APPROVED if all_selected else OrderStatusEnum.PARTIALLY_APPROVED
            try:
                StatusTransitionService.transition(db, order, "VALIDATE", user, force=True)
            except Exception:
                order.delivery_status = "VALIDATED"
        elif val_status == ValidationStatusEnum.PENDING_APPROVAL:
            order.validation_status = val_status.value
            order.risk_level = risk.value
            order.requires_approval = True
            order.validated = False
        else:
            order.validation_status = val_status.value
            order.validated = False
            order.requires_approval = requires_approval

        AuditService.log_action(
            db, entity_type="order", entity_id=str(order.id), action="VALIDATE",
            user=user, new_value={
                "validation_status": val_status.value,
                "risk_level": risk.value,
                "messages": [m.message for m in messages],
            },
        )
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def approve_exception(db: Session, order: Order, user, reason: str) -> OrderValidationRun:
        run = (
            db.query(OrderValidationRun)
            .filter(OrderValidationRun.order_id == order.id, OrderValidationRun.is_current == True)
            .first()
        )
        if not run:
            raise ValueError("No validation run found")

        run.validation_status = ValidationStatusEnum.VALIDATED
        run.validated_by = user.id
        run.validated_at = datetime.utcnow()
        run.requires_approval = False
        order.validated = True
        order.validation_status = ValidationStatusEnum.VALIDATED.value
        order.requires_approval = False
        order.status = OrderStatusEnum.APPROVED
        order.delivery_status = "VALIDATED"

        allocations = (
            db.query(OrderBatchAllocation)
            .filter(OrderBatchAllocation.validation_run_id == run.id)
            .all()
        )
        if allocations:
            StockReservationService.reserve_allocations(db, order.id, allocations, user)

        AuditService.log_approval(db, "order", str(order.id), user, reason=reason, remarks="Exception approval")
        db.commit()
        return run
