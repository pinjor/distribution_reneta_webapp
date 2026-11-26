"""HTTP-facing Draft workflow used only by the isolated F.4B.2-DEV app.

Production routers must not import this module. No stock or billing writes.
"""
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.depot_scope import hide_foreign_depot
from app.models import Employee, ExportDeliveryItem, SampleGiftDeliveryItem
from app.services.draft_product_eligibility import (
    category_for_sample_gift,
    validate_lines_for_submit,
)
from app.services.draft_status_transition import (
    DraftAction,
    DraftModule,
    apply_transition,
    load_for_update,
)

ISOLATED_ENDPOINTS_MOUNTED = True


def require_draft_write_flag(module: DraftModule) -> None:
    settings = get_settings()
    if module == "sample_gift":
        if settings.sample_gift_draft_writes:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Sample/Gift draft writes are not enabled. "
                "Set SAMPLE_GIFT_DRAFT_WRITES=yes after product authorization is approved."
            ),
        )
    if settings.export_draft_writes:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            "Export draft writes are not enabled. "
            "Set EXPORT_DRAFT_WRITES=yes after product authorization is approved."
        ),
    )


def _submit_category(module: DraftModule, row) -> str:
    if module == "export":
        return "export"
    return category_for_sample_gift(row.document_kind)


def _submit_items(db: Session, module: DraftModule, document_id: int):
    if module == "sample_gift":
        return (
            db.query(SampleGiftDeliveryItem)
            .filter(SampleGiftDeliveryItem.delivery_id == document_id)
            .all()
        )
    return (
        db.query(ExportDeliveryItem)
        .filter(ExportDeliveryItem.delivery_id == document_id)
        .all()
    )


def execute_draft_workflow(
    db: Session,
    module: DraftModule,
    document_id: int,
    action: DraftAction,
    user: Employee,
    *,
    reason: Optional[str] = None,
    remarks: Optional[str] = None,
) -> dict:
    """Lock, validate, transition, audit. Does not commit. Does not touch inventory."""
    require_draft_write_flag(module)
    row = load_for_update(db, module, document_id)
    hide_foreign_depot(user, row.depot_id)
    current = row.status or "Draft"
    if action == "submit" and current == "Draft":
        items = _submit_items(db, module, document_id)
        validate_lines_for_submit(db, items, _submit_category(module, row))
    return apply_transition(
        db,
        module,
        document_id,
        action,
        user,
        reason=reason,
        remarks=remarks,
        check_depot=True,
    )
