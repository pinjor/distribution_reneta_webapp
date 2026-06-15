"""Build 8-step order lifecycle progress for tracking UI."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app import models, schemas

LIFECYCLE_KEYS = [
    ("order_creation", "Order Creation"),
    ("validation", "Validation"),
    ("route_wise", "Route Wise"),
    ("assignment", "Assignment"),
    ("delivery", "Delivery"),
    ("collection", "Collection"),
    ("billing", "Billing"),
    ("mis_report", "MIS Report"),
]

DELIVERED_STATUSES = frozenset(
    {
        "DELIVERED",
        "DELIVERY_IN_PROGRESS",
        "IN_DELIVERY",
        "POSTPONED",
    }
)

DELIVERY_COMPLETE_STATUSES = frozenset({"DELIVERED", "POSTPONED"})


def _has_billing_deposit(db: Session, order_id: int) -> bool:
    return (
        db.query(models.CollectionTransaction)
        .filter(
            models.CollectionTransaction.order_id == order_id,
            models.CollectionTransaction.deposit_id.isnot(None),
        )
        .first()
        is not None
    )


def _is_delivery_complete(order: models.Order) -> bool:
    ds = (order.delivery_status or "").upper()
    if ds in DELIVERY_COMPLETE_STATUSES:
        return True
    cs = (order.collection_status or "").strip()
    return cs in {"Pending", "Partially Collected", "Fully Collected", "Postponed"}


def _is_delivery_started(order: models.Order) -> bool:
    if _is_delivery_complete(order):
        return True
    ds = (order.delivery_status or "").upper()
    return ds in DELIVERED_STATUSES or bool(order.loaded)


def _completion_flags(order: models.Order, db: Session) -> dict[str, bool]:
    has_deposit = _has_billing_deposit(db, order.id)
    return {
        "order_creation": order.status != models.OrderStatusEnum.DRAFT,
        "validation": bool(order.validated),
        "route_wise": bool(order.validated and order.printed),
        "assignment": bool(order.loaded or (order.assigned_to and order.loading_number)),
        "delivery": _is_delivery_complete(order),
        "collection": bool(order.collection_approved),
        "billing": has_deposit,
        "mis_report": has_deposit and bool(order.collection_approved),
    }


def _current_stage_index(order: models.Order, completed: dict[str, bool]) -> int:
    """Return index of the active lifecycle stage (0–7)."""
    if order.status == models.OrderStatusEnum.DRAFT:
        return 0
    if not completed["validation"]:
        return 1
    if not completed["route_wise"]:
        return 2
    if not completed["assignment"]:
        return 3
    if not completed["delivery"]:
        return 4
    if not completed["collection"]:
        return 5
    if not completed["billing"]:
        return 6
    if not completed["mis_report"]:
        return 7
    return 7


def _timestamp_for_key(key: str, order: models.Order) -> Optional[datetime]:
    mapping = {
        "order_creation": order.created_at,
        "validation": order.updated_at if order.validated else None,
        "route_wise": order.printed_at,
        "assignment": order.loaded_at or order.assignment_date,
        "delivery": order.updated_at if _is_delivery_complete(order) else None,
        "collection": order.collection_approved_at,
        "billing": order.updated_at,
        "mis_report": order.updated_at,
    }
    return mapping.get(key)


def build_order_lifecycle_steps(
    order: models.Order, db: Session
) -> Tuple[List[schemas.DeliveryProgressNode], str, str]:
    completed = _completion_flags(order, db)
    current_idx = _current_stage_index(order, completed)
    current_key = LIFECYCLE_KEYS[current_idx][0]
    current_label = LIFECYCLE_KEYS[current_idx][1]

    if order.status == models.OrderStatusEnum.DRAFT:
        current_label = "Order Creation (Draft)"

    steps: List[schemas.DeliveryProgressNode] = []
    for idx, (key, label) in enumerate(LIFECYCLE_KEYS):
        if completed[key] and idx != current_idx:
            status = "completed"
        elif idx == current_idx:
            status = "current"
        elif idx < current_idx:
            status = "completed"
        else:
            status = "pending"

        if order.status == models.OrderStatusEnum.DRAFT and key == "order_creation":
            status = "current"

        steps.append(
            schemas.DeliveryProgressNode(
                key=key,
                label=label,
                status=status,
                timestamp=_timestamp_for_key(key, order) if status != "pending" else None,
            )
        )

    return steps, current_key, current_label
