from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import StockLedger

router = APIRouter()

@router.get("/")
def get_stock_ledger(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    ledger = db.query(StockLedger).offset(skip).limit(limit).all()
    return ledger

