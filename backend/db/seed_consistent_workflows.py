"""Idempotent demo workflows that post inventory through the same rules as the app.

Opening balances come from seed_product_stock_data. This module adds receipts,
adjustments, orders, transfers, collections, and audit rows.

Approved product receipts call app.routers.product_receipts.post_to_stock_ledger
and mirror the same quantity into product_item_stock. Draft and unverified
return receipts do not post.

Physical stock is reduced only for the delivered portion of a demo order.
Postponed orders and the undelivered portion of a partial order stay RESERVED.
StockReservationService.commit_for_order is not used: that helper marks stock
ISSUED at loading time and does not reduce on-hand.

Depot transfers are inserted as Pending, then approved and received through
app.routers.depot_transfers so source and destination quantities follow that
router. stock_ledger is moved by the same quantity because that router only
updates product_item_stock.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app import models
from app.models_platform import (
    AuditLog,
    OrderBatchAllocation,
    OrderStatusHistory,
    Promotion,
    PromotionProduct,
    PromotionRule,
    PromotionStatusEnum,
    ReconciliationLine,
    ReconciliationRun,
    ReconciliationStatusEnum,
)
from app.routers.depot_transfers import (
    ApproveRequest,
    ReceiveRequest,
    approve_depot_transfer,
    receive_depot_transfer,
)
from app.routers.product_receipts import post_to_stock_ledger
from app.services.audit_service import AuditService
from app.services.stock_reservation_service import StockReservationService
from db.inventory_rules import D, assert_balance

MARKER = "DEMO-WF"


def _exists(db: Session, model, **filters) -> bool:
    return db.query(model).filter_by(**filters).first() is not None


def _ledger(db: Session, product_id: int, depot_id: int, batch: str, expiry=None, create: bool = False):
    row = (
        db.query(models.StockLedger)
        .filter(
            models.StockLedger.product_id == product_id,
            models.StockLedger.depot_id == depot_id,
            models.StockLedger.batch == batch,
        )
        .first()
    )
    if row or not create:
        return row
    row = models.StockLedger(
        product_id=product_id,
        depot_id=depot_id,
        batch=batch,
        quantity=Decimal("0"),
        reserved_quantity=Decimal("0"),
        available_quantity=Decimal("0"),
        expiry_date=expiry,
        storage_type="Ambient",
        status="Unrestricted",
    )
    db.add(row)
    db.flush()
    return row


def mirror_opening_ledger(db: Session) -> int:
    """Copy opening batch rows into stock_ledger once.

    Dashboard KPIs read stock_ledger. The opening seed writes only
    product_item_stock_details. This is a snapshot of that opening balance,
    not an approved receipt.
    """
    if db.query(models.StockLedger).count() > 0:
        print("   stock_ledger already populated; opening mirror skipped")
        return 0
    created = 0
    details = db.query(models.ProductItemStockDetail).all()
    for detail in details:
        stock = detail.item_stock
        assert_balance(detail.quantity, detail.available_quantity, detail.reserved_quantity)
        db.add(
            models.StockLedger(
                product_id=stock.product_id,
                batch=detail.batch_no,
                depot_id=stock.depot_id,
                storage_type=detail.storage_type or "Ambient",
                quantity=detail.quantity,
                reserved_quantity=detail.reserved_quantity or 0,
                available_quantity=detail.available_quantity,
                expiry_date=detail.expiry_date,
                status=detail.status or "Unrestricted",
            )
        )
        created += 1
    db.flush()
    return created


def _apply_detail_and_ledger(detail, ledger, quantity, available, reserved) -> None:
    assert_balance(quantity, available, reserved)
    detail.quantity = quantity
    detail.available_quantity = available
    detail.reserved_quantity = reserved
    header = detail.item_stock
    if ledger:
        ledger.quantity = quantity
        ledger.available_quantity = available
        ledger.reserved_quantity = reserved
        ledger.expiry_date = detail.expiry_date or ledger.expiry_date
    header.stock_qty = sum((D(d.quantity) for d in header.details), Decimal("0"))


def _pick_detail(db: Session, depot_id: int, minimum: Decimal):
    rows = (
        db.query(models.ProductItemStockDetail)
        .join(models.ProductItemStock)
        .filter(models.ProductItemStock.depot_id == depot_id)
        .all()
    )
    rows.sort(key=lambda d: D(d.available_quantity), reverse=True)
    for detail in rows:
        if D(detail.available_quantity) >= minimum and D(detail.reserved_quantity) == 0:
            return detail
    for detail in rows:
        if D(detail.available_quantity) >= minimum:
            return detail
    return None


def _ensure_item_stock(db, product, depot_id: int) -> models.ProductItemStock:
    stock = (
        db.query(models.ProductItemStock)
        .filter(
            models.ProductItemStock.product_id == product.id,
            models.ProductItemStock.depot_id == depot_id,
        )
        .first()
    )
    if stock:
        return stock
    stock = models.ProductItemStock(
        product_id=product.id,
        product_code=product.code,
        sku_code=product.sku or product.code,
        gross_stock_receive=Decimal("0"),
        issue=Decimal("0"),
        stock_qty=Decimal("0"),
        adjusted_stock_in_qty=Decimal("0"),
        adjusted_stock_out_qty=Decimal("0"),
        depot_id=depot_id,
    )
    db.add(stock)
    db.flush()
    return stock


def _receive_into_stock(db, product, depot_id, batch, qty, expiry, source: str) -> None:
    stock = _ensure_item_stock(db, product, depot_id)
    detail = (
        db.query(models.ProductItemStockDetail)
        .filter(
            models.ProductItemStockDetail.item_code == stock.id,
            models.ProductItemStockDetail.batch_no == batch,
        )
        .first()
    )
    qty = D(qty)
    if not detail:
        detail = models.ProductItemStockDetail(
            item_code=stock.id,
            batch_no=batch,
            expiry_date=expiry,
            quantity=Decimal("0"),
            available_quantity=Decimal("0"),
            reserved_quantity=Decimal("0"),
            storage_type="Ambient",
            status="Unrestricted",
            source_type=source,
        )
        db.add(detail)
        db.flush()
        stock.details.append(detail)
    from db.inventory_rules import receive

    quantity, available, reserved = receive(
        detail.quantity, detail.available_quantity, detail.reserved_quantity, qty
    )
    ledger = _ledger(db, product.id, depot_id, batch, expiry, create=True)
    _apply_detail_and_ledger(detail, ledger, quantity, available, reserved)
    stock.gross_stock_receive = D(stock.gross_stock_receive) + qty


def seed_receipts(db: Session, depot, products, actor) -> int:
    specs = [
        ("DEMO-REC-FACT-001", models.ReceiptSourceEnum.FACTORY, True, products[0], "2401001", 120, 400),
        ("DEMO-REC-FACT-002", models.ReceiptSourceEnum.FACTORY, False, products[1], "2401002", 80, 500),
        ("DEMO-REC-DEPOT-001", models.ReceiptSourceEnum.DEPOT, True, products[2 % len(products)], "2401003", 60, 320),
        ("DEMO-REC-DEPOT-002", models.ReceiptSourceEnum.DEPOT, False, products[0], "2401004", 40, 300),
        ("DEMO-REC-RET-DRAFT", models.ReceiptSourceEnum.RETURN, False, products[1 % len(products)], "2401005", 15, 90),
        ("DEMO-REC-NEAR-EXP", models.ReceiptSourceEnum.FACTORY, True, products[0], "EXP2401", 36, 25),
        ("DEMO-REC-LOW", models.ReceiptSourceEnum.FACTORY, True, products[min(3, len(products) - 1)], "LOW2401", 8, 180),
    ]
    created = 0
    for number, source, approve, product, batch, qty, expiry_days in specs:
        if _exists(db, models.ProductReceipt, receipt_number=number):
            continue
        receipt = models.ProductReceipt(
            receipt_number=number,
            source_type=source,
            target_depot_id=depot.id,
            to_address=depot.address,
            tfa_number=f"TFA-{number[-3:]}",
            shipment_mode="Road",
            delivery_person=f"{actor.first_name}",
            vehicle_info="DM-11-0001",
            issued_date=date.today() - timedelta(days=2),
            status=models.ProductReceiptStatus.DRAFT,
            remarks=f"{MARKER} {source.value}",
        )
        db.add(receipt)
        db.flush()
        db.add(
            models.ProductReceiptItem(
                receipt_id=receipt.id,
                legacy_code=product.old_code,
                item_code=product.code,
                item_name=product.name,
                pack_size=product.primary_packaging or "Pack",
                uom=product.unit_of_measure or "PCS",
                expiry_date=date.today() + timedelta(days=expiry_days),
                batch_number=batch,
                depot_quantity=Decimal(str(qty)),
            )
        )
        db.flush()
        if approve:
            receipt.status = models.ProductReceiptStatus.APPROVED
            post_to_stock_ledger(db, receipt)
            _receive_into_stock(
                db,
                product,
                depot.id,
                batch,
                qty,
                date.today() + timedelta(days=expiry_days),
                source.value,
            )
        created += 1
    return created


def _adjust(detail, ledger, delta: Decimal, direction: str) -> None:
    from db.inventory_rules import receive

    delta = D(delta)
    if direction == "in":
        quantity, available, reserved = receive(
            detail.quantity, detail.available_quantity, detail.reserved_quantity, delta
        )
    else:
        if D(detail.available_quantity) < delta:
            raise ValueError("Adjustment would consume reserved or missing stock")
        quantity = D(detail.quantity) - delta
        available = D(detail.available_quantity) - delta
        reserved = D(detail.reserved_quantity)
        assert_balance(quantity, available, reserved)
    _apply_detail_and_ledger(detail, ledger, quantity, available, reserved)
    header = detail.item_stock
    if direction == "in":
        header.adjusted_stock_in_qty = D(header.adjusted_stock_in_qty) + delta
    else:
        header.adjusted_stock_out_qty = D(header.adjusted_stock_out_qty) + delta


def seed_adjustments(db: Session, depot, employee) -> int:
    specs = [
        ("DEMO-ADJ-PEND", "Pending", "Damaged carton, awaiting approval", -12, False),
        ("DEMO-ADJ-REJ", "Rejected", "Count sheet rejected", -8, False),
        ("DEMO-ADJ-IN", "Approved", "Found during cycle count", 10, True),
        ("DEMO-ADJ-OUT", "Approved", "Approved damage write-off", -6, True),
    ]
    created = 0
    for number, status, reason, delta, post in specs:
        if _exists(db, models.StockAdjustment, adjustment_number=number):
            continue
        detail = _pick_detail(db, depot.id, Decimal("30"))
        if not detail:
            print(f"   skip {number}: no batch with free stock")
            continue
        product_id = detail.item_stock.product_id
        adj = models.StockAdjustment(
            adjustment_number=number,
            adjustment_date=date.today() - timedelta(days=1),
            depot_id=depot.id,
            adjustment_type="Quantity",
            reason=reason,
            status=status,
            submitted_by=employee.id,
            approved_by=employee.id if status == "Approved" else None,
        )
        db.add(adj)
        db.flush()
        db.add(
            models.StockAdjustmentItem(
                adjustment_id=adj.id,
                product_id=product_id,
                batch=detail.batch_no,
                quantity_change=Decimal(str(delta)),
            )
        )
        if post:
            ledger = _ledger(db, product_id, depot.id, detail.batch_no, detail.expiry_date, create=True)
            _adjust(detail, ledger, abs(delta), "in" if delta > 0 else "out")
        created += 1
    return created


def _order(db, *, memo, depot, customer, employee, route, vehicle, loaded, validated, collection_status, collection_approved, postponed=False):
    order = models.Order(
        memo_number=memo,
        order_number=f"order-demo-{memo}",
        depot_code=depot.code,
        depot_name=depot.name,
        customer_id=str(customer.id),
        customer_name=customer.name,
        customer_code=customer.code,
        pso_id=str(employee.id),
        pso_name=f"{employee.first_name} {employee.last_name or ''}".strip(),
        pso_code=employee.employee_id,
        route_code=route.route_id if route else None,
        route_name=route.name if route else None,
        delivery_date=date.today(),
        status=models.OrderStatusEnum.APPROVED if validated else models.OrderStatusEnum.DRAFT,
        validated=validated,
        loaded=loaded,
        loaded_at=datetime.utcnow() if loaded else None,
        postponed=postponed,
        assigned_to=employee.id if loaded else None,
        assigned_vehicle=vehicle.id if loaded and vehicle else None,
        loading_number=f"LD-{memo}" if loaded else None,
        loading_date=date.today() if loaded else None,
        collection_status=collection_status,
        collection_approved=collection_approved,
        collection_source="Web" if collection_status else None,
        notes=MARKER,
    )
    db.add(order)
    db.flush()
    return order


def _add_item(db, order, product, detail, qty: Decimal):
    price = product.base_price or Decimal("100")
    item = models.OrderItem(
        order_id=order.id,
        product_code=product.code,
        product_name=product.name,
        pack_size=product.primary_packaging or "Pack",
        quantity=qty,
        free_goods=Decimal("0"),
        total_quantity=qty,
        trade_price=price,
        unit_price=price,
        discount_percent=Decimal("0"),
        batch_number=detail.batch_no,
        current_stock=detail.available_quantity,
        delivery_date=order.delivery_date,
        selected=True,
    )
    db.add(item)
    db.flush()
    return item


def _reserve(db, order, item, detail, qty: Decimal, user) -> OrderBatchAllocation:
    alloc = OrderBatchAllocation(
        order_id=order.id,
        order_item_id=item.id,
        product_id=detail.item_stock.product_id,
        batch_no=detail.batch_no,
        expiry_date=detail.expiry_date,
        allocated_qty=qty,
        stock_source_id=detail.id,
        allocation_status="ALLOCATED",
    )
    db.add(alloc)
    db.flush()
    StockReservationService.reserve_allocations(db, order.id, [alloc], user)
    ledger = _ledger(
        db,
        detail.item_stock.product_id,
        detail.item_stock.depot_id,
        detail.batch_no,
        detail.expiry_date,
        create=True,
    )
    _apply_detail_and_ledger(
        detail,
        ledger,
        detail.quantity,
        detail.available_quantity,
        detail.reserved_quantity,
    )
    return alloc


def _deduct_delivered(db, alloc: OrderBatchAllocation, delivered: Decimal) -> None:
    detail = db.query(models.ProductItemStockDetail).filter_by(id=alloc.stock_source_id).first()
    from db.inventory_rules import deduct_delivered

    quantity, available, reserved = deduct_delivered(
        detail.quantity, detail.available_quantity, detail.reserved_quantity, delivered
    )
    ledger = _ledger(
        db,
        detail.item_stock.product_id,
        detail.item_stock.depot_id,
        detail.batch_no,
        detail.expiry_date,
        create=False,
    )
    _apply_detail_and_ledger(detail, ledger, quantity, available, reserved)
    detail.item_stock.issue = D(detail.item_stock.issue) + D(delivered)
    remaining = D(alloc.allocated_qty) - D(delivered)
    if remaining == 0:
        alloc.allocation_status = "ISSUED"
    else:
        alloc.allocated_qty = remaining
        alloc.allocation_status = "RESERVED"


def _history(db, order, employee, event, to_delivery, to_collection):
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            to_delivery_status=to_delivery,
            to_collection_status=to_collection,
            event_code=event,
            changed_by=employee.id,
            reason=MARKER,
        )
    )


def _amounts(order, delivered_ratio: Decimal):
    total = Decimal("0")
    for item in order.items:
        total += D(item.unit_price) * D(item.total_quantity)
    order.collected_amount = (total * delivered_ratio).quantize(Decimal("0.01"))
    order.pending_amount = (total - order.collected_amount).quantize(Decimal("0.01"))
    return total


def seed_orders(db, depot, customers, employees, routes, vehicles) -> int:
    if _exists(db, models.Order, memo_number="88001001"):
        print("   demo workflow orders already present")
        return 0
    employee = employees[0]
    customer_cycle = customers
    route = routes[0] if routes else None
    vehicle = vehicles[0] if vehicles else None
    created = 0

    def customer(i):
        return customer_cycle[i % len(customer_cycle)]

    def take_detail(minimum):
        detail = _pick_detail(db, depot.id, Decimal(str(minimum)))
        if not detail:
            raise RuntimeError(f"No batch with {minimum} available units at depot {depot.code}")
        product = detail.item_stock.product
        return detail, product

    # 1. New, unvalidated order. No reservation.
    detail, product = take_detail(20)
    order = _order(
        db, memo="88001001", depot=depot, customer=customer(0), employee=employee,
        route=route, vehicle=None, loaded=False, validated=False,
        collection_status=None, collection_approved=False,
    )
    _add_item(db, order, product, detail, Decimal("10"))
    _history(db, order, employee, "ORDER_CREATED", "ORDER_CREATED", None)
    created += 1

    # 2. Validated reservation.
    detail, product = take_detail(20)
    order = _order(
        db, memo="88001002", depot=depot, customer=customer(1), employee=employee,
        route=route, vehicle=None, loaded=False, validated=True,
        collection_status=None, collection_approved=False,
    )
    item = _add_item(db, order, product, detail, Decimal("10"))
    _reserve(db, order, item, detail, Decimal("10"), employee)
    _history(db, order, employee, "VALIDATED", "VALIDATED", None)
    created += 1

    # 3. Assigned and loaded. Reservation held. Physical stock not deducted.
    detail, product = take_detail(20)
    order = _order(
        db, memo="88001003", depot=depot, customer=customer(2), employee=employee,
        route=route, vehicle=vehicle, loaded=True, validated=True,
        collection_status=None, collection_approved=False,
    )
    item = _add_item(db, order, product, detail, Decimal("12"))
    _reserve(db, order, item, detail, Decimal("12"), employee)
    _history(db, order, employee, "LOADED", "LOADED", None)
    created += 1

    # 4. Fully delivered, pending collection approval. Physical qty deducted.
    detail, product = take_detail(20)
    order = _order(
        db, memo="88001004", depot=depot, customer=customer(3), employee=employee,
        route=route, vehicle=vehicle, loaded=True, validated=True,
        collection_status="Pending", collection_approved=False,
    )
    item = _add_item(db, order, product, detail, Decimal("10"))
    alloc = _reserve(db, order, item, detail, Decimal("10"), employee)
    _deduct_delivered(db, alloc, Decimal("10"))
    _amounts(order, Decimal("1"))
    order.delivery_status = "DELIVERED"
    _history(db, order, employee, "DELIVERY_APPROVED", "DELIVERED", "Pending")
    created += 1

    # 5. Partial delivery. Delivered 6 deducted. Returned 4 stays reserved.
    detail, product = take_detail(20)
    order = _order(
        db, memo="88001005", depot=depot, customer=customer(4), employee=employee,
        route=route, vehicle=vehicle, loaded=True, validated=True,
        collection_status="Partially Collected", collection_approved=False,
    )
    order.collection_type = "Partial"
    item = _add_item(db, order, product, detail, Decimal("10"))
    alloc = _reserve(db, order, item, detail, Decimal("10"), employee)
    _deduct_delivered(db, alloc, Decimal("6"))
    _amounts(order, Decimal("0.6"))
    order.delivery_status = "PARTIAL"
    _history(db, order, employee, "PARTIAL_DELIVERY", "PARTIAL", "Partially Collected")
    created += 1

    # 6. Postponed. Reservation stays. Nothing returns to available.
    detail, product = take_detail(20)
    order = _order(
        db, memo="88001006", depot=depot, customer=customer(0), employee=employee,
        route=route, vehicle=vehicle, loaded=True, validated=True,
        collection_status="Postponed", collection_approved=False, postponed=True,
    )
    order.collection_type = "Postponed"
    item = _add_item(db, order, product, detail, Decimal("8"))
    _reserve(db, order, item, detail, Decimal("8"), employee)
    total = _amounts(order, Decimal("0"))
    order.pending_amount = total
    order.collected_amount = Decimal("0")
    order.delivery_status = "POSTPONED"
    _history(db, order, employee, "POSTPONED", "POSTPONED", "Postponed")
    created += 1

    # 7. Fully collected and collection-approved.
    detail, product = take_detail(20)
    order = _order(
        db, memo="88001007", depot=depot, customer=customer(1), employee=employee,
        route=route, vehicle=vehicle, loaded=True, validated=True,
        collection_status="Fully Collected", collection_approved=True,
    )
    order.collection_approved_at = datetime.utcnow()
    order.collection_approved_by = employee.id
    order.collection_type = "Full"
    item = _add_item(db, order, product, detail, Decimal("10"))
    alloc = _reserve(db, order, item, detail, Decimal("10"), employee)
    _deduct_delivered(db, alloc, Decimal("10"))
    _amounts(order, Decimal("1"))
    order.delivery_status = "DELIVERED"
    _history(db, order, employee, "COLLECTION_APPROVED", "DELIVERED", "Fully Collected")
    created += 1

    # 8. Second validated order so route lists are not a single row.
    detail, product = take_detail(15)
    order = _order(
        db, memo="88001008", depot=depot, customer=customer(2), employee=employee,
        route=route, vehicle=None, loaded=False, validated=True,
        collection_status=None, collection_approved=False,
    )
    item = _add_item(db, order, product, detail, Decimal("5"))
    _reserve(db, order, item, detail, Decimal("5"), employee)
    created += 1
    return created


def _move_ledger_transfer(db, product_id, from_depot, to_depot, batch, qty, expiry, phase: str) -> None:
    qty = D(qty)
    source = _ledger(db, product_id, from_depot, batch, expiry, create=False)
    if not source:
        raise RuntimeError(f"No ledger row for batch {batch} at depot {from_depot}")
    if phase == "approve":
        if D(source.available_quantity) < qty:
            raise RuntimeError("Ledger available is below transfer quantity")
        source.quantity = D(source.quantity) - qty
        source.available_quantity = D(source.available_quantity) - qty
        assert_balance(source.quantity, source.available_quantity, source.reserved_quantity)
    elif phase == "receive":
        dest = _ledger(db, product_id, to_depot, batch, expiry, create=True)
        dest.quantity = D(dest.quantity) + qty
        dest.available_quantity = D(dest.available_quantity) + qty
        dest.expiry_date = expiry or dest.expiry_date
        assert_balance(dest.quantity, dest.available_quantity, dest.reserved_quantity)


def seed_transfers(db, depots, products, employee, vehicle, driver) -> int:
    if len(depots) < 2:
        print("   skip transfers: need 2 depots")
        return 0
    source, dest = depots[0], depots[1]
    created = 0
    plans = [
        ("DEMO-DT-PENDING", "pending", Decimal("10")),
        ("DEMO-DT-TRANSIT", "transit", Decimal("15")),
        ("DEMO-DT-RECEIVED", "received", Decimal("12")),
    ]
    for number, phase, qty in plans:
        if _exists(db, models.DepotTransfer, transfer_number=number):
            continue
        detail = _pick_detail(db, source.id, qty + Decimal("5"))
        if not detail:
            print(f"   skip {number}: not enough free stock")
            continue
        transfer = models.DepotTransfer(
            transfer_number=number,
            transfer_date=date.today(),
            from_depot_id=source.id,
            to_depot_id=dest.id,
            vehicle_id=vehicle.id if vehicle else None,
            driver_name=f"{driver.first_name} {driver.last_name or ''}".strip() if driver else "Demo Driver",
            status=models.DepotTransferStatusEnum.PENDING,
            transfer_note=MARKER,
            created_by=employee.id,
        )
        db.add(transfer)
        db.flush()
        db.add(
            models.DepotTransferItem(
                transfer_id=transfer.id,
                product_id=detail.item_stock.product_id,
                quantity=qty,
                batch_number=detail.batch_no,
                expiry_date=detail.expiry_date,
                unit_price=detail.item_stock.product.base_price or Decimal("0"),
            )
        )
        db.flush()
        if phase in {"transit", "received"}:
            approve_depot_transfer(transfer.id, ApproveRequest(approved_by=employee.id), db)
            _move_ledger_transfer(
                db,
                detail.item_stock.product_id,
                source.id,
                dest.id,
                detail.batch_no,
                qty,
                detail.expiry_date,
                "approve",
            )
        if phase == "received":
            receive_depot_transfer(transfer.id, ReceiveRequest(received_by=employee.id), db)
            _move_ledger_transfer(
                db,
                detail.item_stock.product_id,
                source.id,
                dest.id,
                detail.batch_no,
                qty,
                detail.expiry_date,
                "receive",
            )
        created += 1
    return created


def seed_finance(db, employee, approver) -> int:
    order = db.query(models.Order).filter_by(memo_number="88001007").first()
    if not order:
        return 0
    created = 0
    deposits = [
        ("DEMO-DEP-PENDING", False, Decimal("15000"), Decimal("15000"), Decimal("0"), "bKash", None),
        ("DEMO-DEP-APPROVED", True, Decimal("40000"), Decimal("25000"), Decimal("15000"), "Nagad", "Approved deposit"),
        ("DEMO-DEP-REJECTED", False, Decimal("9000"), Decimal("0"), Decimal("9000"), "BRAC", "REJECTED: voucher mismatch"),
    ]
    method = {
        "bKash": models.DepositMethodEnum.BKASH,
        "Nagad": models.DepositMethodEnum.NAGAD,
        "BRAC": models.DepositMethodEnum.BRAC,
    }
    approved_deposit = None
    for number, approved, total, deposited, remaining, how, notes in deposits:
        if _exists(db, models.CollectionDeposit, deposit_number=number):
            continue
        row = models.CollectionDeposit(
            deposit_number=number,
            deposit_date=date.today(),
            collection_person_id=employee.id,
            deposit_method=method[how],
            deposit_amount=deposited,
            transaction_number=f"TXN-{number}",
            remaining_amount=remaining,
            total_collection_amount=total,
            notes=notes or MARKER,
            approved=approved,
            approved_by=approver.id if approved else None,
            approved_at=datetime.utcnow() if approved else None,
        )
        db.add(row)
        db.flush()
        if approved:
            approved_deposit = row
        created += 1
    if order and not db.query(models.CollectionTransaction).filter_by(order_id=order.id).first():
        db.add(
            models.CollectionTransaction(
                order_id=order.id,
                collection_person_id=employee.id,
                collection_date=date.today(),
                collection_type=models.CollectionTypeEnum.FULLY_COLLECTED,
                collected_amount=order.collected_amount or 0,
                pending_amount=order.pending_amount or 0,
                total_amount=(D(order.collected_amount) + D(order.pending_amount)),
                deposit_id=approved_deposit.id if approved_deposit else None,
                remarks=MARKER,
            )
        )
        created += 1
    return created


def seed_operations(db, depot, employee, vehicle, driver) -> None:
    loaded = db.query(models.Order).filter_by(memo_number="88001003").first()
    delivered = db.query(models.Order).filter_by(memo_number="88001004").first()
    if loaded and not _exists(db, models.OrderDelivery, delivery_number="DEMO-DLV-LOAD"):
        db.add(
            models.OrderDelivery(
                order_id=loaded.id,
                delivery_number="DEMO-DLV-LOAD",
                ship_to_party=loaded.customer_name,
                sold_to_party=loaded.customer_name,
                delivery_date=date.today(),
                vehicle_id=vehicle.id if vehicle else None,
                driver_id=driver.id if driver else None,
                driver_name=f"{driver.first_name} {driver.last_name or ''}".strip() if driver else None,
                status=models.DeliveryStatusEnum.LOADING,
                remarks=MARKER,
            )
        )
    if delivered and not _exists(db, models.OrderDelivery, delivery_number="DEMO-DLV-DONE"):
        db.add(
            models.OrderDelivery(
                order_id=delivered.id,
                delivery_number="DEMO-DLV-DONE",
                ship_to_party=delivered.customer_name,
                sold_to_party=delivered.customer_name,
                delivery_date=date.today(),
                vehicle_id=vehicle.id if vehicle else None,
                driver_id=driver.id if driver else None,
                status=models.DeliveryStatusEnum.DELIVERED,
                remarks=MARKER,
            )
        )
    if not _exists(db, models.PickingOrder, order_number="DEMO-PICK-001"):
        picking = models.PickingOrder(
            order_number="DEMO-PICK-001",
            loading_no="LD-88001003",
            loading_date=date.today(),
            area=depot.name,
            delivery_by=employee.first_name,
            vehicle_no=vehicle.registration_number if vehicle and hasattr(vehicle, "registration_number") else None,
            status=models.PickingOrderStatusEnum.DRAFT.value,
            remarks=MARKER,
        )
        db.add(picking)
        db.flush()
        db.add(
            models.PickingOrderDelivery(
                picking_order_id=picking.id,
                memo_no="88001003",
                value=Decimal("0"),
                status="Draft",
                pso=loaded.pso_name if loaded else employee.first_name,
            )
        )
    if not _exists(db, models.StockIssuance, issuance_number="DEMO-ISS-001"):
        customer = db.query(models.Customer).first()
        product = db.query(models.Product).first()
        issuance = models.StockIssuance(
            issuance_number="DEMO-ISS-001",
            issuance_date=date.today(),
            customer_id=customer.id if customer else None,
            depot_id=depot.id,
            total_quantity=Decimal("10"),
            status="Pending",
            created_by=employee.id,
        )
        db.add(issuance)
        db.flush()
        if product:
            db.add(
                models.StockIssuanceItem(
                    issuance_id=issuance.id,
                    product_id=product.id,
                    batch="PENDING",
                    quantity=Decimal("10"),
                )
            )
        if vehicle and not _exists(db, models.VehicleLoading, loading_number="DEMO-LD-001"):
            loading = models.VehicleLoading(
                loading_number="DEMO-LD-001",
                loading_date=date.today(),
                vehicle_id=vehicle.id,
                driver_id=driver.id if driver else None,
                total_quantity=Decimal("10"),
                status="Pending",
                created_by=employee.id,
            )
            db.add(loading)
            db.flush()
            db.add(models.VehicleLoadingItem(loading_id=loading.id, issuance_id=issuance.id))
    if delivered and not _exists(db, models.Invoice, invoice_number="DEMO-INV-88001004"):
        customer = db.query(models.Customer).filter(models.Customer.id == int(delivered.customer_id)).first()
        if customer:
            db.add(
                models.Invoice(
                    invoice_number="DEMO-INV-88001004",
                    invoice_date=date.today(),
                    customer_id=customer.id,
                    depot_id=depot.id,
                    amount=delivered.collected_amount or 0,
                    mode="COD",
                    status="Pending",
                    due_date=date.today() + timedelta(days=7),
                )
            )
    if not _exists(db, ReconciliationRun, reconciliation_no="DEMO-REC-001"):
        run = ReconciliationRun(
            reconciliation_no="DEMO-REC-001",
            depot_id=depot.id,
            loading_number="LD-88001007",
            delivery_man_id=employee.id,
            total_delivered_value=delivered.collected_amount if delivered else 0,
            total_collection_value=delivered.collected_amount if delivered else 0,
            cash_in_hand=Decimal("0"),
            deposit_value=Decimal("25000"),
            variance_amount=Decimal("0"),
            status=ReconciliationStatusEnum.PENDING_APPROVAL,
            prepared_by=employee.id,
        )
        db.add(run)
        db.flush()
        if delivered:
            db.add(
                ReconciliationLine(
                    reconciliation_run_id=run.id,
                    order_id=delivered.id,
                    invoice_no=delivered.memo_number,
                    delivered_value=delivered.collected_amount or 0,
                    collected_value=delivered.collected_amount or 0,
                    collection_status=delivered.collection_status,
                    delivery_status=delivered.delivery_status,
                )
            )
    if not db.query(AuditLog).filter(AuditLog.reason == MARKER).first():
        AuditService.log_action(
            db,
            entity_type="demo_seed",
            entity_id=MARKER,
            action="DEMO_SEED",
            user=employee,
            new_value={"marker": MARKER},
            reason=MARKER,
        )
    if not _exists(db, Promotion, promotion_code="DEMO-PROMO-10"):
        promo = Promotion(
            promotion_code="DEMO-PROMO-10",
            promotion_name="Demo 10 percent trade scheme",
            promotion_type="DISCOUNT",
            start_date=date.today() - timedelta(days=10),
            end_date=date.today() + timedelta(days=60),
            status=PromotionStatusEnum.ACTIVE,
            approval_status="APPROVED",
            created_by=employee.id,
            approved_by=employee.id,
            approved_at=datetime.utcnow(),
        )
        db.add(promo)
        db.flush()
        db.add(
            PromotionRule(
                promotion_id=promo.id,
                rule_type="PERCENT",
                condition_json={"min_qty": 5},
                benefit_json={"percent": 10},
                priority=1,
            )
        )
        product = db.query(models.Product).first()
        if product:
            db.add(PromotionProduct(promotion_id=promo.id, product_id=product.id))


def seed_consistent_workflows(db: Session) -> None:
    depots = db.query(models.Depot).order_by(models.Depot.id).all()
    products = db.query(models.Product).order_by(models.Product.id).all()
    employees = db.query(models.Employee).order_by(models.Employee.id).all()
    customers = db.query(models.Customer).order_by(models.Customer.id).all()
    routes = db.query(models.Route).order_by(models.Route.id).all()
    vehicles = db.query(models.Vehicle).order_by(models.Vehicle.id).all()
    drivers = db.query(models.Driver).order_by(models.Driver.id).all()
    if not depots or not products or not employees or not customers:
        raise RuntimeError("Master data missing. Run master, stock, vehicle, and route seeds first.")
    depot = depots[0]
    employee = employees[0]
    approver = employees[1] if len(employees) > 1 else employees[0]
    print(f"   opening ledger rows: {mirror_opening_ledger(db)}")
    print(f"   receipts: {seed_receipts(db, depot, products, employee)}")
    print(f"   adjustments: {seed_adjustments(db, depot, employee)}")
    print(f"   orders: {seed_orders(db, depot, customers, employees, routes, vehicles)}")
    db.commit()
    print(
        "   transfers: "
        f"{seed_transfers(db, depots, products, employee, vehicles[0] if vehicles else None, drivers[0] if drivers else None)}"
    )
    print(f"   finance rows: {seed_finance(db, employee, approver)}")
    seed_operations(
        db,
        depot,
        employee,
        vehicles[0] if vehicles else None,
        drivers[0] if drivers else None,
    )
    db.commit()
    print("   consistent workflows committed")
