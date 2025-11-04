from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import StockAdjustment

router = APIRouter()

@router.get("/")
def get_stock_adjustments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    adjustments = db.query(StockAdjustment).offset(skip).limit(limit).all()
    return adjustments

