"""Batch delivery outcomes and return verification. Does not change inventory."""
from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Depot, Employee, ProductItemStock, ProductItemStockDetail
from app.models_platform import DeliveryAllocationOutcome, OrderBatchAllocation, ReturnVerification

CUSTODY_IN_DEPOT = "RESERVED_IN_DEPOT"
CUSTODY_DISPATCHED = "DISPATCHED"
CUSTODY_DELIVERED = "DELIVERED"
CUSTODY_RETURN_UNVERIFIED = "RETURN_UNVERIFIED"
CUSTODY_RETURN_VERIFIED = "RETURN_VERIFIED"

RETURN_REQUESTED = "REQUESTED"
RETURN_VERIFIED = "VERIFIED"


def _dec(value) -> Decimal:
    try:
        return Decimal(str(value if value is not None else 0))
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid quantity")


def _require_user(user: Employee) -> Employee:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    if not user.is_active or user.is_blocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not allowed to verify returns")
    return user


class DeliveryOutcomeService:
    """Record what happened to one reserved allocation. Stock posting stays in later steps."""

    @staticmethod
    def record_outcome(
        db: Session,
        *,
        allocation_id: int,
        delivered_quantity,
        undelivered_quantity,
        delivery_reference: str,
        custody_status: str,
        depot_id: int,
        product_id: int,
        batch_no: str,
        user: Employee,
    ) -> DeliveryAllocationOutcome:
        _require_user(user)
        reference = (delivery_reference or "").strip()
        if not reference:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid delivery reference")
        allocation = db.query(OrderBatchAllocation).filter(OrderBatchAllocation.id == allocation_id).first()
        if allocation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown allocation")
        detail = db.query(ProductItemStockDetail).filter(ProductItemStockDetail.id == allocation.stock_source_id).first()
        header = db.query(ProductItemStock).filter(ProductItemStock.id == detail.item_code).first() if detail else None
        depot = db.query(Depot).filter(Depot.id == header.depot_id).first() if header and header.depot_id else None
        if detail is None or (detail.batch_no or "").strip() != (allocation.batch_no or "").strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid batch")
        if header is None or depot is None or header.product_id != allocation.product_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid depot")
        if depot_id != depot.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid depot")
        if product_id != allocation.product_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown product")
        if (batch_no or "").strip() != (allocation.batch_no or "").strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid batch")

        delivered = _dec(delivered_quantity)
        undelivered = _dec(undelivered_quantity)
        reserved = _dec(allocation.allocated_qty)
        if delivered < 0 or undelivered < 0 or reserved <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid quantity")
        if delivered + undelivered != reserved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Delivered and undelivered quantities must equal the allocation",
            )
        _require_custody(custody_status, delivered, undelivered, reserved)

        existing = db.query(DeliveryAllocationOutcome).filter(
            DeliveryAllocationOutcome.allocation_id == allocation.id
        ).first()
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate delivery outcome")

        outcome = DeliveryAllocationOutcome(
            order_id=allocation.order_id,
            order_item_id=allocation.order_item_id,
            allocation_id=allocation.id,
            product_id=allocation.product_id,
            depot_id=depot.id,
            batch_no=(allocation.batch_no or "").strip(),
            reserved_quantity=reserved,
            delivered_quantity=delivered,
            undelivered_quantity=undelivered,
            delivery_reference=reference,
            custody_status=custody_status,
            created_by=user.id,
        )
        db.add(outcome)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate delivery outcome")
        return outcome

    @staticmethod
    def request_return(
        db: Session,
        *,
        outcome_id: int,
        expected_return_quantity,
        received_quantity,
        user: Employee,
        remarks: str | None = None,
    ) -> ReturnVerification:
        """Record a return request. This does not verify it and does not change stock."""
        _require_user(user)
        outcome = db.query(DeliveryAllocationOutcome).filter(DeliveryAllocationOutcome.id == outcome_id).first()
        if outcome is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown delivery outcome")
        if outcome.custody_status == CUSTODY_IN_DEPOT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stock never left the depot. Do not create a physical return",
            )
        if outcome.custody_status not in {CUSTODY_DISPATCHED, CUSTODY_RETURN_UNVERIFIED}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid custody status")

        expected = _dec(expected_return_quantity)
        received = _dec(received_quantity)
        if expected <= 0 or received <= 0 or received > expected:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid quantity")
        open_request = db.query(ReturnVerification).filter(
            ReturnVerification.allocation_id == outcome.allocation_id,
            ReturnVerification.status == RETURN_REQUESTED,
        ).first()
        if open_request is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate return verification")
        if received > _outstanding(db, outcome):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Return quantity exceeds the outstanding quantity")

        verification = ReturnVerification(
            verification_number=_next_verification_number(db, outcome.allocation_id),
            outcome_id=outcome.id,
            order_id=outcome.order_id,
            allocation_id=outcome.allocation_id,
            product_id=outcome.product_id,
            depot_id=outcome.depot_id,
            batch_no=outcome.batch_no,
            expected_return_quantity=expected,
            received_quantity=received,
            status=RETURN_REQUESTED,
            remarks=(remarks or "").strip() or None,
            created_by=user.id,
        )
        outcome.custody_status = CUSTODY_RETURN_UNVERIFIED
        db.add(verification)
        db.flush()
        return verification

    @staticmethod
    def verify_return(db: Session, *, verification_id: int, user: Employee) -> ReturnVerification:
        """Mark a request verified. Inventory is intentionally left unchanged."""
        _require_user(user)
        verification = db.query(ReturnVerification).filter(ReturnVerification.id == verification_id).first()
        if verification is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown return verification")
        if verification.status == RETURN_VERIFIED:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate return verification")
        if verification.status != RETURN_REQUESTED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid custody status")
        verification.status = RETURN_VERIFIED
        verification.verified_by = user.id
        verification.verified_at = datetime.utcnow()
        db.flush()
        outcome = db.query(DeliveryAllocationOutcome).filter(DeliveryAllocationOutcome.id == verification.outcome_id).one()
        verified_total = _verified_total(db, outcome.allocation_id)
        if verified_total == _dec(outcome.undelivered_quantity) and _dec(outcome.delivered_quantity) == 0:
            outcome.custody_status = CUSTODY_RETURN_VERIFIED
        else:
            outcome.custody_status = CUSTODY_RETURN_UNVERIFIED
        db.flush()
        return verification


def _require_custody(custody_status: str, delivered: Decimal, undelivered: Decimal, reserved: Decimal) -> None:
    if delivered == reserved and undelivered == 0:
        if custody_status != CUSTODY_DELIVERED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid custody status")
        return
    if delivered == 0 and undelivered == reserved:
        if custody_status not in {CUSTODY_IN_DEPOT, CUSTODY_DISPATCHED}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid custody status")
        return
    if delivered > 0 and undelivered > 0 and custody_status == CUSTODY_DISPATCHED:
        return
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid custody status")


def _outstanding(db: Session, outcome: DeliveryAllocationOutcome) -> Decimal:
    used = (
        db.query(ReturnVerification)
        .filter(
            ReturnVerification.allocation_id == outcome.allocation_id,
            ReturnVerification.status.in_([RETURN_REQUESTED, RETURN_VERIFIED]),
        )
        .all()
    )
    consumed = sum((_dec(row.received_quantity) for row in used), Decimal("0"))
    return _dec(outcome.undelivered_quantity) - consumed


def _verified_total(db: Session, allocation_id: int) -> Decimal:
    rows = db.query(ReturnVerification).filter(
        ReturnVerification.allocation_id == allocation_id,
        ReturnVerification.status == RETURN_VERIFIED,
    ).all()
    return sum((_dec(row.received_quantity) for row in rows), Decimal("0"))


def _next_verification_number(db: Session, allocation_id: int) -> str:
    count = db.query(ReturnVerification).filter(ReturnVerification.allocation_id == allocation_id).count()
    return f"RV-{allocation_id}-{count + 1:04d}"
