from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import StockReceipt, Employee
from app.core.deps import require_permission

router = APIRouter()

@router.get("/")
def get_stock_receipts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: Employee = Depends(require_permission("inventory.read")),
):
    receipts = db.query(StockReceipt).offset(skip).limit(limit).all()
    return receipts

