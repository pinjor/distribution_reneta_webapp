from datetime import date, datetime
from decimal import Decimal, ROUND_FLOOR
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import asc

from app.database import get_db
from app import models, schemas

router = APIRouter()


def generate_delivery_number(prefix: str = "DLV") -> str:
    stamp = datetime.utcnow()
    return f"{prefix}-{stamp.strftime('%Y%m%d')}-{stamp.strftime('%H%M%S')}{stamp.microsecond // 1000:03d}"


def resolve_product(session: Session, order_item: models.OrderItem) -> Optional[models.Product]:
    if order_item.new_code:
        product = session.query(models.Product).filter(models.Product.new_code == order_item.new_code).first()
        if product:
            return product
    if order_item.old_code:
        product = session.query(models.Product).filter(models.Product.old_code == order_item.old_code).first()
        if product:
            return product
    product = session.query(models.Product).filter(models.Product.name == order_item.product_name).first()
    return product


def allocate_fefo_batches(
    session: Session,
    product: models.Product,
    required_qty: float,
    depot_id: Optional[int],
) -> List[dict]:
    remaining = required_qty
    allocations: List[dict] = []

    query = session.query(models.StockLedger).filter(models.StockLedger.product_id == product.id)
    if depot_id:
        query = query.filter(models.StockLedger.depot_id == depot_id)
    query = query.filter(models.StockLedger.available_quantity > 0).order_by(asc(models.StockLedger.expiry_date))

    ledgers = query.all()
    for ledger in ledgers:
        if remaining <= 0:
            break
        available = float(ledger.available_quantity or 0)
        if available <= 0:
            continue
        allocated = min(available, remaining)
        allocations.append(
            {
                "ledger": ledger,
                "batch": ledger.batch,
                "expiry": ledger.expiry_date,
                "available": available,
                "allocated": allocated,
            }
        )
        remaining -= allocated

    if remaining > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock for product {product.name}. Short by {remaining:.2f}",
        )

    return allocations


def build_delivery_items(
    session: Session,
    delivery: models.OrderDelivery,
    order: models.Order,
    depot_id: Optional[int],
) -> List[models.OrderDeliveryItem]:
    delivery_items: List[models.OrderDeliveryItem] = []
    for order_item in order.items:
        if not order_item.selected:
            continue
        product = resolve_product(session, order_item)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product mapping not found for order item {order_item.product_name}",
            )
        allocations = allocate_fefo_batches(
            session=session,
            product=product,
            required_qty=float(order_item.quantity),
            depot_id=depot_id,
        )
        order_quantity = Decimal(str(order_item.quantity))
        threshold = Decimal(str(product.free_goods_threshold or 0))
        free_quantity = Decimal(str(product.free_goods_quantity or 0))
        free_total = Decimal("0")
        if threshold > 0 and free_quantity > 0 and order_quantity >= threshold:
            multiplier = (order_quantity / threshold).to_integral_value(rounding=ROUND_FLOOR)
            free_total = multiplier * free_quantity

        remaining_free = int(free_total)
        product_rate = Decimal(str(order_item.trade_price or 0))
        remaining = float(order_item.quantity)
        total_allocations = len(allocations)
        for index, allocation in enumerate(allocations):
            ledger: models.StockLedger = allocation["ledger"]
            allocated_qty = allocation["allocated"]
            allocation_decimal = Decimal(str(allocated_qty))
            free_awarded_line = 0
            if remaining_free > 0 and order_quantity > 0:
                if index == total_allocations - 1:
                    free_awarded_line = remaining_free
                else:
                    proportional = (allocation_decimal / order_quantity) * free_total
                    free_awarded_line = int(proportional.to_integral_value(rounding=ROUND_FLOOR))
                    if free_awarded_line <= 0 and proportional > 0:
                        free_awarded_line = 1
                    free_awarded_line = min(free_awarded_line, remaining_free)
                remaining_free -= free_awarded_line
            trade_amount = product_rate * allocation_decimal
            vat_amount = trade_amount * Decimal("0.15") if product_rate > 0 else Decimal("0")
            new_item = models.OrderDeliveryItem(
                delivery=delivery,
                order_item_id=order_item.id,
                product_id=product.id,
                product_name=order_item.product_name,
                legacy_code=order_item.old_code,
                new_code=order_item.new_code,
                pack_size=order_item.pack_size,
                uom="IFC",
                batch_number=allocation["batch"],
                expiry_date=allocation["expiry"],
                ordered_quantity=remaining,
                delivery_quantity=allocated_qty,
                picked_quantity=allocated_qty,
                available_stock=allocation["available"],
                free_goods_threshold=threshold if threshold > 0 else None,
                free_goods_quantity=free_quantity if free_quantity > 0 else None,
                free_goods_awarded=free_awarded_line,
                product_rate=product_rate,
                trade_amount=trade_amount,
                vat_amount=vat_amount,
                status="Allocated",
            )
            delivery_items.append(new_item)
            ledger.available_quantity = float(ledger.available_quantity or 0) - allocated_qty
            ledger.reserved_quantity = float(ledger.reserved_quantity or 0) + allocated_qty
            remaining -= allocated_qty

    return delivery_items


def get_delivery(db: Session, delivery_id: int) -> models.OrderDelivery:
    delivery = db.query(models.OrderDelivery).filter(models.OrderDelivery.id == delivery_id).first()
    if not delivery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery order not found")
    return delivery


@router.get("", response_model=schemas.OrderDeliveryListResponse)
def list_order_deliveries(
    status_filter: Optional[models.DeliveryStatusEnum] = Query(None),
    db: Session = Depends(get_db),
) -> schemas.OrderDeliveryListResponse:
    query = db.query(models.OrderDelivery)
    if status_filter:
        query = query.filter(models.OrderDelivery.status == status_filter)
    deliveries = query.order_by(models.OrderDelivery.created_at.desc()).all()
    return schemas.OrderDeliveryListResponse(data=deliveries, total=len(deliveries))


@router.get("/{delivery_id}", response_model=schemas.OrderDelivery)
def retrieve_order_delivery(delivery_id: int, db: Session = Depends(get_db)) -> schemas.OrderDelivery:
    delivery = get_delivery(db, delivery_id)
    return delivery


@router.post("/from-order/{identifier}", response_model=schemas.OrderDelivery, status_code=status.HTTP_201_CREATED)
def create_from_order(identifier: str, delivery_date: Optional[date] = None, db: Session = Depends(get_db)) -> schemas.OrderDelivery:
    order: Optional[models.Order] = None
    if identifier.isdigit():
        order = db.query(models.Order).filter(models.Order.id == int(identifier)).first()
    if not order:
        order = db.query(models.Order).filter(models.Order.order_number == identifier).first()
    if not order:
        delivery = (
            db.query(models.OrderDelivery)
            .filter(models.OrderDelivery.delivery_number == identifier)
            .first()
        )
        if delivery:
            order = delivery.order
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    delivery_number = generate_delivery_number()
    customer = None
    if order.customer_code:
        customer = db.query(models.Customer).filter(models.Customer.code == order.customer_code).first()

    delivery = models.OrderDelivery(
        order_id=order.id,
        delivery_number=delivery_number,
        ship_to_party=customer.ship_to_party if customer else order.customer_name,
        sold_to_party=customer.sold_to_party if customer else order.customer_name,
        delivery_date=delivery_date or order.delivery_date,
        warehouse_no=order.depot_code,
        status=models.DeliveryStatusEnum.DRAFT,
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)
    return delivery


@router.post("", response_model=schemas.OrderDelivery, status_code=status.HTTP_201_CREATED)
def create_order_delivery(payload: schemas.OrderDeliveryCreate, db: Session = Depends(get_db)) -> schemas.OrderDelivery:
    delivery_number = payload.delivery_number or generate_delivery_number()
    delivery = models.OrderDelivery(
        order_id=payload.order_id,
        delivery_number=delivery_number,
        ship_to_party=payload.ship_to_party,
        sold_to_party=payload.sold_to_party,
        delivery_date=payload.delivery_date,
        planned_dispatch_time=payload.planned_dispatch_time,
        vehicle_info=payload.vehicle_info,
        driver_name=payload.driver_name,
        warehouse_no=payload.warehouse_no,
        status=payload.status,
        remarks=payload.remarks,
    )
    db.add(delivery)
    db.flush()

    for item_payload in payload.items:
        item = models.OrderDeliveryItem(
            delivery_id=delivery.id,
            order_item_id=item_payload.order_item_id,
            product_id=item_payload.product_id,
            product_name=item_payload.product_name,
            legacy_code=item_payload.legacy_code,
            new_code=item_payload.new_code,
            pack_size=item_payload.pack_size,
            uom=item_payload.uom,
            batch_number=item_payload.batch_number,
            expiry_date=item_payload.expiry_date,
            ordered_quantity=item_payload.ordered_quantity,
            delivery_quantity=item_payload.delivery_quantity,
            picked_quantity=item_payload.picked_quantity,
            available_stock=item_payload.available_stock,
            status=item_payload.status or "Pending",
        )
        db.add(item)

    db.commit()
    db.refresh(delivery)
    return delivery


@router.put("/{delivery_id}", response_model=schemas.OrderDelivery)
def update_order_delivery(delivery_id: int, payload: schemas.OrderDeliveryUpdate, db: Session = Depends(get_db)) -> schemas.OrderDelivery:
    delivery = get_delivery(db, delivery_id)

    for field, value in payload.model_dump(exclude={"items"}, exclude_unset=True).items():
        setattr(delivery, field, value)

    if payload.items is not None:
        existing_items = {item.order_item_id: item for item in delivery.items}
        keep_ids = set()
        for item_payload in payload.items:
            existing = existing_items.get(item_payload.order_item_id)
            if existing:
                for key, value in item_payload.model_dump(exclude_unset=True).items():
                    setattr(existing, key, value)
                keep_ids.add(existing.id)
            else:
                new_item = models.OrderDeliveryItem(
                    delivery_id=delivery.id,
                    order_item_id=item_payload.order_item_id,
                    product_id=item_payload.product_id,
                    product_name=item_payload.product_name,
                    legacy_code=item_payload.legacy_code,
                    new_code=item_payload.new_code,
                    pack_size=item_payload.pack_size,
                    uom=item_payload.uom,
                    batch_number=item_payload.batch_number,
                    expiry_date=item_payload.expiry_date,
                    ordered_quantity=item_payload.ordered_quantity,
                    delivery_quantity=item_payload.delivery_quantity,
                    picked_quantity=item_payload.picked_quantity,
                    available_stock=item_payload.available_stock,
                    status=item_payload.status or "Pending",
                )
                db.add(new_item)
                db.flush()
                keep_ids.add(new_item.id)
        for item in list(delivery.items):
            if item.id not in keep_ids:
                db.delete(item)

    db.commit()
    db.refresh(delivery)
    return delivery


@router.delete("/{delivery_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order_delivery(delivery_id: int, db: Session = Depends(get_db)) -> None:
    delivery = get_delivery(db, delivery_id)
    for item in delivery.items:
        ledger = (
            db.query(models.StockLedger)
            .filter(models.StockLedger.product_id == item.product_id, models.StockLedger.batch == item.batch_number)
            .first()
        )
        if ledger:
            ledger.available_quantity = float(ledger.available_quantity or 0) + float(item.delivery_quantity or 0)
            ledger.reserved_quantity = max(0.0, float(ledger.reserved_quantity or 0) - float(item.delivery_quantity or 0))
    db.delete(delivery)
    db.commit()


@router.post("/{delivery_id}/advance", response_model=schemas.OrderDelivery)
def advance_delivery_status(delivery_id: int, db: Session = Depends(get_db)) -> schemas.OrderDelivery:
    delivery = get_delivery(db, delivery_id)
    order = [
        models.DeliveryStatusEnum.DRAFT,
        models.DeliveryStatusEnum.PACKING,
        models.DeliveryStatusEnum.LOADING,
        models.DeliveryStatusEnum.SHIPPED,
        models.DeliveryStatusEnum.DELIVERED,
    ]
    try:
        idx = order.index(delivery.status)
        if idx < len(order) - 1:
            delivery.status = order[idx + 1]
            if delivery.status == models.DeliveryStatusEnum.DELIVERED:
                delivery.remarks = (delivery.remarks or "") + "\nDelivered on " + datetime.utcnow().isoformat()
        db.commit()
    except ValueError:
        pass
    db.refresh(delivery)
    return delivery


@router.get("/tracking/{identifier}", response_model=schemas.DeliveryTrackingResponse)
def track_order(identifier: str, db: Session = Depends(get_db)) -> schemas.DeliveryTrackingResponse:
    order: Optional[models.Order] = None
    delivery: Optional[models.OrderDelivery] = None

    if identifier.isdigit():
        order = db.query(models.Order).filter(models.Order.id == int(identifier)).first()
    if not order:
        order = db.query(models.Order).filter(models.Order.order_number == identifier).first()
    if not order:
        delivery = db.query(models.OrderDelivery).filter(models.OrderDelivery.delivery_number == identifier).first()
        if delivery:
            order = delivery.order
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if not delivery:
        delivery = (
            db.query(models.OrderDelivery)
            .filter(models.OrderDelivery.order_id == order.id)
            .order_by(models.OrderDelivery.created_at.desc())
            .first()
        )

    steps: List[schemas.DeliveryProgressNode] = []
    # Sales Order
    steps.append(
        schemas.DeliveryProgressNode(
            key="sales_order",
            label="Sales Order",
            status="completed" if order.status != models.OrderStatusEnum.DRAFT else "pending",
            timestamp=order.created_at,
        )
    )
    # Delivery Order
    if delivery:
        steps.append(
            schemas.DeliveryProgressNode(
                key="order_delivery",
                label="Delivery Order",
                status="completed",
                timestamp=delivery.created_at,
            )
        )
    else:
        steps.append(
            schemas.DeliveryProgressNode(
                key="order_delivery",
                label="Delivery Order",
                status="pending",
            )
        )
    # Picking
    if delivery:
        picking_status = "pending"
        if delivery.status in [models.DeliveryStatusEnum.PACKING, models.DeliveryStatusEnum.LOADING, models.DeliveryStatusEnum.SHIPPED, models.DeliveryStatusEnum.DELIVERED]:
            picking_status = "completed"
        if delivery.status == models.DeliveryStatusEnum.PACKING:
            picking_status = "current"
        steps.append(
            schemas.DeliveryProgressNode(
                key="picking",
                label="Picking",
                status=picking_status,
                timestamp=delivery.updated_at if picking_status != "pending" else None,
            )
        )
    else:
        steps.append(
            schemas.DeliveryProgressNode(key="picking", label="Picking", status="pending")
        )
    # Loading
    if delivery:
        loading_status = "pending"
        if delivery.status in [models.DeliveryStatusEnum.LOADING, models.DeliveryStatusEnum.SHIPPED, models.DeliveryStatusEnum.DELIVERED]:
            loading_status = "completed" if delivery.status != models.DeliveryStatusEnum.LOADING else "current"
        steps.append(
            schemas.DeliveryProgressNode(
                key="loading",
                label="Loading",
                status=loading_status,
                timestamp=delivery.updated_at if loading_status != "pending" else None,
            )
        )
    else:
        steps.append(
            schemas.DeliveryProgressNode(key="loading", label="Loading", status="pending")
        )
    # Delivered
    if delivery:
        delivered_status = "pending"
        if delivery.status == models.DeliveryStatusEnum.DELIVERED:
            delivered_status = "completed"
        steps.append(
            schemas.DeliveryProgressNode(
                key="delivered",
                label="Delivered",
                status=delivered_status,
                timestamp=delivery.updated_at if delivered_status == "completed" else None,
            )
        )
    else:
        steps.append(
            schemas.DeliveryProgressNode(key="delivered", label="Delivered", status="pending")
        )
    # Collected
    if delivery and delivery.status == models.DeliveryStatusEnum.DELIVERED:
        steps.append(
            schemas.DeliveryProgressNode(
                key="collected",
                label="Collected",
                status="pending",
            )
        )
    else:
        steps.append(
            schemas.DeliveryProgressNode(key="collected", label="Collected", status="pending")
        )

    return schemas.DeliveryTrackingResponse(
        order_id=order.id,
        order_number=order.order_number,
        delivery_number=delivery.delivery_number if delivery else None,
        current_status=delivery.status if delivery else models.DeliveryStatusEnum.DRAFT,
        steps=steps,
    )
