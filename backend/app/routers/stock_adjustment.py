from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database import get_db
from app.models import Depot, Product, StockAdjustment, StockAdjustmentItem, Employee
from app.schemas import StockAdjustmentCreate, StockAdjustment as StockAdjustmentSchema
from app.core.deps import require_auth
from app.core.depot_scope import apply_depot_id_filter
from app.services.stock_movement_service import StockMovementService

router = APIRouter()

def generate_adjustment_number(db: Session) -> str:
    """Generate a unique adjustment number in format ADJ-YYYYMMDD-XXXX"""
    today = date.today()
    prefix = f"ADJ{today.strftime('%Y%m%d')}"
    
    # Find existing adjustments with same prefix
    existing = db.query(StockAdjustment).filter(
        StockAdjustment.adjustment_number.like(f"{prefix}%")
    ).all()
    
    if existing:
        # Extract sequence numbers
        seq_numbers = []
        for adj in existing:
            try:
                seq = int(adj.adjustment_number.split("-")[-1])
                seq_numbers.append(seq)
            except (ValueError, IndexError):
                continue
        
        next_seq = max(seq_numbers) + 1 if seq_numbers else 1
    else:
        next_seq = 1
    
    return f"{prefix}-{next_seq:04d}"

@router.get("/", response_model=List[StockAdjustmentSchema])
def get_stock_adjustments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    """Get all stock adjustments"""
    query = apply_depot_id_filter(
        db.query(StockAdjustment).options(
            joinedload(StockAdjustment.items).joinedload(StockAdjustmentItem.product),
            joinedload(StockAdjustment.depot),
        ),
        user,
        StockAdjustment.depot_id,
    )
    adjustments = query.offset(skip).limit(limit).all()
    return adjustments

@router.post("/", response_model=StockAdjustmentSchema, status_code=status.HTTP_201_CREATED)
def create_stock_adjustment(adjustment: StockAdjustmentCreate, db: Session = Depends(get_db)):
    """Create a new stock adjustment"""
    if not adjustment.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one adjustment item is required"
        )
    initial_status = _require_pending_on_create(adjustment.status)
    _require_direction(adjustment.adjustment_type, [Decimal(str(item.quantity_change)) for item in adjustment.items])

    # Generate adjustment number
    adjustment_number = generate_adjustment_number(db)
    
    # Create adjustment
    db_adjustment = StockAdjustment(
        adjustment_number=adjustment_number,
        adjustment_date=adjustment.adjustment_date,
        depot_id=adjustment.depot_id,
        adjustment_type=adjustment.adjustment_type,
        reason=adjustment.reason,
        status=initial_status,
    )
    
    db.add(db_adjustment)
    db.flush()  # Get the ID without committing
    
    # Create adjustment items
    for item in adjustment.items:
        db_item = StockAdjustmentItem(
            adjustment_id=db_adjustment.id,
            product_id=item.product_id,
            batch=item.batch,
            quantity_change=item.quantity_change,
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_adjustment)
    
    return db_adjustment


def _get_adjustment_or_404(db: Session, adjustment_id: int, user: Employee) -> StockAdjustment:
    query = apply_depot_id_filter(
        db.query(StockAdjustment).options(
            joinedload(StockAdjustment.items).joinedload(StockAdjustmentItem.product),
            joinedload(StockAdjustment.depot),
        ),
        user,
        StockAdjustment.depot_id,
    )
    adjustment = query.filter(StockAdjustment.id == adjustment_id).first()
    if not adjustment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adjustment not found")
    return adjustment


def _is_pending(status_value: str | None) -> bool:
    return (status_value or "").strip().lower() == "pending"


def _require_pending_on_create(status_value: str | None) -> str:
    """New documents start as Pending. A client cannot choose a final status."""
    if status_value is None or not str(status_value).strip() or _is_pending(status_value):
        return "Pending"
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid adjustment status")


_DECREASE_TYPES = {"write off", "damaged", "expired"}


def _require_direction(adjustment_type: str | None, changes: list[Decimal]) -> None:
    """Reject a type whose stored signs do not match its direction. Do not flip signs."""
    key = (adjustment_type or "").strip().lower()
    if key == "found":
        required = "positive"
    elif key in _DECREASE_TYPES:
        required = "negative"
    elif key == "correction":
        required = "either"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid adjustment type")
    for change in changes:
        if change == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid quantity")
        if required == "positive" and change < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid adjustment direction")
        if required == "negative" and change > 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid adjustment direction")


def _validate_adjustment_lines(db: Session, adjustment: StockAdjustment) -> None:
    if not adjustment.depot_id or db.query(Depot).filter(Depot.id == adjustment.depot_id).first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Depot not found")
    if not adjustment.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one adjustment item is required",
        )
    for item in adjustment.items:
        if not item.product_id or db.query(Product).filter(Product.id == item.product_id).first() is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        if not (item.batch or "").strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Batch not found")
        change = Decimal(str(item.quantity_change if item.quantity_change is not None else 0))
        if change == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid quantity")
    _require_direction(
        adjustment.adjustment_type,
        [Decimal(str(item.quantity_change)) for item in adjustment.items],
    )


@router.get("/{adjustment_id}", response_model=StockAdjustmentSchema)
def get_stock_adjustment(
    adjustment_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    return _get_adjustment_or_404(db, adjustment_id, user)


@router.delete("/{adjustment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stock_adjustment(
    adjustment_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    adjustment = _get_adjustment_or_404(db, adjustment_id, user)
    if not _is_pending(adjustment.status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending adjustments can be deleted",
        )
    db.delete(adjustment)
    db.commit()


@router.post("/{adjustment_id}/approve", response_model=StockAdjustmentSchema)
def approve_stock_adjustment(
    adjustment_id: int,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    adjustment = (
        apply_depot_id_filter(
            db.query(StockAdjustment).filter(StockAdjustment.id == adjustment_id),
            user,
            StockAdjustment.depot_id,
        )
        .with_for_update()
        .first()
    )
    if not adjustment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adjustment not found")
    if not _is_pending(adjustment.status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending adjustments can be approved",
        )

    _validate_adjustment_lines(db, adjustment)
    try:
        for item in adjustment.items:
            StockMovementService.adjust(
                db,
                product_id=item.product_id,
                depot_id=adjustment.depot_id,
                batch_no=item.batch,
                quantity_change=item.quantity_change,
            )
        adjustment.status = "Approved"
        adjustment.approved_by = user.id
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Adjustment approval failed",
        )
    return _get_adjustment_or_404(db, adjustment_id, user)

