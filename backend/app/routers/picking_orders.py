from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter()


def generate_picking_order_number(prefix: str = "PCK") -> str:
    stamp = datetime.utcnow()
    return f"{prefix}-{stamp.strftime('%Y%m%d')}-{stamp.strftime('%H%M%S')}{stamp.microsecond // 1000:03d}"


def fetch_picking_order(db: Session, order_id: int) -> models.PickingOrder:
    order = db.query(models.PickingOrder).filter(models.PickingOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Picking order not found")
    return order


@router.get("", response_model=schemas.PickingOrderListResponse)
def list_picking_orders(db: Session = Depends(get_db)) -> schemas.PickingOrderListResponse:
    orders = db.query(models.PickingOrder).order_by(models.PickingOrder.created_at.desc()).all()
    return schemas.PickingOrderListResponse(data=orders, total=len(orders))


@router.get("/{order_id}", response_model=schemas.PickingOrder)
def retrieve_picking_order(order_id: int, db: Session = Depends(get_db)) -> schemas.PickingOrder:
    return fetch_picking_order(db, order_id)


@router.post("", response_model=schemas.PickingOrder, status_code=status.HTTP_201_CREATED)
def create_picking_order(payload: schemas.PickingOrderCreate, db: Session = Depends(get_db)) -> schemas.PickingOrder:
    if not payload.deliveries:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one delivery must be provided")

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

        delivery = db.query(models.DeliveryOrder).filter(models.DeliveryOrder.id == line.delivery_id).first()
        if not delivery:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Delivery order {line.delivery_id} not found",
            )

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
def approve_picking_order(order_id: int, db: Session = Depends(get_db)) -> schemas.PickingOrder:
    picking_order = fetch_picking_order(db, order_id)
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
def picking_order_report(order_id: int, db: Session = Depends(get_db)) -> schemas.PickingOrder:
    return fetch_picking_order(db, order_id)


