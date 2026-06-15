"""Promotion engine: apply and simulate schemes during validation."""
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models import Customer, Order, OrderItem, Product
from app.models_platform import (
    Promotion,
    PromotionCustomer,
    PromotionDepot,
    PromotionProduct,
    PromotionRule,
    PromotionStatusEnum,
)


class PromotionService:
    @staticmethod
    def _active_promotions(db: Session, order: Order, customer: Optional[Customer]) -> List[Promotion]:
        today = date.today()
        q = db.query(Promotion).filter(
            Promotion.status == PromotionStatusEnum.ACTIVE,
            Promotion.start_date <= today,
            Promotion.end_date >= today,
        )
        promos = q.all()
        result = []
        for p in promos:
            if customer:
                cust_map = db.query(PromotionCustomer).filter(
                    PromotionCustomer.promotion_id == p.id,
                    PromotionCustomer.customer_id == customer.id,
                ).first()
                if db.query(PromotionCustomer).filter(PromotionCustomer.promotion_id == p.id).count() > 0 and not cust_map:
                    continue
            if order.depot_code:
                from app.models import Depot
                depot = db.query(Depot).filter(Depot.code == order.depot_code).first()
                if depot:
                    depot_map = db.query(PromotionDepot).filter(
                        PromotionDepot.promotion_id == p.id,
                        PromotionDepot.depot_id == depot.id,
                    ).first()
                    if db.query(PromotionDepot).filter(PromotionDepot.promotion_id == p.id).count() > 0 and not depot_map:
                        continue
            result.append(p)
        return result

    @staticmethod
    def simulate_for_order(
        db: Session,
        order: Order,
        items: List[OrderItem],
        customer: Optional[Customer],
    ) -> List[Dict[str, Any]]:
        messages: List[Dict[str, Any]] = []
        promos = PromotionService._active_promotions(db, order, customer)
        if not promos:
            return messages

        for promo in promos:
            rules = db.query(PromotionRule).filter(PromotionRule.promotion_id == promo.id).order_by(PromotionRule.priority.desc()).all()
            for rule in rules:
                benefit = rule.benefit_json or {}
                for item in items:
                    product = db.query(Product).filter(Product.code == item.product_code).first()
                    if not product:
                        continue
                    prod_map = db.query(PromotionProduct).filter(
                        PromotionProduct.promotion_id == promo.id,
                        PromotionProduct.product_id == product.id,
                    ).first()
                    if db.query(PromotionProduct).filter(PromotionProduct.promotion_id == promo.id).count() > 0 and not prod_map:
                        continue

                    if rule.rule_type == "BONUS" and benefit.get("free_qty"):
                        threshold = Decimal(str(benefit.get("threshold", product.free_goods_threshold or 0)))
                        qty = item.quantity or Decimal("0")
                        if threshold > 0 and qty >= threshold:
                            messages.append({
                                "severity": "INFO",
                                "message": f"Promotion {promo.promotion_code}: bonus {benefit.get('free_qty')} on {product.name}",
                            })
                    elif rule.rule_type == "DISCOUNT" and benefit.get("discount_percent"):
                        messages.append({
                            "severity": "INFO",
                            "message": f"Promotion {promo.promotion_code}: {benefit.get('discount_percent')}% discount on {product.name}",
                        })
        return messages

    @staticmethod
    def apply_product_free_goods(product: Product, quantity: Decimal) -> Decimal:
        threshold = Decimal(str(product.free_goods_threshold or 0))
        free_qty = Decimal(str(product.free_goods_quantity or 0))
        if threshold > 0 and free_qty > 0 and quantity >= threshold:
            multiplier = (quantity / threshold).to_integral_value()
            return multiplier * free_qty
        return Decimal("0")
