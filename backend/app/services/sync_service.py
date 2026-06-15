"""Backend sync queue for DEX mobile and integrations."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Employee
from app.models_platform import SyncCheckpoint, SyncConflict, SyncEvent, SyncEventStatusEnum, SyncQueue
from app.services.audit_service import AuditService


class SyncService:
    @staticmethod
    def push_event(
        db: Session,
        user: Employee,
        *,
        idempotency_key: str,
        source_system: str,
        entity_type: str,
        entity_id: Optional[str],
        event_type: str,
        payload: Dict[str, Any],
        client_version: Optional[str] = None,
    ) -> SyncEvent:
        existing = db.query(SyncEvent).filter(SyncEvent.idempotency_key == idempotency_key).first()
        if existing:
            return existing

        event = SyncEvent(
            idempotency_key=idempotency_key,
            source_system=source_system,
            entity_type=entity_type,
            entity_id=entity_id,
            event_type=event_type,
            payload_json=payload,
            client_version=client_version,
            status=SyncEventStatusEnum.PENDING,
        )
        db.add(event)
        db.flush()
        db.add(SyncQueue(sync_event_id=event.id, status="PENDING"))

        try:
            event.status = SyncEventStatusEnum.PROCESSED
            event.processed_at = datetime.utcnow()
            AuditService.log_action(
                db, entity_type=entity_type, entity_id=entity_id or idempotency_key,
                action="SYNC_PUSH", user=user, new_value=payload,
            )
        except Exception as exc:
            event.status = SyncEventStatusEnum.FAILED
            db.add(SyncQueue(sync_event_id=event.id, status="FAILED", error_message=str(exc)))

        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def pull_events(
        db: Session,
        user: Employee,
        source_system: str,
        since: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[SyncEvent]:
        q = db.query(SyncEvent).filter(SyncEvent.source_system == source_system)
        if since:
            q = q.filter(SyncEvent.created_at > since)
        return q.order_by(SyncEvent.created_at.asc()).limit(limit).all()

    @staticmethod
    def record_conflict(
        db: Session,
        sync_event_id: int,
        entity_type: str,
        entity_id: str,
        server_version: str,
        client_version: str,
    ) -> SyncConflict:
        conflict = SyncConflict(
            sync_event_id=sync_event_id,
            entity_type=entity_type,
            entity_id=entity_id,
            server_version=server_version,
            client_version=client_version,
        )
        db.add(conflict)
        event = db.query(SyncEvent).filter(SyncEvent.id == sync_event_id).first()
        if event:
            event.status = SyncEventStatusEnum.CONFLICT
        db.commit()
        return conflict

    @staticmethod
    def retry_failed(db: Session, queue_id: int, user: Employee) -> SyncQueue:
        item = db.query(SyncQueue).filter(SyncQueue.id == queue_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue item not found")
        event = db.query(SyncEvent).filter(SyncEvent.id == item.sync_event_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        item.retry_count = (item.retry_count or 0) + 1
        item.status = "PENDING"
        item.error_message = None
        event.status = SyncEventStatusEnum.PROCESSED
        event.processed_at = datetime.utcnow()
        AuditService.log_action(db, entity_type="sync", entity_id=str(queue_id), action="SYNC_RETRY", user=user)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update_checkpoint(db: Session, user_id: int, device_id: str, source_system: str, version: str) -> SyncCheckpoint:
        cp = db.query(SyncCheckpoint).filter(
            SyncCheckpoint.user_id == user_id,
            SyncCheckpoint.device_id == device_id,
            SyncCheckpoint.source_system == source_system,
        ).first()
        if not cp:
            cp = SyncCheckpoint(user_id=user_id, device_id=device_id, source_system=source_system)
            db.add(cp)
        cp.last_sync_at = datetime.utcnow()
        cp.last_version = version
        db.commit()
        db.refresh(cp)
        return cp
