"""Provisional Submit/Approve/Reject routes. Mounted only on the isolated app."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import schemas
from app.core.deps import require_auth
from app.core.draft_modules import require_export_schema, require_sample_gift_schema
from app.models import Employee
from app.routers import export_deliveries as export_mod
from app.routers import sample_gift_deliveries as sg_mod
from app.services.draft_document_lock import abort_unlocked
from app.services.draft_status_transition import DraftAction, DraftModule
from app.services.draft_workflow_execution import execute_draft_workflow

sample_gift_workflow_router = APIRouter()
export_workflow_router = APIRouter()


def _action_payload(payload: Optional[schemas.DraftWorkflowActionRequest]) -> dict:
    body = payload or schemas.DraftWorkflowActionRequest()
    return {"reason": body.reason, "remarks": body.remarks}


def _run(
    db: Session,
    module: DraftModule,
    document_id: int,
    action: DraftAction,
    user: Employee,
    payload: Optional[schemas.DraftWorkflowActionRequest],
):
    try:
        result = execute_draft_workflow(
            db,
            module,
            document_id,
            action,
            user,
            **_action_payload(payload),
        )
        db.commit()
        return result
    except HTTPException:
        abort_unlocked(db)
        raise
    except SQLAlchemyError:
        abort_unlocked(db)
        raise HTTPException(status_code=500, detail="The document could not be saved")
    except Exception:
        abort_unlocked(db)
        raise


@sample_gift_workflow_router.post(
    "/{delivery_id}/submit",
    response_model=schemas.SampleGiftDeliveryDetailResponse,
)
def submit_sample_gift(
    delivery_id: int,
    payload: Optional[schemas.DraftWorkflowActionRequest] = None,
    db: Session = Depends(require_sample_gift_schema),
    user: Employee = Depends(require_auth),
):
    _run(db, "sample_gift", delivery_id, "submit", user, payload)
    return schemas.SampleGiftDeliveryDetailResponse(
        **sg_mod._serialize(sg_mod._load(db, delivery_id, user), include_items=True)
    )


@sample_gift_workflow_router.post(
    "/{delivery_id}/approve",
    response_model=schemas.SampleGiftDeliveryDetailResponse,
)
def approve_sample_gift(
    delivery_id: int,
    payload: Optional[schemas.DraftWorkflowActionRequest] = None,
    db: Session = Depends(require_sample_gift_schema),
    user: Employee = Depends(require_auth),
):
    _run(db, "sample_gift", delivery_id, "approve", user, payload)
    return schemas.SampleGiftDeliveryDetailResponse(
        **sg_mod._serialize(sg_mod._load(db, delivery_id, user), include_items=True)
    )


@sample_gift_workflow_router.post(
    "/{delivery_id}/reject",
    response_model=schemas.SampleGiftDeliveryDetailResponse,
)
def reject_sample_gift(
    delivery_id: int,
    payload: Optional[schemas.DraftWorkflowActionRequest] = None,
    db: Session = Depends(require_sample_gift_schema),
    user: Employee = Depends(require_auth),
):
    _run(db, "sample_gift", delivery_id, "reject", user, payload)
    return schemas.SampleGiftDeliveryDetailResponse(
        **sg_mod._serialize(sg_mod._load(db, delivery_id, user), include_items=True)
    )


@export_workflow_router.post(
    "/{delivery_id}/submit",
    response_model=schemas.ExportDeliveryDetailResponse,
)
def submit_export(
    delivery_id: int,
    payload: Optional[schemas.DraftWorkflowActionRequest] = None,
    db: Session = Depends(require_export_schema),
    user: Employee = Depends(require_auth),
):
    _run(db, "export", delivery_id, "submit", user, payload)
    return schemas.ExportDeliveryDetailResponse(
        **export_mod._serialize(export_mod._load(db, delivery_id, user), include_items=True)
    )


@export_workflow_router.post(
    "/{delivery_id}/approve",
    response_model=schemas.ExportDeliveryDetailResponse,
)
def approve_export(
    delivery_id: int,
    payload: Optional[schemas.DraftWorkflowActionRequest] = None,
    db: Session = Depends(require_export_schema),
    user: Employee = Depends(require_auth),
):
    _run(db, "export", delivery_id, "approve", user, payload)
    return schemas.ExportDeliveryDetailResponse(
        **export_mod._serialize(export_mod._load(db, delivery_id, user), include_items=True)
    )


@export_workflow_router.post(
    "/{delivery_id}/reject",
    response_model=schemas.ExportDeliveryDetailResponse,
)
def reject_export(
    delivery_id: int,
    payload: Optional[schemas.DraftWorkflowActionRequest] = None,
    db: Session = Depends(require_export_schema),
    user: Employee = Depends(require_auth),
):
    _run(db, "export", delivery_id, "reject", user, payload)
    return schemas.ExportDeliveryDetailResponse(
        **export_mod._serialize(export_mod._load(db, delivery_id, user), include_items=True)
    )
