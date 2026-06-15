"""Finance reconciliation and day-end closing API."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.database import get_db
from app.models import Employee
from app.models_platform import DayEndClosing, ReconciliationRun, ReconciliationStatusEnum
from app.services.audit_service import AuditService
from app.services.reconciliation_service import ReconciliationService

router = APIRouter()


class DayEndCreate(BaseModel):
    depot_id: int
    closing_date: date


class RejectRequest(BaseModel):
    reason: str


@router.post("/create-from-assignment/{loading_number}")
def create_from_assignment(
    loading_number: str,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("reconciliation.write")),
):
    return ReconciliationService.create_from_assignment(db, loading_number, user)


@router.get("/pending")
def pending_reconciliations(
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("reconciliation.read")),
):
    q = db.query(ReconciliationRun).filter(
        ReconciliationRun.status.in_([
            ReconciliationStatusEnum.DRAFT,
            ReconciliationStatusEnum.PENDING_VERIFICATION,
            ReconciliationStatusEnum.PENDING_APPROVAL,
        ])
    )
    if (user.role or "").lower() != "admin" and user.depot_id:
        q = q.filter(ReconciliationRun.depot_id == user.depot_id)
    return q.order_by(ReconciliationRun.created_at.desc()).all()


@router.get("/{reconciliation_id}")
def get_reconciliation(
    reconciliation_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("reconciliation.read")),
):
    run = db.query(ReconciliationRun).filter(ReconciliationRun.id == reconciliation_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "run": run,
        "lines": run.lines,
        "variances": run.variances,
    }


@router.post("/{reconciliation_id}/verify")
def verify_reconciliation(
    reconciliation_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("reconciliation.write")),
):
    run = db.query(ReconciliationRun).filter(ReconciliationRun.id == reconciliation_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Not found")
    run.status = ReconciliationStatusEnum.PENDING_APPROVAL
    run.checked_by = user.id
    db.commit()
    return run


@router.post("/{reconciliation_id}/approve")
def approve_reconciliation(
    reconciliation_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("reconciliation.approve")),
):
    run = db.query(ReconciliationRun).filter(ReconciliationRun.id == reconciliation_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Not found")
    return ReconciliationService.approve(db, run, user)


@router.post("/{reconciliation_id}/reject")
def reject_reconciliation(
    reconciliation_id: int,
    payload: RejectRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("reconciliation.approve")),
):
    run = db.query(ReconciliationRun).filter(ReconciliationRun.id == reconciliation_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Not found")
    run.status = ReconciliationStatusEnum.REJECTED
    AuditService.log_rejection(db, "reconciliation", str(reconciliation_id), user, payload.reason)
    db.commit()
    return run


@router.post("/day-end-closing/create")
def create_day_end(
    payload: DayEndCreate,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("reconciliation.write")),
):
    return ReconciliationService.create_day_end(db, payload.depot_id, payload.closing_date, user)


@router.post("/day-end-closing/{closing_id}/approve")
def approve_day_end(
    closing_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("reconciliation.approve")),
):
    closing = db.query(DayEndClosing).filter(DayEndClosing.id == closing_id).first()
    if not closing:
        raise HTTPException(status_code=404, detail="Not found")
    closing.status = "APPROVED"
    closing.approved_by = user.id
    from datetime import datetime
    closing.approved_at = datetime.utcnow()
    AuditService.log_approval(db, "day_end_closing", str(closing_id), user)
    db.commit()
    return closing


@router.get("/day-end-closing/status")
def day_end_status(
    depot_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("reconciliation.read")),
):
    q = db.query(DayEndClosing)
    if depot_id:
        q = q.filter(DayEndClosing.depot_id == depot_id)
    elif user.depot_id and (user.role or "").lower() != "admin":
        q = q.filter(DayEndClosing.depot_id == user.depot_id)
    return q.order_by(DayEndClosing.closing_date.desc()).limit(50).all()
