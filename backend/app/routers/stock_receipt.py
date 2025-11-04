from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import StockReceipt

router = APIRouter()

@router.get("/")
def get_stock_receipts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    receipts = db.query(StockReceipt).offset(skip).limit(limit).all()
    return receipts

