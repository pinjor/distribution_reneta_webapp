"""Isolated Sample/Gift and Export document status transitions.

Policy is pending. Draft routers must not import this until Gate B written
approval. No stock, invoice, or dispatch side effects.

Proposed machine (not approved):
    Draft → Submitted → Approved
    Submitted → Rejected (terminal)
"""
from datetime import datetime
from typing import Literal, Optional, Tuple, Type

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.depot_scope import hide_foreign_depot
from app.models import Employee, ExportDelivery, SampleGiftDelivery
from app.services.audit_service import AuditService
from app.services.draft_document_lock import load_document_for_update

POLICY_STATUS = "pending"
POLICY_APPROVED = False
ENDPOINTS_MOUNTED = False

DraftModule = Literal["sample_gift", "export"]
DraftAction = Literal["submit", "approve", "reject"]

# Proposed defaults — not granted on live APIs.
SUBMIT_ROLES = ("admin", "manager")
APPROVE_ROLES = ("admin", "manager")
REJECT_ROLES = ("admin", "manager")
ALLOW_SELF_APPROVE = False
REJECT_REQUIRES_REASON = True
REJECTED_IS_TERMINAL = True

TRANSITIONS: dict[Tuple[str, DraftAction], str] = {
    ("Draft", "submit"): "Submitted",
    ("Submitted", "approve"): "Approved",
    ("Submitted", "reject"): "Rejected",
}

AUDIT_ACTIONS = {
    ("sample_gift", "submit"): "SAMPLE_GIFT_SUBMITTED",
    ("sample_gift", "approve"): "SAMPLE_GIFT_APPROVED",
    ("sample_gift", "reject"): "SAMPLE_GIFT_REJECTED",
    ("export", "submit"): "EXPORT_SUBMITTED",
    ("export", "approve"): "EXPORT_APPROVED",
    ("export", "reject"): "EXPORT_REJECTED",
}

ENTITY_TYPE = {
    "sample_gift": "sample_gift_delivery",
    "export": "export_delivery",
}

MODEL: dict[DraftModule, Type] = {
    "sample_gift": SampleGiftDelivery,
    "export": ExportDelivery,
}


def _role(user: Employee) -> str:
    return (user.role or "").strip().lower()


def _roles_for(action: DraftAction) -> Tuple[str, ...]:
    if action == "submit":
        return SUBMIT_ROLES
    if action == "approve":
        return APPROVE_ROLES
    return REJECT_ROLES


def load_for_update(db: Session, module: DraftModule, document_id: int):
    return load_document_for_update(db, MODEL[module], document_id)


def apply_transition(
    db: Session,
    module: DraftModule,
    document_id: int,
    action: DraftAction,
    user: Employee,
    *,
    reason: Optional[str] = None,
    remarks: Optional[str] = None,
    check_depot: bool = True,
) -> dict:
    """Apply a proposed status change. Does not commit. Does not touch inventory.

    Returns {document, from_status, to_status, idempotent, audit_action}.
    """
    if action not in ("submit", "approve", "reject"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown action")
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    if _role(user) not in _roles_for(action):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action",
        )

    row = load_for_update(db, module, document_id)
    if check_depot:
        hide_foreign_depot(user, row.depot_id)

    current = row.status or "Draft"
    target = TRANSITIONS.get((current, action))
    if target is None:
        already = [to for (src, act), to in TRANSITIONS.items() if act == action]
        if current in already:
            return {
                "document": row,
                "from_status": current,
                "to_status": current,
                "idempotent": True,
                "audit_action": None,
            }
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot {action} a document in status {current}",
        )

    if action == "approve" and not ALLOW_SELF_APPROVE:
        if row.created_by is not None and user.id == row.created_by:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Creators may not approve their own documents",
            )
    if action == "reject" and REJECT_REQUIRES_REASON:
        text = (reason or remarks or "").strip()
        if not text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A rejection reason is required",
            )

    audit_action = AUDIT_ACTIONS[(module, action)]
    old_status = current
    row.status = target
    row.updated_at = datetime.utcnow()
    AuditService.log_action(
        db,
        entity_type=ENTITY_TYPE[module],
        entity_id=str(row.id),
        action=audit_action,
        user=user,
        old_value={"status": old_status},
        new_value={"status": target},
        depot_id=row.depot_id,
        reason=reason,
        remarks=remarks,
    )
    return {
        "document": row,
        "from_status": old_status,
        "to_status": target,
        "idempotent": False,
        "audit_action": audit_action,
    }
