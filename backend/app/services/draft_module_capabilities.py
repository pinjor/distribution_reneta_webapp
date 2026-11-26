"""Effective Draft module capabilities for the authenticated user.

Read-only. Does not grant writes. POST/PUT/workflow guards remain authoritative.
Production always reports Submit/Approve/Reject as false.
Isolated F.4B.2-DEV may advertise provisional workflow flags for the test UI.
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.depot_scope import hide_foreign_depot
from app.isolated_runtime import isolated_workflow_active
from app.models import Employee, ExportDelivery, SampleGiftDelivery
from app.services.draft_status_transition import (
    ALLOW_SELF_APPROVE,
    APPROVE_ROLES,
    REJECT_ROLES,
    SUBMIT_ROLES,
    TRANSITIONS,
)

WRITE_ROLES = frozenset({"admin", "manager"})


def _role(user: Employee) -> str:
    return (user.role or "").strip().lower()


def _workflow_flags(*, writes_enabled: bool, user: Employee) -> dict:
    if not isolated_workflow_active():
        return {"can_submit": False, "can_approve": False, "can_reject": False}
    role = _role(user)
    can_write = bool(writes_enabled and role in WRITE_ROLES)
    return {
        "can_submit": can_write and role in SUBMIT_ROLES,
        "can_approve": can_write and role in APPROVE_ROLES,
        "can_reject": can_write and role in REJECT_ROLES,
    }


def _module_capability(*, writes_enabled: bool, user: Employee) -> dict:
    role_may_write = _role(user) in WRITE_ROLES
    can_write = bool(writes_enabled and role_may_write)
    payload = {
        "can_read": True,
        "can_create": can_write,
        "can_edit": can_write,
        "writes_enabled": bool(writes_enabled),
    }
    payload.update(_workflow_flags(writes_enabled=writes_enabled, user=user))
    return payload


def _document_actions(user: Employee, row, *, writes_enabled: bool, module_caps: dict) -> dict:
    current = row.status or "Draft"
    creator_id = getattr(row, "created_by", None)
    self_blocked = (
        not ALLOW_SELF_APPROVE
        and creator_id is not None
        and user.id == creator_id
    )
    return {
        "id": row.id,
        "status": current,
        "can_submit": bool(
            module_caps["can_submit"] and TRANSITIONS.get((current, "submit"))
        ),
        "can_approve": bool(
            module_caps["can_approve"]
            and TRANSITIONS.get((current, "approve"))
            and not self_blocked
        ),
        "can_reject": bool(
            module_caps["can_reject"] and TRANSITIONS.get((current, "reject"))
        ),
        "can_edit": bool(module_caps["can_edit"] and current == "Draft" and writes_enabled),
        "self_approval_blocked": bool(self_blocked),
    }


def capabilities_for_user(
    user: Employee,
    db: Optional[Session] = None,
    *,
    sample_gift_id: Optional[int] = None,
    export_id: Optional[int] = None,
) -> dict:
    settings = get_settings()
    sample_gift = _module_capability(
        writes_enabled=settings.sample_gift_draft_writes,
        user=user,
    )
    export = _module_capability(
        writes_enabled=settings.export_draft_writes,
        user=user,
    )
    body = {"sample_gift": sample_gift, "export": export}
    if not isolated_workflow_active() or db is None:
        return body
    if sample_gift_id is not None:
        row = db.query(SampleGiftDelivery).filter(SampleGiftDelivery.id == sample_gift_id).first()
        if not row:
            from fastapi import HTTPException, status

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        hide_foreign_depot(user, row.depot_id)
        body["sample_gift"]["document"] = _document_actions(
            user,
            row,
            writes_enabled=settings.sample_gift_draft_writes,
            module_caps=sample_gift,
        )
    if export_id is not None:
        row = db.query(ExportDelivery).filter(ExportDelivery.id == export_id).first()
        if not row:
            from fastapi import HTTPException, status

            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        hide_foreign_depot(user, row.depot_id)
        body["export"]["document"] = _document_actions(
            user,
            row,
            writes_enabled=settings.export_draft_writes,
            module_caps=export,
        )
    return body
