"""Order delivery and collection status transition engine."""
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Employee, Order
from app.models_platform import CollectionStatusEnum, DeliveryStatusEnum, OrderStatusHistory
from app.services.audit_service import AuditService

# Allowed transitions: (from_delivery, event) -> (to_delivery, to_collection or None)
DELIVERY_TRANSITIONS: dict[tuple[str, str], tuple[str, Optional[str]]] = {
    ("ORDER_CREATED", "VALIDATE"): ("VALIDATED", None),
    ("ORDER_CREATED", "REJECT"): ("REJECTED", None),
    ("VALIDATED", "START_PICKING"): ("PICKING_IN_PROGRESS", None),
    ("PICKING_IN_PROGRESS", "START_PACKING"): ("PACKING_IN_PROGRESS", None),
    ("PACKING_IN_PROGRESS", "PRINT_MEMO"): ("PACKING_IN_PROGRESS", None),
    ("PACKING_IN_PROGRESS", "PLAN_DELIVERY"): ("PLANNED_FOR_DELIVERY", None),
    ("PLANNED_FOR_DELIVERY", "ASSIGN"): ("PLANNED_FOR_DELIVERY", None),
    ("PLANNED_FOR_DELIVERY", "READY_DISPATCH"): ("READY_TO_DISPATCH", None),
    ("READY_TO_DISPATCH", "DISPATCH"): ("IN_DELIVERY", None),
    ("IN_DELIVERY", "ACCEPT_ASSIGNMENT"): ("IN_DELIVERY", None),
    ("IN_DELIVERY", "CHECK_IN"): ("DELIVERY_IN_PROGRESS", None),
    ("DELIVERY_IN_PROGRESS", "DELIVER_FULL"): ("DELIVERED", "DELIVERED_NOT_COLLECTED"),
    ("DELIVERY_IN_PROGRESS", "DELIVER_PARTIAL"): ("DELIVERED", "DUE_COLLECTION"),
    ("DELIVERY_IN_PROGRESS", "POSTPONE"): ("POSTPONED", "DUE_COLLECTION"),
    ("DELIVERY_IN_PROGRESS", "CANCEL"): ("CANCELLED", "CANCELLED"),
    ("DELIVERED", "START_COLLECTION"): ("DELIVERED", "COLLECTION_IN_PROGRESS"),
    ("DELIVERED_NOT_COLLECTED", "START_COLLECTION"): ("DELIVERED", "COLLECTION_IN_PROGRESS"),
    ("COLLECTION_IN_PROGRESS", "COLLECT_FULL"): ("DELIVERED", "COLLECTED"),
    ("COLLECTION_IN_PROGRESS", "COLLECT_PARTIAL"): ("DELIVERED", "DUE_COLLECTION"),
    ("DUE_COLLECTION", "COLLECT_FULL"): ("DELIVERED", "COLLECTED"),
}

EVENT_PERMISSIONS: dict[str, set[str]] = {
    "VALIDATE": {"orders.validate", "orders.approve_exception"},
    "REJECT": {"orders.validate"},
    "START_PICKING": {"orders.status"},
    "START_PACKING": {"orders.status"},
    "PRINT_MEMO": {"orders.print"},
    "PLAN_DELIVERY": {"orders.assign"},
    "ASSIGN": {"orders.assign"},
    "READY_DISPATCH": {"orders.assign"},
    "DISPATCH": {"orders.status"},
    "ACCEPT_ASSIGNMENT": {"mobile.access"},
    "CHECK_IN": {"mobile.access", "orders.status"},
    "DELIVER_FULL": {"mobile.access", "orders.status"},
    "DELIVER_PARTIAL": {"mobile.access", "orders.status"},
    "POSTPONE": {"mobile.access", "orders.status"},
    "CANCEL": {"orders.status"},
    "START_COLLECTION": {"mobile.access", "billing.write"},
    "COLLECT_FULL": {"mobile.access", "billing.approve"},
    "COLLECT_PARTIAL": {"mobile.access", "billing.write"},
}

# Map legacy collection_status strings to new enum values
LEGACY_COLLECTION_MAP = {
    "Pending": CollectionStatusEnum.DELIVERED_NOT_COLLECTED.value,
    "Partially Collected": CollectionStatusEnum.DUE_COLLECTION.value,
    "Postponed": CollectionStatusEnum.DUE_COLLECTION.value,
    "Fully Collected": CollectionStatusEnum.COLLECTED.value,
}


def get_order_delivery_status(order: Order) -> str:
    return order.delivery_status or DeliveryStatusEnum.ORDER_CREATED.value


def get_order_collection_status(order: Order) -> str:
    if order.collection_status:
        mapped = LEGACY_COLLECTION_MAP.get(order.collection_status)
        if mapped:
            return mapped
    return CollectionStatusEnum.NOT_YET_DELIVERED.value


def sync_legacy_collection_status(order: Order, new_status: str) -> None:
    """Keep legacy string field in sync for existing UI."""
    reverse = {
        CollectionStatusEnum.NOT_YET_DELIVERED.value: None,
        CollectionStatusEnum.DELIVERED_NOT_COLLECTED.value: "Pending",
        CollectionStatusEnum.COLLECTION_IN_PROGRESS.value: "Pending",
        CollectionStatusEnum.COLLECTED.value: "Fully Collected",
        CollectionStatusEnum.DUE_COLLECTION.value: "Partially Collected",
        CollectionStatusEnum.CANCELLED.value: "Postponed",
    }
    order.collection_status = reverse.get(new_status)


class StatusTransitionService:
    @staticmethod
    def can_transition(user: Employee, event_code: str) -> bool:
        from app.core.permissions import permissions_for_role
        required = EVENT_PERMISSIONS.get(event_code, {"orders.status"})
        perms = permissions_for_role(user.role or "user")
        return bool(required.intersection(perms))

    @staticmethod
    def transition(
        db: Session,
        order: Order,
        event_code: str,
        user: Employee,
        *,
        reason: Optional[str] = None,
        remarks: Optional[str] = None,
        source_system: str = "DMS_WEB",
        geo_latitude: Optional[float] = None,
        geo_longitude: Optional[float] = None,
        force: bool = False,
    ) -> Order:
        if not force and not StatusTransitionService.can_transition(user, event_code):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Not allowed to perform: {event_code}")

        current_delivery = get_order_delivery_status(order)
        current_collection = get_order_collection_status(order)

        key = (current_delivery, event_code)
        if key not in DELIVERY_TRANSITIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid transition: {current_delivery} + {event_code}",
            )

        new_delivery, new_collection = DELIVERY_TRANSITIONS[key]
        old_delivery = order.delivery_status
        old_collection = current_collection

        order.delivery_status = new_delivery
        if new_collection:
            sync_legacy_collection_status(order, new_collection)

        history = OrderStatusHistory(
            order_id=order.id,
            from_delivery_status=old_delivery,
            to_delivery_status=new_delivery,
            from_collection_status=old_collection,
            to_collection_status=new_collection or old_collection,
            event_code=event_code,
            changed_by=user.id,
            reason=reason,
            remarks=remarks,
            geo_latitude=geo_latitude,
            geo_longitude=geo_longitude,
            source_system=source_system,
        )
        db.add(history)
        AuditService.log_status_change(
            db, "order", str(order.id), old_delivery, new_delivery, user,
            reason=reason, remarks=remarks,
        )
        AuditService.log_action(
            db, entity_type="order", entity_id=str(order.id), action="COLLECTION_STATUS_CHANGE",
            user=user,
            new_value={"delivery_status": new_delivery, "collection_status": new_collection},
        )
        return order

    @staticmethod
    def get_allowed_events(order: Order) -> list[str]:
        current = get_order_delivery_status(order)
        return [event for (frm, event) in DELIVERY_TRANSITIONS if frm == current]
