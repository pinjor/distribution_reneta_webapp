"""Sync queue API for DEX mobile and integrations."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.database import get_db
from app.models import Employee
from app.models_platform import SyncEvent, SyncQueue
from app.services.sync_service import SyncService

router = APIRouter()


class SyncPushRequest(BaseModel):
    idempotency_key: str
    source_system: str
    entity_type: str
    entity_id: Optional[str] = None
    event_type: str
    payload: Dict[str, Any]
    client_version: Optional[str] = None


@router.post("/push")
def sync_push(
    payload: SyncPushRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("sync.write")),
):
    return SyncService.push_event(
        db, user,
        idempotency_key=payload.idempotency_key,
        source_system=payload.source_system,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        event_type=payload.event_type,
        payload=payload.payload,
        client_version=payload.client_version,
    )


@router.get("/pull")
def sync_pull(
    source_system: str,
    since: Optional[datetime] = None,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("sync.read")),
):
    events = SyncService.pull_events(db, user, source_system, since=since)
    return {"items": events}


@router.get("/status")
def sync_status(
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("sync.read")),
):
    pending = db.query(SyncQueue).filter(SyncQueue.status == "PENDING").count()
    failed = db.query(SyncQueue).filter(SyncQueue.status == "FAILED").count()
    return {"pending": pending, "failed": failed}


@router.get("/failures")
def sync_failures(
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("sync.read")),
):
    return db.query(SyncQueue).filter(SyncQueue.status == "FAILED").order_by(SyncQueue.created_at.desc()).limit(200).all()


@router.post("/failures/{queue_id}/retry")
def retry_sync_failure(
    queue_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("sync.write")),
):
    return SyncService.retry_failed(db, queue_id, user)
