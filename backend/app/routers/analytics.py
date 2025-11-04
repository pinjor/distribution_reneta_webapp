from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import StockReceipt, StockIssuance, VehicleLoading

router = APIRouter()

@router.get("/sales-trend")
def get_sales_trend(db: Session = Depends(get_db)):
    # Sample data for sales trend
    return {
        "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        "data": [45000, 52000, 48000, 61000, 55000, 67000]
    }

@router.get("/stock-chart")
def get_stock_chart(db: Session = Depends(get_db)):
    # Sample data for stock chart
    return {
        "labels": ["Paracetamol", "Amoxicillin", "Ibuprofen", "Cetirizine", "Metformin"],
        "data": [4750, 2820, 4100, 1680, 6000]
    }

