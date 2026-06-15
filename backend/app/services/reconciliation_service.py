"""Finance reconciliation and day-end closing."""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Employee, Order
from app.models_platform import (
    DayEndClosing,
    ReconciliationLine,
    ReconciliationRun,
    ReconciliationStatusEnum,
    ReconciliationVariance,
)
from app.services.audit_service import AuditService


class ReconciliationService:
    TOLERANCE = Decimal("0.01")

    @staticmethod
    def _generate_recon_no(db: Session) -> str:
        today = datetime.utcnow().strftime("%Y%m%d")
        prefix = f"REC-{today}-"
        last = db.query(ReconciliationRun).filter(
            ReconciliationRun.reconciliation_no.like(f"{prefix}%")
        ).order_by(ReconciliationRun.reconciliation_no.desc()).first()
        seq = 1
        if last:
            try:
                seq = int(last.reconciliation_no.split("-")[-1]) + 1
            except ValueError:
                seq = 1
        return f"{prefix}{seq:04d}"

    @staticmethod
    def _order_delivered_value(order: Order) -> Decimal:
        total = Decimal("0")
        for item in order.items:
            unit_price = item.unit_price or item.trade_price or Decimal("0")
            discount = item.discount_percent or Decimal("0")
            price = unit_price * (1 - discount / 100)
            qty = item.total_quantity or (item.quantity + (item.free_goods or 0))
            total += price * qty
        return total

    @staticmethod
    def create_from_assignment(
        db: Session,
        loading_number: str,
        user: Employee,
        depot_id: Optional[int] = None,
    ) -> ReconciliationRun:
        orders = db.query(Order).filter(Order.loading_number == loading_number).all()
        if not orders:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No orders for loading number")

        total_delivered = Decimal("0")
        total_collected = Decimal("0")
        total_return = Decimal("0")

        run = ReconciliationRun(
            reconciliation_no=ReconciliationService._generate_recon_no(db),
            depot_id=depot_id or user.depot_id,
            loading_number=loading_number,
            delivery_man_id=orders[0].assigned_to,
            vehicle_id=orders[0].assigned_vehicle,
            status=ReconciliationStatusEnum.DRAFT,
            prepared_by=user.id,
        )
        db.add(run)
        db.flush()

        for order in orders:
            delivered = ReconciliationService._order_delivered_value(order)
            collected = Decimal(str(order.collected_amount or 0))
            pending = Decimal(str(order.pending_amount or 0))
            returned = pending if order.collection_status in ("Postponed", "Partially Collected") else Decimal("0")

            total_delivered += delivered
            total_collected += collected
            total_return += returned

            line = ReconciliationLine(
                reconciliation_run_id=run.id,
                order_id=order.id,
                invoice_no=order.memo_number,
                delivered_value=delivered,
                collected_value=collected,
                return_value=returned,
                variance_amount=delivered - collected - returned,
                collection_status=order.collection_status,
                delivery_status=order.delivery_status,
            )
            db.add(line)

        run.total_delivered_value = total_delivered
        run.total_collection_value = total_collected
        run.total_return_value = total_return
        variance = total_delivered - total_collected - total_return
        run.variance_amount = variance
        run.cash_in_hand = total_collected

        if abs(variance) > ReconciliationService.TOLERANCE:
            db.add(ReconciliationVariance(
                reconciliation_run_id=run.id,
                variance_type="BALANCE_MISMATCH",
                variance_amount=variance,
                reason="Delivered - Collected - Returns != 0",
                resolution_status="OPEN",
            ))
            run.status = ReconciliationStatusEnum.PENDING_VERIFICATION

        AuditService.log_create(db, "reconciliation", str(run.id), {
            "loading_number": loading_number,
            "variance": float(variance),
        }, user)
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def approve(db: Session, run: ReconciliationRun, user: Employee) -> ReconciliationRun:
        if abs(Decimal(str(run.variance_amount or 0))) > ReconciliationService.TOLERANCE:
            open_var = db.query(ReconciliationVariance).filter(
                ReconciliationVariance.reconciliation_run_id == run.id,
                ReconciliationVariance.resolution_status == "OPEN",
            ).count()
            if open_var > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot approve reconciliation with unresolved variance",
                )
        run.status = ReconciliationStatusEnum.APPROVED
        run.approved_by = user.id
        run.approved_at = datetime.utcnow()
        AuditService.log_approval(db, "reconciliation", str(run.id), user)
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def create_day_end(db: Session, depot_id: int, closing_date: date, user: Employee) -> DayEndClosing:
        pending = db.query(ReconciliationRun).filter(
            ReconciliationRun.depot_id == depot_id,
            ReconciliationRun.status.notin_([
                ReconciliationStatusEnum.APPROVED,
                ReconciliationStatusEnum.CLOSED,
            ]),
        ).count()
        if pending > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{pending} reconciliation(s) still pending for depot",
            )

        closing = DayEndClosing(
            depot_id=depot_id,
            closing_date=closing_date,
            status="DRAFT",
            closed_by=user.id,
        )
        db.add(closing)
        AuditService.log_create(db, "day_end_closing", str(closing.id), {
            "depot_id": depot_id, "date": str(closing_date),
        }, user)
        db.commit()
        db.refresh(closing)
        return closing
