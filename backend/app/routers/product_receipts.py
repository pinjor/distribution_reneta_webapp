from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.core.deps import require_auth
from app.core.depot_scope import apply_depot_id_filter
from app.services.stock_movement_service import StockMovementService

router = APIRouter()


def generate_receipt_number(prefix: str = "RCV") -> str:
    stamp = datetime.utcnow()
    return f"{prefix}-{stamp.strftime('%Y%m%d')}-{stamp.strftime('%H%M%S')}{stamp.microsecond // 1000:03d}"


def map_item_payload(item: schemas.ProductReceiptItemCreate, receipt: models.ProductReceipt) -> models.ProductReceiptItem:
    return models.ProductReceiptItem(
        receipt=receipt,
        legacy_code=item.legacy_code,
        item_code=item.item_code,
        item_name=item.item_name,
        pack_size=item.pack_size,
        uom=item.uom,
        expiry_date=item.expiry_date,
        batch_number=item.batch_number,
        number_of_ifc=item.number_of_ifc,
        depot_quantity=item.depot_quantity,
        ifc_per_full_mc=item.ifc_per_full_mc,
        number_of_full_mc=item.number_of_full_mc,
        ifc_in_loose_mc=item.ifc_in_loose_mc,
    )


@router.get("", response_model=schemas.ProductReceiptListResponse)
def list_receipts(
    source_type: Optional[models.ReceiptSourceEnum] = Query(None),
    status_filter: Optional[models.ProductReceiptStatus] = Query(None),
    db: Session = Depends(get_db),
    user: models.Employee = Depends(require_auth),
) -> schemas.ProductReceiptListResponse:
    query = db.query(models.ProductReceipt)
    query = apply_depot_id_filter(query, user, models.ProductReceipt.target_depot_id)
    if source_type:
        query = query.filter(models.ProductReceipt.source_type == source_type)
    if status_filter:
        query = query.filter(models.ProductReceipt.status == status_filter)

    receipts = query.order_by(models.ProductReceipt.created_at.desc()).all()
    return schemas.ProductReceiptListResponse(data=receipts, total=len(receipts))


@router.get("/{receipt_id}", response_model=schemas.ProductReceipt)
def get_receipt(receipt_id: int, db: Session = Depends(get_db)) -> schemas.ProductReceipt:
    receipt = db.query(models.ProductReceipt).filter(models.ProductReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    return receipt


@router.post("", response_model=schemas.ProductReceipt, status_code=status.HTTP_201_CREATED)
def create_receipt(payload: schemas.ProductReceiptCreate, db: Session = Depends(get_db)) -> schemas.ProductReceipt:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Receipt requires at least one item")

    receipt_number = payload.receipt_number or generate_receipt_number()

    receipt = models.ProductReceipt(
        receipt_number=receipt_number,
        source_type=payload.source_type,
        target_depot_id=payload.target_depot_id,
        to_address=payload.to_address,
        tfa_number=payload.tfa_number,
        iso_number=payload.iso_number,
        shipment_mode=payload.shipment_mode,
        delivery_person=payload.delivery_person,
        vehicle_info=payload.vehicle_info,
        issued_date=payload.issued_date,
        vat_number=payload.vat_number,
        remarks=payload.remarks,
        status=models.ProductReceiptStatus.DRAFT,
    )

    for item_payload in payload.items:
        receipt.items.append(map_item_payload(item_payload, receipt))

    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return receipt


@router.put("/{receipt_id}", response_model=schemas.ProductReceipt)
def update_receipt(receipt_id: int, payload: schemas.ProductReceiptUpdate, db: Session = Depends(get_db)) -> schemas.ProductReceipt:
    receipt = db.query(models.ProductReceipt).filter(models.ProductReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    if receipt.status != models.ProductReceiptStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft receipts can be edited")

    for field, value in payload.model_dump(exclude={"items"}, exclude_unset=True).items():
        setattr(receipt, field, value)

    if payload.items is not None:
        existing_items = {item.id: item for item in receipt.items}
        keep_ids = set()
        for item_payload in payload.items:
            if item_payload.id and item_payload.id in existing_items:
                item = existing_items[item_payload.id]
                for field, value in item_payload.model_dump(exclude_unset=True).items():
                    setattr(item, field, value)
                keep_ids.add(item.id)
            else:
                new_item = map_item_payload(item_payload, receipt)
                db.add(new_item)
                db.flush()
                keep_ids.add(new_item.id)
        for existing_id, existing_item in list(existing_items.items()):
            if existing_id not in keep_ids:
                receipt.items.remove(existing_item)
                db.delete(existing_item)

    db.commit()
    db.refresh(receipt)
    return receipt


@router.delete("/{receipt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_receipt(receipt_id: int, db: Session = Depends(get_db)) -> None:
    receipt = db.query(models.ProductReceipt).filter(models.ProductReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    if receipt.status != models.ProductReceiptStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only draft receipts can be deleted")
    db.delete(receipt)
    db.commit()


def _resolve_receipt_product(db: Session, item_code: Optional[str]) -> models.Product:
    code = (item_code or "").strip()
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown product")
    products = (
        db.query(models.Product)
        .filter(
            (models.Product.code == code)
            | (models.Product.new_code == code)
            | (models.Product.old_code == code)
        )
        .order_by(models.Product.id)
        .all()
    )
    if len(products) != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown product")
    return products[0]


def _receipt_postings(db: Session, receipt: models.ProductReceipt) -> list[tuple]:
    if not receipt.target_depot_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid depot")
    depot = db.query(models.Depot).filter(models.Depot.id == receipt.target_depot_id).first()
    if depot is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid depot")

    postings = []
    for item in receipt.items:
        product = _resolve_receipt_product(db, item.item_code)
        batch = (item.batch_number or "").strip()
        if not batch:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid batch")
        quantity = Decimal(str(item.depot_quantity or 0))
        if quantity <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid quantity")
        postings.append((product.id, depot.id, batch, quantity, item.expiry_date))
    return postings


@router.post("/{receipt_id}/approve", response_model=schemas.ProductReceiptApprovalResponse)
def approve_receipt(receipt_id: int, db: Session = Depends(get_db)) -> schemas.ProductReceiptApprovalResponse:
    receipt = (
        db.query(models.ProductReceipt)
        .filter(models.ProductReceipt.id == receipt_id)
        .with_for_update()
        .first()
    )
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    if receipt.status == models.ProductReceiptStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Receipt already approved")
    if receipt.status != models.ProductReceiptStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid receipt status")
    if not receipt.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Receipt has no items")

    postings = _receipt_postings(db, receipt)
    try:
        for product_id, depot_id, batch, quantity, expiry_date in postings:
            StockMovementService.receive(
                db,
                product_id=product_id,
                depot_id=depot_id,
                batch_no=batch,
                quantity=quantity,
                expiry_date=expiry_date,
            )
        receipt.status = models.ProductReceiptStatus.APPROVED
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Receipt approval failed")

    db.refresh(receipt)
    return schemas.ProductReceiptApprovalResponse(
        id=receipt.id,
        receipt_number=receipt.receipt_number,
        status=receipt.status,
        approved_at=datetime.utcnow(),
    )


@router.get("/{receipt_id}/report", response_model=schemas.ProductReceipt)
def get_receipt_report(receipt_id: int, db: Session = Depends(get_db)) -> schemas.ProductReceipt:
    receipt = db.query(models.ProductReceipt).filter(models.ProductReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    return receipt
