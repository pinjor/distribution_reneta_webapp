from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.core.deps import require_auth
from sqlalchemy import false

from app.core.depot_scope import hide_order, is_admin, restrict_orders, user_depot_code

router = APIRouter()


def generate_picking_order_number(prefix: str = "PCK") -> str:
    stamp = datetime.utcnow()
    return f"{prefix}-{stamp.strftime('%Y%m%d')}-{stamp.strftime('%H%M%S')}{stamp.microsecond // 1000:03d}"


def orders_for_loading(db: Session, loading_no: str | None) -> list:
    if not loading_no:
        return []
    return db.query(models.Order).filter(models.Order.loading_number == loading_no).all()


def require_loading_owner(db: Session, user: models.Employee, loading_no: str | None) -> None:
    """A picking row is visible only when its loading number matches orders in the caller's depot.

    A depot assignment by itself is not enough. An unknown loading number is 404.
    Administrators are not restricted.
    """
    if is_admin(user):
        return
    linked = orders_for_loading(db, loading_no)
    if not linked:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Picking order not found")
    restrict_orders(db, user, linked, detail="Picking order not found")


def fetch_picking_order(db: Session, order_id: int, user: models.Employee) -> models.PickingOrder:
    order = db.query(models.PickingOrder).filter(models.PickingOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Picking order not found")
    require_loading_owner(db, user, order.loading_no)
    return order


@router.get("", response_model=schemas.PickingOrderListResponse)
def list_picking_orders(
    db: Session = Depends(get_db),
    user: models.Employee = Depends(require_auth),
) -> schemas.PickingOrderListResponse:
    query = db.query(models.PickingOrder)
    if not is_admin(user):
        code = user_depot_code(db, user)
        if not code:
            query = query.filter(false())
        else:
            loading_nums = (
                db.query(models.Order.loading_number)
                .filter(
                    models.Order.loading_number.isnot(None),
                    models.Order.depot_code == code,
                )
                .distinct()
            )
            query = query.filter(models.PickingOrder.loading_no.in_(loading_nums))
    orders = query.order_by(models.PickingOrder.created_at.desc()).all()
    return schemas.PickingOrderListResponse(data=orders, total=len(orders))


@router.get("/{order_id}", response_model=schemas.PickingOrder)
def retrieve_picking_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: models.Employee = Depends(require_auth),
) -> schemas.PickingOrder:
    return fetch_picking_order(db, order_id, user)


@router.post("", response_model=schemas.PickingOrder, status_code=status.HTTP_201_CREATED)
def create_picking_order(
    payload: schemas.PickingOrderCreate,
    db: Session = Depends(get_db),
    user: models.Employee = Depends(require_auth),
) -> schemas.PickingOrder:
    if not payload.deliveries:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one delivery must be provided")
    require_loading_owner(db, user, payload.loading_no)

    order_number = payload.order_number or generate_picking_order_number()
    picking_order = models.PickingOrder(
        order_number=order_number,
        loading_no=payload.loading_no,
        loading_date=payload.loading_date,
        area=payload.area,
        delivery_by=payload.delivery_by,
        vehicle_no=payload.vehicle_no,
        remarks=payload.remarks,
        status=models.PickingOrderStatusEnum.DRAFT.value,
    )
    db.add(picking_order)
    db.flush()

    delivery_ids_seen = set()
    for line in payload.deliveries:
        if line.delivery_id in delivery_ids_seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate delivery id {line.delivery_id} in payload",
            )
        delivery_ids_seen.add(line.delivery_id)

        delivery = db.query(models.OrderDelivery).filter(models.OrderDelivery.id == line.delivery_id).first()
        if not delivery:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Delivery order {line.delivery_id} not found",
            )
        parent = db.query(models.Order).filter(models.Order.id == delivery.order_id).first()
        hide_order(db, user, parent, detail="Picking order not found", missing_ok=False)

        item = models.PickingOrderDelivery(
            picking_order_id=picking_order.id,
            delivery_id=delivery.id,
            memo_no=line.memo_no,
            value=line.value,
            status=line.status,
            pso=line.pso,
            remarks=line.remarks,
            cash=line.cash,
            dues=line.dues,
            amend=line.amend,
            returns=line.returns,
        )
        db.add(item)

        # Move delivery to packing stage
        delivery.status = models.DeliveryStatusEnum.PACKING

    db.commit()
    db.refresh(picking_order)
    return picking_order


@router.post("/{order_id}/approve", response_model=schemas.PickingOrder)
def approve_picking_order(
    order_id: int,
    db: Session = Depends(get_db),
    user: models.Employee = Depends(require_auth),
) -> schemas.PickingOrder:
    picking_order = fetch_picking_order(db, order_id, user)
    if picking_order.status == models.PickingOrderStatusEnum.APPROVED.value:
        return picking_order

    picking_order.status = models.PickingOrderStatusEnum.APPROVED.value
    picking_order.updated_at = datetime.utcnow()

    for line in picking_order.deliveries:
        if line.delivery:
            line.delivery.status = models.DeliveryStatusEnum.LOADING

    db.commit()
    db.refresh(picking_order)
    return picking_order


@router.get("/{order_id}/report", response_model=schemas.PickingOrder)
def picking_order_report(
    order_id: int,
    db: Session = Depends(get_db),
    user: models.Employee = Depends(require_auth),
) -> schemas.PickingOrder:
    return fetch_picking_order(db, order_id, user)


