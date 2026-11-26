"""Sample/Gift delivery Draft documents. No stock, billing, or approval."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.deps import require_auth, require_role
from app.core.depot_scope import apply_depot_id_filter, assign_depot_for_write, hide_foreign_depot
from app.core.draft_modules import require_sample_gift_schema
from app.isolated_runtime import isolated_workflow_active
from app.models import Employee, Product, SampleGiftDelivery, SampleGiftDeliveryItem
from app.services.draft_product_eligibility import (
    category_for_sample_gift,
    require_eligible_products,
)
from app.services.draft_document_lock import (
    abort_unlocked,
    commit_draft_write,
    require_draft_for_write,
)
from app import schemas

router = APIRouter()
WRITE_ROLES = require_role("admin", "manager")
DRAFT_STATUS = "Draft"


def require_sample_gift_draft_writes(user: Employee = Depends(WRITE_ROLES)) -> Employee:
    """Admin/manager writes, plus explicit env activation (off in production by default)."""
    if not get_settings().sample_gift_draft_writes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Sample/Gift draft writes are not enabled. "
                "Set SAMPLE_GIFT_DRAFT_WRITES=yes after product authorization is approved."
            ),
        )
    return user


def generate_delivery_number(db: Session) -> str:
    stamp = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"SG-{stamp}-"
    existing = (
        db.query(SampleGiftDelivery)
        .filter(SampleGiftDelivery.delivery_number.like(f"{prefix}%"))
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
    while db.query(SampleGiftDelivery).filter(SampleGiftDelivery.delivery_number == code).first():
        next_num += 1
        code = f"{prefix}{next_num:04d}"
    return code


def _number_taken(db: Session, number: str, exclude_id: Optional[int] = None) -> bool:
    query = db.query(SampleGiftDelivery).filter(SampleGiftDelivery.delivery_number == number)
    if exclude_id is not None:
        query = query.filter(SampleGiftDelivery.id != exclude_id)
    return query.first() is not None


def _require_products(
    db: Session,
    items: List[schemas.SampleGiftDeliveryItemCreate],
    document_kind: str,
) -> dict:
    # Isolated F.4B.2-DEV app enforces proposed flags. Production remains existence-only.
    if isolated_workflow_active():
        return require_eligible_products(
            db,
            [item.product_id for item in items],
            category_for_sample_gift(document_kind),
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


def _serialize(delivery: SampleGiftDelivery, include_items: bool) -> dict:
    items = list(delivery.items or [])
    total_qty = sum((Decimal(str(item.quantity or 0)) for item in items), Decimal("0"))
    payload = {
        "id": delivery.id,
        "delivery_number": delivery.delivery_number,
        "depot_id": delivery.depot_id,
        "document_kind": delivery.document_kind,
        "gift_type": delivery.gift_type,
        "occasion": delivery.occasion,
        "status": delivery.status,
        "delivery_date": delivery.delivery_date,
        "recipient_name": delivery.recipient_name,
        "recipient_type": delivery.recipient_type,
        "recipient_address": delivery.recipient_address,
        "recipient_phone": delivery.recipient_phone,
        "recipient_email": delivery.recipient_email,
        "remarks": delivery.remarks,
        "created_by": delivery.created_by,
        "created_at": delivery.created_at,
        "updated_at": delivery.updated_at,
        "total_items": len(items),
        "total_quantity": total_qty,
    }
    if include_items:
        payload["items"] = [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product.name if item.product else None,
                "quantity": item.quantity,
                "gift_type": item.gift_type,
                "created_at": item.created_at,
            }
            for item in items
        ]
    return payload


def _load(db: Session, delivery_id: int, user: Employee) -> SampleGiftDelivery:
    delivery = (
        db.query(SampleGiftDelivery)
        .options(joinedload(SampleGiftDelivery.items).joinedload(SampleGiftDeliveryItem.product))
        .filter(SampleGiftDelivery.id == delivery_id)
        .first()
    )
    if not delivery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    hide_foreign_depot(user, delivery.depot_id)
    return delivery


def _replace_items(
    db: Session,
    delivery: SampleGiftDelivery,
    items: List[schemas.SampleGiftDeliveryItemCreate],
    products: dict,
) -> None:
    delivery.items.clear()
    db.flush()
    for item in items:
        delivery.items.append(
            SampleGiftDeliveryItem(
                product_id=item.product_id,
                quantity=item.quantity,
                gift_type=item.gift_type,
            )
        )


@router.get("", response_model=List[schemas.SampleGiftDeliveryResponse])
def list_sample_gift_deliveries(
    skip: int = 0,
    limit: int = 200,
    q: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(require_sample_gift_schema),
    user: Employee = Depends(require_auth),
):
    query = db.query(SampleGiftDelivery).options(joinedload(SampleGiftDelivery.items))
    query = apply_depot_id_filter(query, user, SampleGiftDelivery.depot_id)
    if status_filter:
        query = query.filter(SampleGiftDelivery.status == status_filter)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (SampleGiftDelivery.delivery_number.ilike(like))
            | (SampleGiftDelivery.recipient_name.ilike(like))
            | (SampleGiftDelivery.recipient_type.ilike(like))
            | (SampleGiftDelivery.gift_type.ilike(like))
            | (SampleGiftDelivery.document_kind.ilike(like))
        )
    rows = query.order_by(SampleGiftDelivery.id.desc()).offset(skip).limit(limit).all()
    return [schemas.SampleGiftDeliveryResponse(**_serialize(row, include_items=False)) for row in rows]


@router.get("/{delivery_id}", response_model=schemas.SampleGiftDeliveryDetailResponse)
def get_sample_gift_delivery(
    delivery_id: int,
    db: Session = Depends(require_sample_gift_schema),
    user: Employee = Depends(require_auth),
):
    delivery = _load(db, delivery_id, user)
    return schemas.SampleGiftDeliveryDetailResponse(**_serialize(delivery, include_items=True))


@router.post(
    "",
    response_model=schemas.SampleGiftDeliveryDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sample_gift_delivery(
    payload: schemas.SampleGiftDeliveryCreate,
    db: Session = Depends(require_sample_gift_schema),
    user: Employee = Depends(require_sample_gift_draft_writes),
):
    depot_id = assign_depot_for_write(user, payload.depot_id)
    if depot_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="depot_id is required. The authenticated user has no depot assignment.",
        )
    products = _require_products(db, payload.items, payload.document_kind)
    number = (payload.delivery_number or "").strip() or generate_delivery_number(db)
    if _number_taken(db, number):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Delivery number {number} already exists",
        )
    now = datetime.utcnow()
    delivery = SampleGiftDelivery(
        delivery_number=number,
        depot_id=depot_id,
        document_kind=payload.document_kind,
        gift_type=payload.gift_type,
        occasion=payload.occasion,
        status=DRAFT_STATUS,
        delivery_date=payload.delivery_date,
        recipient_name=payload.recipient_name,
        recipient_type=payload.recipient_type,
        recipient_address=payload.recipient_address,
        recipient_phone=payload.recipient_phone,
        recipient_email=payload.recipient_email,
        remarks=payload.remarks,
        created_by=user.id,
        created_at=now,
        updated_at=now,
    )
    db.add(delivery)
    db.flush()
    _replace_items(db, delivery, payload.items, products)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Delivery number already exists",
        )
    db.refresh(delivery)
    return schemas.SampleGiftDeliveryDetailResponse(
        **_serialize(_load(db, delivery.id, user), include_items=True)
    )


@router.put("/{delivery_id}", response_model=schemas.SampleGiftDeliveryDetailResponse)
def update_sample_gift_delivery(
    delivery_id: int,
    payload: schemas.SampleGiftDeliveryUpdate,
    db: Session = Depends(require_sample_gift_schema),
    user: Employee = Depends(require_sample_gift_draft_writes),
):
    try:
        delivery = require_draft_for_write(db, SampleGiftDelivery, delivery_id, user)
        depot_id = assign_depot_for_write(
            user, payload.depot_id if payload.depot_id is not None else delivery.depot_id
        )
        if depot_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="depot_id is required. The authenticated user has no depot assignment.",
            )
        hide_foreign_depot(user, depot_id)
        products = _require_products(db, payload.items, payload.document_kind)
        number = (payload.delivery_number or delivery.delivery_number).strip()
        if number != delivery.delivery_number and _number_taken(db, number, exclude_id=delivery.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Delivery number {number} already exists",
            )
        delivery.delivery_number = number
        delivery.depot_id = depot_id
        delivery.document_kind = payload.document_kind
        delivery.gift_type = payload.gift_type
        delivery.occasion = payload.occasion
        delivery.delivery_date = payload.delivery_date
        delivery.recipient_name = payload.recipient_name
        delivery.recipient_type = payload.recipient_type
        delivery.recipient_address = payload.recipient_address
        delivery.recipient_phone = payload.recipient_phone
        delivery.recipient_email = payload.recipient_email
        delivery.remarks = payload.remarks
        delivery.updated_at = datetime.utcnow()
        _replace_items(db, delivery, payload.items, products)
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
    return schemas.SampleGiftDeliveryDetailResponse(
        **_serialize(_load(db, delivery.id, user), include_items=True)
    )
