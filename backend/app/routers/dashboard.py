from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    StockLedger, StockIssuance, VehicleLoading,
    Invoice
)
from app.redis_cache import cache_get, cache_set

router = APIRouter()

@router.get("/kpis")
async def get_dashboard_kpis(db: Session = Depends(get_db)):
    # Try to get from cache
    cached = await cache_get("dashboard_kpis")
    if cached:
        return cached
    
    # Total Stock
    total_stock = db.query(func.sum(StockLedger.quantity)).scalar() or 0
    
    # Orders Today
    from datetime import date
    today = date.today()
    orders_today = db.query(func.count(StockIssuance.id)).filter(
        func.date(StockIssuance.issuance_date) == today
    ).scalar() or 0
    
    # Dispatched Today
    dispatched_today = db.query(func.count(VehicleLoading.id)).filter(
        func.date(VehicleLoading.loading_date) == today
    ).scalar() or 0
    
    # Delivered (based on invoices)
    delivered_today = db.query(func.count(Invoice.id)).filter(
        func.date(Invoice.invoice_date) == today,
        Invoice.status == "Paid"
    ).scalar() or 0
    
    result = {
        "total_stock": int(total_stock),
        "orders_today": orders_today,
        "dispatched_today": dispatched_today,
        "delivered_today": delivered_today
    }
    
    # Cache for 5 minutes
    await cache_set("dashboard_kpis", result, expire=300)
    return result

