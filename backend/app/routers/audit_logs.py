"""Audit log query API — immutable logs, read-only."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import require_auth, require_permission
from app.database import get_db
from app.models import Employee
from app.models_platform import AuditLog

router = APIRouter()


@router.get("")
def list_audit_logs(
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("audit.read")),
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    action: Optional[str] = None,
    depot_id: Optional[int] = None,
    user_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    q = db.query(AuditLog)
    if (user.role or "").lower() != "admin" and user.depot_id:
        q = q.filter(AuditLog.depot_id == user.depot_id)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if depot_id:
        q = q.filter(AuditLog.depot_id == depot_id)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if date_from:
        q = q.filter(AuditLog.created_at >= date_from)
    if date_to:
        q = q.filter(AuditLog.created_at <= date_to)
    total = q.count()
    rows = q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": rows}


@router.get("/{entity_type}/{entity_id}")
def audit_for_entity(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("audit.read")),
):
    q = db.query(AuditLog).filter(
        AuditLog.entity_type == entity_type,
        AuditLog.entity_id == entity_id,
    )
    if (user.role or "").lower() != "admin" and user.depot_id:
        q = q.filter(AuditLog.depot_id == user.depot_id)
    return q.order_by(AuditLog.created_at.desc()).limit(200).all()
