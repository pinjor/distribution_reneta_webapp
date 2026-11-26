from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee
from app.core.deps import require_permission
from app.schemas_opening_stock import OpeningStockCreate, OpeningStockPatch, OpeningStockReject
from app.services import opening_stock as service

router = APIRouter()


@router.get("/summary")
def opening_stock_summary(
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("inventory.read")),
):
    return service.summary(db, user)


@router.get("")
@router.get("/")
def list_opening_stock(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = Query(None, alias="status"),
    depot_id: Optional[int] = None,
    q: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("inventory.read")),
):
    return service.list_requests(
        db,
        user,
        status_filter=status,
        depot_id=depot_id,
        q=q,
        skip=skip,
        limit=limit,
        date_from=date_from,
        date_to=date_to,
    )


@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_opening_stock(
    body: OpeningStockCreate,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("inventory.read")),
):
    return service.create_request(db, user, body.model_dump(mode="json"))


@router.get("/{request_id}")
def get_opening_stock(
    request_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("inventory.read")),
):
    return service.get_request(db, user, request_id)


@router.get("/{request_id}/history")
def opening_stock_history(
    request_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("inventory.read")),
):
    payload = service.get_request(db, user, request_id)
    return {"requestId": request_id, "history": payload.get("history") or []}


@router.patch("/{request_id}")
def patch_opening_stock(
    request_id: int,
    body: OpeningStockPatch,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("inventory.read")),
):
    return service.patch_request(db, user, request_id, body.model_dump(mode="json", exclude_unset=True))


@router.post("/{request_id}/submit")
def submit_opening_stock(
    request_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("inventory.read")),
):
    return service.submit_request(db, user, request_id)


@router.post("/{request_id}/approve")
def approve_opening_stock(
    request_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("inventory.read")),
):
    return service.approve_request(db, user, request_id)


@router.post("/{request_id}/reject")
def reject_opening_stock(
    request_id: int,
    body: OpeningStockReject,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("inventory.read")),
):
    return service.reject_request(db, user, request_id, body.reason)
