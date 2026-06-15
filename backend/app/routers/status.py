"""Order status transition API."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_client_ip, get_user_agent, require_auth, require_permission
from app.database import get_db
from app.models import Employee, Order
from app.models_platform import OrderStatusHistory
from app.services.status_service import DELIVERY_TRANSITIONS, StatusTransitionService

router = APIRouter()


class StatusTransitionRequest(BaseModel):
    event_code: str
    reason: Optional[str] = None
    remarks: Optional[str] = None
    geo_latitude: Optional[float] = None
    geo_longitude: Optional[float] = None
    source_system: str = "DMS_WEB"


@router.post("/{order_id}/transition-status")
def transition_order_status(
    order_id: int,
    payload: StatusTransitionRequest,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("orders.status")),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    StatusTransitionService.transition(
        db, order, payload.event_code, user,
        reason=payload.reason, remarks=payload.remarks,
        geo_latitude=payload.geo_latitude, geo_longitude=payload.geo_longitude,
        source_system=payload.source_system,
    )
    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}/status-history")
def order_status_history(
    order_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("orders.read")),
):
    return db.query(OrderStatusHistory).filter(
        OrderStatusHistory.order_id == order_id
    ).order_by(OrderStatusHistory.changed_at.desc()).all()


@router.get("/status/config")
def status_config(user: Employee = Depends(require_auth)):
    events = sorted({event for (_, event) in DELIVERY_TRANSITIONS.keys()})
    return {
        "delivery_statuses": [
            "ORDER_CREATED", "REJECTED", "VALIDATED", "PICKING_IN_PROGRESS", "PACKING_IN_PROGRESS",
            "PLANNED_FOR_DELIVERY", "READY_TO_DISPATCH", "IN_DELIVERY", "DELIVERY_IN_PROGRESS",
            "DELIVERED", "CANCELLED", "POSTPONED",
        ],
        "collection_statuses": [
            "NOT_YET_DELIVERED", "DELIVERED_NOT_COLLECTED", "COLLECTION_IN_PROGRESS",
            "COLLECTED", "DUE_COLLECTION", "CANCELLED",
        ],
        "events": events,
    }
