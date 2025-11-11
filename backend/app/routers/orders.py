from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter()


def generate_order_number(prefix: str = "ORD") -> str:
    stamp = datetime.utcnow()
    return f"{prefix}-{stamp.strftime('%Y%m%d')}-{stamp.strftime('%H%M%S')}{stamp.microsecond // 1000:03d}"


def map_item_to_model(item_data: schemas.OrderItemCreate, order: models.Order) -> models.OrderItem:
    return models.OrderItem(
        order=order,
        old_code=item_data.old_code,
        new_code=item_data.new_code,
        product_name=item_data.product_name,
        pack_size=item_data.pack_size,
        quantity=item_data.quantity,
        trade_price=item_data.trade_price,
        delivery_date=item_data.delivery_date,
        selected=item_data.selected,
    )


@router.get("", response_model=List[schemas.Order])
def list_orders(db: Session = Depends(get_db)) -> List[schemas.Order]:
    return (
        db.query(models.Order)
        .order_by(models.Order.created_at.desc())
        .all()
    )


@router.get("/{order_id}", response_model=schemas.Order)
def get_order(order_id: int, db: Session = Depends(get_db)) -> schemas.Order:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.post("", response_model=schemas.Order, status_code=status.HTTP_201_CREATED)
def create_order(order_data: schemas.OrderCreate, db: Session = Depends(get_db)) -> schemas.Order:
    if not order_data.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order requires at least one item")

    order = models.Order(
        depot_code=order_data.depot_code,
        depot_name=order_data.depot_name,
        customer_id=order_data.customer_id,
        customer_name=order_data.customer_name,
        customer_code=order_data.customer_code,
        pso_id=order_data.pso_id,
        pso_name=order_data.pso_name,
        pso_code=order_data.pso_code,
        delivery_date=order_data.delivery_date,
        status=order_data.status or models.OrderStatusEnum.DRAFT,
        notes=order_data.notes,
    )

    for item in order_data.items:
        order.items.append(map_item_to_model(item, order))

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.put("/{order_id}", response_model=schemas.Order)
def update_order(order_id: int, order_update: schemas.OrderUpdate, db: Session = Depends(get_db)) -> schemas.Order:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order_update.depot_code is not None:
        order.depot_code = order_update.depot_code
    if order_update.depot_name is not None:
        order.depot_name = order_update.depot_name
    if order_update.customer_id is not None:
        order.customer_id = order_update.customer_id
    if order_update.customer_name is not None:
        order.customer_name = order_update.customer_name
    if order_update.customer_code is not None:
        order.customer_code = order_update.customer_code
    if order_update.pso_id is not None:
        order.pso_id = order_update.pso_id
    if order_update.pso_name is not None:
        order.pso_name = order_update.pso_name
    if order_update.pso_code is not None:
        order.pso_code = order_update.pso_code
    if order_update.delivery_date is not None:
        order.delivery_date = order_update.delivery_date
    if order_update.notes is not None:
        order.notes = order_update.notes
    if order_update.status is not None:
        order.status = order_update.status

    if order_update.items is not None:
        existing_items = {item.id: item for item in order.items}
        keep_ids = set()

        for item_data in order_update.items:
            if item_data.id and item_data.id in existing_items:
                item = existing_items[item_data.id]
                item.old_code = item_data.old_code
                item.new_code = item_data.new_code
                item.product_name = item_data.product_name
                item.pack_size = item_data.pack_size
                item.quantity = item_data.quantity
                item.trade_price = item_data.trade_price
                item.delivery_date = item_data.delivery_date
                item.selected = item_data.selected
                keep_ids.add(item.id)
            else:
                new_item = map_item_to_model(item_data, order)
                db.add(new_item)
                db.flush()
                keep_ids.add(new_item.id)

        for existing_id, existing_item in list(existing_items.items()):
            if existing_id not in keep_ids:
                order.items.remove(existing_item)
                db.delete(existing_item)

    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)) -> None:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    db.delete(order)
    db.commit()


@router.post("/{order_id}/submit", response_model=schemas.Order)
def submit_order(order_id: int, db: Session = Depends(get_db)) -> schemas.Order:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if not order.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order has no items")

    order.status = models.OrderStatusEnum.SUBMITTED
    db.commit()
    db.refresh(order)
    return order


@router.post("/approve", response_model=schemas.OrderApprovalResponse)
def approve_orders(payload: schemas.OrderApprovalRequest, db: Session = Depends(get_db)) -> schemas.OrderApprovalResponse:
    if not payload.order_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No orders selected for approval")

    orders = (
        db.query(models.Order)
        .filter(models.Order.id.in_(payload.order_ids))
        .all()
    )

    if not orders:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No matching orders found")

    generated_number = payload.order_number or generate_order_number()

    for order in orders:
        if order.status not in (models.OrderStatusEnum.SUBMITTED, models.OrderStatusEnum.PARTIALLY_APPROVED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order {order.id} is not submitted and cannot be approved",
            )

        all_selected = all(item.selected for item in order.items)
        order.order_number = generated_number
        order.status = models.OrderStatusEnum.APPROVED if all_selected else models.OrderStatusEnum.PARTIALLY_APPROVED

    db.commit()

    refreshed = (
        db.query(models.Order)
        .filter(models.Order.id.in_(payload.order_ids))
        .order_by(models.Order.created_at.desc())
        .all()
    )

    return schemas.OrderApprovalResponse(order_number=generated_number, orders=refreshed)
