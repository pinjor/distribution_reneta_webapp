"""Stock reservation against product_item_stock_details during order validation."""
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import ProductItemStockDetail
from app.models_platform import OrderBatchAllocation
from app.services.audit_service import AuditService


class StockReservationService:
    @staticmethod
    def release_for_order(db: Session, order_id: int, user=None) -> int:
        """Release RESERVED allocations for an order. Returns count released."""
        allocations = (
            db.query(OrderBatchAllocation)
            .filter(
                OrderBatchAllocation.order_id == order_id,
                OrderBatchAllocation.allocation_status == "RESERVED",
            )
            .all()
        )
        count = 0
        for alloc in allocations:
            if StockReservationService._release_one(db, alloc):
                count += 1
        if count and user:
            AuditService.log_action(
                db,
                entity_type="order",
                entity_id=str(order_id),
                action="STOCK_RELEASE",
                user=user,
                new_value={"released_allocations": count},
            )
        return count

    @staticmethod
    def _release_one(db: Session, alloc: OrderBatchAllocation) -> bool:
        if alloc.allocation_status != "RESERVED":
            return False
        detail = db.query(ProductItemStockDetail).filter(
            ProductItemStockDetail.id == alloc.stock_source_id
        ).first()
        if detail:
            qty = Decimal(str(alloc.allocated_qty or 0))
            detail.available_quantity = Decimal(str(detail.available_quantity or 0)) + qty
            detail.reserved_quantity = max(
                Decimal("0"),
                Decimal(str(detail.reserved_quantity or 0)) - qty,
            )
        alloc.allocation_status = "RELEASED"
        return True

    @staticmethod
    def reserve_allocations(
        db: Session,
        order_id: int,
        allocations: List[OrderBatchAllocation],
        user=None,
    ) -> None:
        """Move stock from available to reserved for validated order batches."""
        for alloc in allocations:
            qty = Decimal(str(alloc.allocated_qty or 0))
            if qty <= 0:
                continue
            detail = (
                db.query(ProductItemStockDetail)
                .filter(ProductItemStockDetail.id == alloc.stock_source_id)
                .with_for_update()
                .first()
            )
            if not detail:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock detail {alloc.stock_source_id} not found for reservation",
                )
            available = Decimal(str(detail.available_quantity or 0))
            if available < qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Insufficient sellable stock for batch {alloc.batch_no}. "
                        f"Available {available}, required {qty}"
                    ),
                )
            detail.available_quantity = available - qty
            detail.reserved_quantity = Decimal(str(detail.reserved_quantity or 0)) + qty
            alloc.allocation_status = "RESERVED"

        if user:
            AuditService.log_action(
                db,
                entity_type="order",
                entity_id=str(order_id),
                action="STOCK_RESERVE",
                user=user,
                new_value={
                    "batches": [
                        {"batch_no": a.batch_no, "qty": float(a.allocated_qty or 0)}
                        for a in allocations
                    ]
                },
            )

    @staticmethod
    def commit_for_order(db: Session, order_id: int, user=None) -> int:
        """Mark reservations as ISSUED when order is loaded/dispatched."""
        allocations = (
            db.query(OrderBatchAllocation)
            .filter(
                OrderBatchAllocation.order_id == order_id,
                OrderBatchAllocation.allocation_status == "RESERVED",
            )
            .all()
        )
        for alloc in allocations:
            detail = db.query(ProductItemStockDetail).filter(
                ProductItemStockDetail.id == alloc.stock_source_id
            ).first()
            if detail:
                qty = Decimal(str(alloc.allocated_qty or 0))
                detail.reserved_quantity = max(
                    Decimal("0"),
                    Decimal(str(detail.reserved_quantity or 0)) - qty,
                )
            alloc.allocation_status = "ISSUED"
        if allocations and user:
            AuditService.log_action(
                db,
                entity_type="order",
                entity_id=str(order_id),
                action="STOCK_ISSUE",
                user=user,
                new_value={"issued_count": len(allocations)},
            )
        return len(allocations)
