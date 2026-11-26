"""Export delivery Draft documents. No stock, billing, customs, or dispatch."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.deps import require_auth, require_role
from app.core.depot_scope import apply_depot_id_filter, assign_depot_for_write, hide_foreign_depot
from app.core.draft_modules import require_export_schema
from app.isolated_runtime import isolated_workflow_active
from app.models import Employee, ExportDelivery, ExportDeliveryItem, Product
from app.services.draft_product_eligibility import require_eligible_products
from app.services.draft_document_lock import (
    abort_unlocked,
    commit_draft_write,
    require_draft_for_write,
)
from app import schemas

router = APIRouter()
WRITE_ROLES = require_role("admin", "manager")
DRAFT_STATUS = "Draft"


def require_export_draft_writes(user: Employee = Depends(WRITE_ROLES)) -> Employee:
    if not get_settings().export_draft_writes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Export draft writes are not enabled. "
                "Set EXPORT_DRAFT_WRITES=yes after product authorization is approved."
            ),
        )
    return user


def generate_delivery_number(db: Session) -> str:
    stamp = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"EX-{stamp}-"
    existing = (
        db.query(ExportDelivery)
        .filter(ExportDelivery.delivery_number.like(f"{prefix}%"))
        .all()
    )
    numbers = []
    for row in existing:
        try:
            numbers.append(int(row.delivery_number.split("-")[-1]))
        except (ValueError, IndexError):
            continue
    next_num = max(numbers) + 1 if numbers else 1
    code = f"{prefix}{next_num:04d}"
    while db.query(ExportDelivery).filter(ExportDelivery.delivery_number == code).first():
        next_num += 1
        code = f"{prefix}{next_num:04d}"
    return code


def _number_taken(db: Session, number: str, exclude_id: Optional[int] = None) -> bool:
    query = db.query(ExportDelivery).filter(ExportDelivery.delivery_number == number)
    if exclude_id is not None:
        query = query.filter(ExportDelivery.id != exclude_id)
    return query.first() is not None


def _require_products(db: Session, items: List[schemas.ExportDeliveryItemCreate]) -> dict:
    # Isolated F.4B.2-DEV app enforces proposed flags. Production remains existence-only.
    if isolated_workflow_active():
        return require_eligible_products(
            db,
            [item.product_id for item in items],
            "export",
        )
    ids = {item.product_id for item in items}
    rows = db.query(Product).filter(Product.id.in_(ids)).all()
    found = {row.id: row for row in rows}
    missing = sorted(ids - set(found))
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid product_id: {', '.join(str(i) for i in missing)}",
        )
    return found


def _line_total(item: ExportDeliveryItem) -> Decimal:
    return Decimal(str(item.quantity or 0)) * Decimal(str(item.unit_price or 0))


def _serialize(delivery: ExportDelivery, include_items: bool) -> dict:
    items = list(delivery.items or [])
    total_qty = sum((Decimal(str(item.quantity or 0)) for item in items), Decimal("0"))
    total_value = sum((_line_total(item) for item in items), Decimal("0"))
    payload = {
        "id": delivery.id,
        "delivery_number": delivery.delivery_number,
        "depot_id": delivery.depot_id,
        "status": delivery.status,
        "delivery_date": delivery.delivery_date,
        "destination_country": delivery.destination_country,
        "port_of_loading": delivery.port_of_loading,
        "port_of_discharge": delivery.port_of_discharge,
        "shipping_line": delivery.shipping_line,
        "container_number": delivery.container_number,
        "bl_number": delivery.bl_number,
        "invoice_number": delivery.invoice_number,
        "lc_number": delivery.lc_number,
        "incoterms": delivery.incoterms,
        "payment_terms": delivery.payment_terms,
        "remarks": delivery.remarks,
        "created_by": delivery.created_by,
        "created_at": delivery.created_at,
        "updated_at": delivery.updated_at,
        "total_items": len(items),
        "total_quantity": total_qty,
        "total_value": total_value,
    }
    if include_items:
        payload["items"] = [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else None,
                "batch_number": item.batch_number,
                "expiry_date": item.expiry_date,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "line_total": _line_total(item),
                "hsn_code": item.hsn_code,
                "created_at": item.created_at,
            }
            for item in items
        ]
    return payload


def _load(db: Session, delivery_id: int, user: Employee) -> ExportDelivery:
    delivery = (
        db.query(ExportDelivery)
        .options(joinedload(ExportDelivery.items).joinedload(ExportDeliveryItem.product))
        .filter(ExportDelivery.id == delivery_id)
        .first()
    )
    if not delivery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    hide_foreign_depot(user, delivery.depot_id)
    return delivery


def _replace_items(
    db: Session,
    delivery: ExportDelivery,
    items: List[schemas.ExportDeliveryItemCreate],
) -> None:
    delivery.items.clear()
    db.flush()
    for item in items:
        delivery.items.append(
            ExportDeliveryItem(
                product_id=item.product_id,
                batch_number=item.batch_number,
                expiry_date=item.expiry_date,
                quantity=item.quantity,
                unit_price=item.unit_price,
                hsn_code=item.hsn_code,
            )
        )


@router.get("", response_model=List[schemas.ExportDeliveryResponse])
def list_export_deliveries(
    skip: int = 0,
    limit: int = 200,
    q: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(require_export_schema),
    user: Employee = Depends(require_auth),
):
    query = db.query(ExportDelivery).options(joinedload(ExportDelivery.items))
    query = apply_depot_id_filter(query, user, ExportDelivery.depot_id)
    if status_filter:
        query = query.filter(ExportDelivery.status == status_filter)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (ExportDelivery.delivery_number.ilike(like))
            | (ExportDelivery.destination_country.ilike(like))
            | (ExportDelivery.port_of_loading.ilike(like))
            | (ExportDelivery.port_of_discharge.ilike(like))
            | (ExportDelivery.shipping_line.ilike(like))
            | (ExportDelivery.container_number.ilike(like))
        )
    rows = query.order_by(ExportDelivery.id.desc()).offset(skip).limit(limit).all()
    return [schemas.ExportDeliveryResponse(**_serialize(row, include_items=False)) for row in rows]


@router.get("/{delivery_id}", response_model=schemas.ExportDeliveryDetailResponse)
def get_export_delivery(
    delivery_id: int,
    db: Session = Depends(require_export_schema),
    user: Employee = Depends(require_auth),
):
    delivery = _load(db, delivery_id, user)
    return schemas.ExportDeliveryDetailResponse(**_serialize(delivery, include_items=True))


@router.post(
    "",
    response_model=schemas.ExportDeliveryDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_export_delivery(
    payload: schemas.ExportDeliveryCreate,
    db: Session = Depends(require_export_schema),
    user: Employee = Depends(require_export_draft_writes),
):
    depot_id = assign_depot_for_write(user, payload.depot_id)
    if depot_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="depot_id is required. The authenticated user has no depot assignment.",
        )
    _require_products(db, payload.items)
    number = (payload.delivery_number or "").strip() or generate_delivery_number(db)
    if _number_taken(db, number):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Delivery number {number} already exists",
        )
    now = datetime.utcnow()
    delivery = ExportDelivery(
        delivery_number=number,
        depot_id=depot_id,
        status=DRAFT_STATUS,
        delivery_date=payload.delivery_date,
        destination_country=payload.destination_country,
        port_of_loading=payload.port_of_loading,
        port_of_discharge=payload.port_of_discharge,
        shipping_line=payload.shipping_line,
        container_number=payload.container_number,
        bl_number=payload.bl_number,
        invoice_number=payload.invoice_number,
        lc_number=payload.lc_number,
        incoterms=payload.incoterms,
        payment_terms=payload.payment_terms,
        remarks=payload.remarks,
        created_by=user.id,
        created_at=now,
        updated_at=now,
    )
    db.add(delivery)
    db.flush()
    _replace_items(db, delivery, payload.items)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Delivery number already exists",
        )
    db.refresh(delivery)
    return schemas.ExportDeliveryDetailResponse(
        **_serialize(_load(db, delivery.id, user), include_items=True)
    )


@router.put("/{delivery_id}", response_model=schemas.ExportDeliveryDetailResponse)
def update_export_delivery(
    delivery_id: int,
    payload: schemas.ExportDeliveryUpdate,
    db: Session = Depends(require_export_schema),
    user: Employee = Depends(require_export_draft_writes),
):
    try:
        delivery = require_draft_for_write(db, ExportDelivery, delivery_id, user)
        depot_id = assign_depot_for_write(
            user, payload.depot_id if payload.depot_id is not None else delivery.depot_id
        )
        if depot_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="depot_id is required. The authenticated user has no depot assignment.",
            )
        hide_foreign_depot(user, depot_id)
        _require_products(db, payload.items)
        number = (payload.delivery_number or delivery.delivery_number).strip()
        if number != delivery.delivery_number and _number_taken(db, number, exclude_id=delivery.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Delivery number {number} already exists",
            )
        delivery.delivery_number = number
        delivery.depot_id = depot_id
        delivery.delivery_date = payload.delivery_date
        delivery.destination_country = payload.destination_country
        delivery.port_of_loading = payload.port_of_loading
        delivery.port_of_discharge = payload.port_of_discharge
        delivery.shipping_line = payload.shipping_line
        delivery.container_number = payload.container_number
        delivery.bl_number = payload.bl_number
        delivery.invoice_number = payload.invoice_number
        delivery.lc_number = payload.lc_number
        delivery.incoterms = payload.incoterms
        delivery.payment_terms = payload.payment_terms
        delivery.remarks = payload.remarks
        delivery.updated_at = datetime.utcnow()
        _replace_items(db, delivery, payload.items)
        commit_draft_write(db)
    except HTTPException:
        abort_unlocked(db)
        raise
    except IntegrityError:
        abort_unlocked(db)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Delivery number already exists",
        )
    except SQLAlchemyError:
        abort_unlocked(db)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The document could not be saved",
        )
    return schemas.ExportDeliveryDetailResponse(
        **_serialize(_load(db, delivery.id, user), include_items=True)
    )
