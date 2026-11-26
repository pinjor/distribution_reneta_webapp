"""Authenticated Draft module capability snapshot. GET only."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import require_auth
from app.database import get_db
from app.models import Employee
from app.services.draft_module_capabilities import capabilities_for_user

router = APIRouter()


@router.get("/capabilities")
def get_draft_module_capabilities(
    sample_gift_id: Optional[int] = Query(None),
    export_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    return capabilities_for_user(
        user,
        db,
        sample_gift_id=sample_gift_id,
        export_id=export_id,
    )
