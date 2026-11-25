"""Authenticated Draft module capability snapshot. GET only."""

from fastapi import APIRouter, Depends

from app.core.deps import require_auth
from app.models import Employee
from app.services.draft_module_capabilities import capabilities_for_user

router = APIRouter()


@router.get("/capabilities")
def get_draft_module_capabilities(user: Employee = Depends(require_auth)):
    return capabilities_for_user(user)
