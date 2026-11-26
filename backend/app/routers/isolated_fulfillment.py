"""Provisional isolated fulfillment routes. Mounted only on the isolated app."""
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
from app.services.isolated_document_fulfillment import (
    confirm_delivery_fulfillment,
    confirm_picking,
    dispatch_fulfillment,
    fail_delivery_fulfillment,
    fulfillment_history,
    get_fulfillment_for_document,
    issue_fulfillment,
    start_picking_for_document,
)

isolated_fulfillment_router = APIRouter()
WAREHOUSE_ACTOR = require_role("admin", "manager", "warehouse")


def _commit(db: Session):
    try:
        db.commit()
    except SQLAlchemyError:
        abort_unlocked(db)
        raise HTTPException(status_code=500, detail="The fulfillment could not be saved")


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
        raise HTTPException(status_code=500, detail="The fulfillment could not be saved")


@isolated_fulfillment_router.post(
    "/sample-gift-deliveries/{delivery_id}/picking/start",
    response_model=schemas.IsolatedFulfillmentResponse,
)
def start_sample_gift_pick(
    delivery_id: int,
    payload: schemas.IsolatedFulfillmentActionRequest,
    db: Session = Depends(require_sample_gift_schema),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return _run_write(
        db,
        lambda: start_picking_for_document(db, "sample_gift", delivery_id, user, payload.idempotency_key),
    )


@isolated_fulfillment_router.post(
    "/export-deliveries/{delivery_id}/picking/start",
    response_model=schemas.IsolatedFulfillmentResponse,
)
def start_export_pick(
    delivery_id: int,
    payload: schemas.IsolatedFulfillmentActionRequest,
    db: Session = Depends(require_export_schema),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return _run_write(
        db,
        lambda: start_picking_for_document(db, "export", delivery_id, user, payload.idempotency_key),
    )


@isolated_fulfillment_router.get(
    "/sample-gift-deliveries/{delivery_id}/fulfillment",
    response_model=schemas.IsolatedFulfillmentResponse,
)
def get_sample_gift_fulfillment(
    delivery_id: int,
    db: Session = Depends(require_sample_gift_schema),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return get_fulfillment_for_document(db, "sample_gift", delivery_id, user)


@isolated_fulfillment_router.get(
    "/export-deliveries/{delivery_id}/fulfillment",
    response_model=schemas.IsolatedFulfillmentResponse,
)
def get_export_fulfillment(
    delivery_id: int,
    db: Session = Depends(require_export_schema),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return get_fulfillment_for_document(db, "export", delivery_id, user)


@isolated_fulfillment_router.post(
    "/{fulfillment_id}/picking/confirm",
    response_model=schemas.IsolatedFulfillmentResponse,
)
def confirm_pick(
    fulfillment_id: str,
    payload: schemas.IsolatedConfirmPickRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    slices = [
        item.model_dump() if hasattr(item, "model_dump") else item.dict()
        for item in payload.slices
    ]
    return _run_write(
        db,
        lambda: confirm_picking(db, fulfillment_id, user, payload.idempotency_key, slices),
    )


@isolated_fulfillment_router.post(
    "/{fulfillment_id}/issue",
    response_model=schemas.IsolatedFulfillmentResponse,
)
def issue(
    fulfillment_id: str,
    payload: schemas.IsolatedFulfillmentActionRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return _run_write(
        db,
        lambda: issue_fulfillment(db, fulfillment_id, user, payload.idempotency_key),
    )


@isolated_fulfillment_router.post(
    "/{fulfillment_id}/dispatch",
    response_model=schemas.IsolatedFulfillmentResponse,
)
def dispatch(
    fulfillment_id: str,
    payload: schemas.IsolatedDispatchRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return _run_write(
        db,
        lambda: dispatch_fulfillment(
            db,
            fulfillment_id,
            user,
            payload.idempotency_key,
            transport_ref=payload.transport_ref,
            remarks=payload.remarks,
        ),
    )


@isolated_fulfillment_router.post(
    "/{fulfillment_id}/delivery/confirm",
    response_model=schemas.IsolatedFulfillmentResponse,
)
def confirm_delivery(
    fulfillment_id: str,
    payload: schemas.IsolatedDeliveryConfirmRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return _run_write(
        db,
        lambda: confirm_delivery_fulfillment(
            db,
            fulfillment_id,
            user,
            payload.idempotency_key,
            receiver_name=payload.receiver_name,
            delivered_quantity=payload.delivered_quantity,
            confirmation_date=payload.confirmation_date,
            pod_ref=payload.pod_ref,
            remarks=payload.remarks,
        ),
    )


@isolated_fulfillment_router.post(
    "/{fulfillment_id}/delivery/fail",
    response_model=schemas.IsolatedFulfillmentResponse,
)
def fail_delivery(
    fulfillment_id: str,
    payload: schemas.IsolatedDeliveryFailRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return _run_write(
        db,
        lambda: fail_delivery_fulfillment(
            db,
            fulfillment_id,
            user,
            payload.idempotency_key,
            payload.reason,
            remarks=payload.remarks,
        ),
    )


@isolated_fulfillment_router.get(
    "/{fulfillment_id}/history",
    response_model=List[schemas.IsolatedFulfillmentAuditResponse],
)
def history(
    fulfillment_id: str,
    db: Session = Depends(get_db),
    user: Employee = Depends(WAREHOUSE_ACTOR),
):
    return fulfillment_history(db, fulfillment_id, user)
