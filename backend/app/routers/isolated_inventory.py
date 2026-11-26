"""Provisional isolated inventory reservation routes. Mounted only on the isolated app."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import schemas
from app.core.deps import require_role
from app.core.draft_modules import require_export_schema, require_sample_gift_schema
from app.database import get_db
from app.models import Employee
from app.services.draft_document_lock import abort_unlocked
from app.services.isolated_document_reservation import (
    list_reservations_for_document,
    release_reservation,
    reserve_for_document,
)

isolated_inventory_router = APIRouter()
WAREHOUSE_ACTOR = require_role("admin", "manager")


def _commit(db: Session):
    try:
        db.commit()
    except SQLAlchemyError:
        abort_unlocked(db)
        raise HTTPException(status_code=500, detail="The reservation could not be saved")


def _run_write(db: Session, fn):
    try:
        result = fn()
        _commit(db)
        return result
    except HTTPException:
        abort_unlocked(db)
        raise
    except SQLAlchemyError:
        abort_unlocked(db)
        raise HTTPException(status_code=500, detail="The reservation could not be saved")


@isolated_inventory_router.post(
    "/sample-gift-deliveries/{delivery_id}/reserve",
    response_model=schemas.IsolatedReservationResponse,
)
def reserve_sample_gift(
    delivery_id: int,
    payload: schemas.IsolatedReserveRequest,
    db: Session = Depends(require_sample_gift_schema),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return _run_write(
        db,
        lambda: reserve_for_document(
            db,
            "sample_gift",
            delivery_id,
            user,
            payload.idempotency_key,
            remarks=payload.remarks,
        ),
    )


@isolated_inventory_router.post(
    "/export-deliveries/{delivery_id}/reserve",
    response_model=schemas.IsolatedReservationResponse,
)
def reserve_export(
    delivery_id: int,
    payload: schemas.IsolatedReserveRequest,
    db: Session = Depends(require_export_schema),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return _run_write(
        db,
        lambda: reserve_for_document(
            db,
            "export",
            delivery_id,
            user,
            payload.idempotency_key,
            remarks=payload.remarks,
        ),
    )


@isolated_inventory_router.get(
    "/sample-gift-deliveries/{delivery_id}/reservations",
    response_model=List[schemas.IsolatedReservationResponse],
)
def list_sample_gift_reservations(
    delivery_id: int,
    db: Session = Depends(require_sample_gift_schema),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return list_reservations_for_document(db, "sample_gift", delivery_id, user)


@isolated_inventory_router.get(
    "/export-deliveries/{delivery_id}/reservations",
    response_model=List[schemas.IsolatedReservationResponse],
)
def list_export_reservations(
    delivery_id: int,
    db: Session = Depends(require_export_schema),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return list_reservations_for_document(db, "export", delivery_id, user)


@isolated_inventory_router.post(
    "/reservations/{reservation_id}/release",
    response_model=schemas.IsolatedReservationResponse,
)
def release_isolated_reservation(
    reservation_id: str,
    db: Session = Depends(get_db),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return _run_write(db, lambda: release_reservation(db, reservation_id, user))
