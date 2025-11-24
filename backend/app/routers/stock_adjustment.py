from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import StockAdjustment, StockAdjustmentItem
from app.schemas import StockAdjustmentCreate, StockAdjustment as StockAdjustmentSchema

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
def get_stock_adjustments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all stock adjustments"""
    adjustments = db.query(StockAdjustment).offset(skip).limit(limit).all()
    return adjustments

@router.post("/", response_model=StockAdjustmentSchema, status_code=status.HTTP_201_CREATED)
def create_stock_adjustment(adjustment: StockAdjustmentCreate, db: Session = Depends(get_db)):
    """Create a new stock adjustment"""
    if not adjustment.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one adjustment item is required"
        )
    
    # Generate adjustment number
    adjustment_number = generate_adjustment_number(db)
    
    # Create adjustment
    db_adjustment = StockAdjustment(
        adjustment_number=adjustment_number,
        adjustment_date=adjustment.adjustment_date,
        depot_id=adjustment.depot_id,
        adjustment_type=adjustment.adjustment_type,
        reason=adjustment.reason,
        status=adjustment.status or "Pending",
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

