from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

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
) -> schemas.ProductReceiptListResponse:
    query = db.query(models.ProductReceipt)
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


def post_to_stock_ledger(db: Session, receipt: models.ProductReceipt) -> None:
    for item in receipt.items:
        if not item.item_code:
            continue
        product = (
            db.query(models.Product)
            .filter((models.Product.code == item.item_code) | (models.Product.new_code == item.item_code) | (models.Product.old_code == item.item_code))
            .first()
        )
        if not product:
            continue
        ledger = (
            db.query(models.StockLedger)
            .filter(
                models.StockLedger.product_id == product.id,
                models.StockLedger.depot_id == receipt.target_depot_id,
                models.StockLedger.batch == item.batch_number,
            )
            .first()
        )
        if ledger:
            ledger.quantity = (ledger.quantity or 0) + (item.depot_quantity or 0)
            ledger.available_quantity = (ledger.available_quantity or 0) + (item.depot_quantity or 0)
            ledger.expiry_date = item.expiry_date or ledger.expiry_date
        else:
            ledger = models.StockLedger(
                product_id=product.id,
                depot_id=receipt.target_depot_id,
                batch=item.batch_number,
                storage_type=receipt.source_type.value,
                quantity=item.depot_quantity or 0,
                reserved_quantity=0,
                available_quantity=item.depot_quantity or 0,
                expiry_date=item.expiry_date,
            )
            db.add(ledger)


@router.post("/{receipt_id}/approve", response_model=schemas.ProductReceiptApprovalResponse)
def approve_receipt(receipt_id: int, db: Session = Depends(get_db)) -> schemas.ProductReceiptApprovalResponse:
    receipt = db.query(models.ProductReceipt).filter(models.ProductReceipt.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    if receipt.status == models.ProductReceiptStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Receipt already approved")
    if not receipt.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Receipt has no items")

    receipt.status = models.ProductReceiptStatus.APPROVED
    post_to_stock_ledger(db, receipt)
    db.commit()
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
