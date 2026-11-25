"""Effective Draft module capabilities for the authenticated user.

Read-only. Does not grant writes. POST/PUT guards remain authoritative.
Submit/Approve/Reject are never reported as enabled.
"""

from app.core.config import get_settings
from app.models import Employee

WRITE_ROLES = frozenset({"admin", "manager"})


def _role(user: Employee) -> str:
    return (user.role or "").strip().lower()


def _module_capability(*, writes_enabled: bool, user: Employee) -> dict:
    role_may_write = _role(user) in WRITE_ROLES
    can_write = bool(writes_enabled and role_may_write)
    return {
        "can_read": True,
        "can_create": can_write,
        "can_edit": can_write,
        "writes_enabled": bool(writes_enabled),
        "can_submit": False,
        "can_approve": False,
        "can_reject": False,
    }


def capabilities_for_user(user: Employee) -> dict:
    settings = get_settings()
    return {
        "sample_gift": _module_capability(
            writes_enabled=settings.sample_gift_draft_writes,
            user=user,
        ),
        "export": _module_capability(
            writes_enabled=settings.export_draft_writes,
            user=user,
        ),
    }
