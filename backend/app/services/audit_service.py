"""Central immutable audit logging service."""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models import Employee
from app.models_platform import AuditLog


def _serialize(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _serialize(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serialize(v) for v in value]
    if hasattr(value, "__dict__") and not isinstance(value, (str, int, float, bool)):
        return str(value)
    return value


class AuditService:
    @staticmethod
    def log_action(
        db: Session,
        *,
        entity_type: str,
        entity_id: str,
        action: str,
        user: Optional[Employee] = None,
        old_value: Any = None,
        new_value: Any = None,
        depot_id: Optional[int] = None,
        depot_code: Optional[str] = None,
        device_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        geo_latitude: Optional[float] = None,
        geo_longitude: Optional[float] = None,
        reason: Optional[str] = None,
        remarks: Optional[str] = None,
        attachment_url: Optional[str] = None,
        transaction_id: Optional[str] = None,
    ) -> AuditLog:
        entry = AuditLog(
            transaction_id=transaction_id or str(uuid.uuid4()),
            entity_type=entity_type,
            entity_id=str(entity_id),
            action=action,
            old_value=_serialize(old_value),
            new_value=_serialize(new_value),
            user_id=user.id if user else None,
            user_name=f"{user.first_name} {user.last_name or ''}".strip() if user else None,
            role_id=user.role if user else None,
            role_name=user.role if user else None,
            depot_id=depot_id or (user.depot_id if user else None),
            depot_code=depot_code,
            device_id=device_id,
            ip_address=ip_address,
            user_agent=user_agent,
            geo_latitude=geo_latitude,
            geo_longitude=geo_longitude,
            reason=reason,
            remarks=remarks,
            attachment_url=attachment_url,
        )
        db.add(entry)
        return entry

    @staticmethod
    def log_create(db: Session, entity_type: str, entity_id: str, new_value: Any, user: Employee, **kwargs) -> AuditLog:
        return AuditService.log_action(
            db, entity_type=entity_type, entity_id=entity_id, action="CREATE",
            user=user, new_value=new_value, **kwargs,
        )

    @staticmethod
    def log_update(db: Session, entity_type: str, entity_id: str, old_value: Any, new_value: Any, user: Employee, **kwargs) -> AuditLog:
        return AuditService.log_action(
            db, entity_type=entity_type, entity_id=entity_id, action="UPDATE",
            user=user, old_value=old_value, new_value=new_value, **kwargs,
        )

    @staticmethod
    def log_status_change(db: Session, entity_type: str, entity_id: str, old_status: Any, new_status: Any, user: Employee, **kwargs) -> AuditLog:
        return AuditService.log_action(
            db, entity_type=entity_type, entity_id=entity_id, action="STATUS_CHANGE",
            user=user, old_value={"status": old_status}, new_value={"status": new_status}, **kwargs,
        )

    @staticmethod
    def log_approval(db: Session, entity_type: str, entity_id: str, user: Employee, **kwargs) -> AuditLog:
        return AuditService.log_action(
            db, entity_type=entity_type, entity_id=entity_id, action="APPROVE", user=user, **kwargs,
        )

    @staticmethod
    def log_rejection(db: Session, entity_type: str, entity_id: str, user: Employee, reason: str, **kwargs) -> AuditLog:
        return AuditService.log_action(
            db, entity_type=entity_type, entity_id=entity_id, action="REJECT",
            user=user, reason=reason, **kwargs,
        )

    @staticmethod
    def log_finance_action(db: Session, entity_type: str, entity_id: str, action: str, user: Employee, **kwargs) -> AuditLog:
        return AuditService.log_action(
            db, entity_type=entity_type, entity_id=entity_id, action=f"FINANCE_{action}", user=user, **kwargs,
        )

    @staticmethod
    def log_integration_event(db: Session, system: str, job_id: str, action: str, payload: Any = None, **kwargs) -> AuditLog:
        return AuditService.log_action(
            db, entity_type="integration", entity_id=job_id, action=f"INTEGRATION_{action}",
            new_value={"system": system, "payload": _serialize(payload)}, **kwargs,
        )
