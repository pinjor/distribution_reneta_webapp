from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    StockLedger, Order
)
from app.redis_cache import cache_get, cache_set

router = APIRouter()

@router.get("/kpis")
async def get_dashboard_kpis(db: Session = Depends(get_db)):
    # Try to get from cache
    cached = await cache_get("dashboard_kpis")
    if cached:
        return cached
    
    from datetime import date
    today = date.today()
    
    # Total Stock
    total_stock = db.query(func.sum(StockLedger.quantity)).scalar() or 0
    
    # Orders Today (orders created today)
    orders_today = db.query(func.count(Order.id)).filter(
        func.date(Order.created_at) == today
    ).scalar() or 0
    
    # Validated (current validated orders that are not loaded)
    validated_today = db.query(func.count(Order.id)).filter(
        Order.validated == True,
        or_(Order.loaded == False, Order.loaded.is_(None))
    ).scalar() or 0
    
    # Assigned (current loaded orders with loading numbers)
    assigned_today = db.query(func.count(Order.id)).filter(
        Order.loaded == True,
        Order.loading_number.isnot(None)
    ).scalar() or 0
    
    # Order Management Statistics
    # Pending Validation (not validated)
    pending_validation = db.query(func.count(Order.id)).filter(
        Order.validated == False,
        Order.route_code.isnot(None),
        Order.route_code != ""
    ).scalar() or 0
    
    # Validated (validated but not loaded)
    validated_orders = db.query(func.count(Order.id)).filter(
        Order.validated == True,
        or_(Order.loaded == False, Order.loaded.is_(None))
    ).scalar() or 0
    
    # Assigned/Loaded (loaded orders)
    assigned_orders = db.query(func.count(Order.id)).filter(
        Order.loaded == True,
        Order.loading_number.isnot(None)
    ).scalar() or 0
    
    # Fully Delivered
    fully_delivered = db.query(func.count(Order.id)).filter(
        Order.collection_status == "Fully Collected"
    ).scalar() or 0
    
    # Partially Delivered
    partially_delivered = db.query(func.count(Order.id)).filter(
        Order.collection_status == "Partially Collected"
    ).scalar() or 0
    
    # Postponed/Cancelled
    postponed_orders = db.query(func.count(Order.id)).filter(
        Order.collection_status == "Postponed"
    ).scalar() or 0
    
    # Pending Collection
    pending_collection = db.query(func.count(Order.id)).filter(
        Order.collection_status == "Pending",
        Order.collection_approved == False
    ).scalar() or 0
    
    result = {
        "total_stock": int(total_stock),
        "orders_today": orders_today,
        "validated_today": validated_today,
        "assigned_today": assigned_today,
        "order_management": {
            "pending_validation": pending_validation,
            "validated": validated_orders,
            "assigned": assigned_orders,
            "fully_delivered": fully_delivered,
            "partially_delivered": partially_delivered,
            "postponed": postponed_orders,
            "pending_collection": pending_collection
        }
    }
    
    # Cache for 5 minutes
    await cache_set("dashboard_kpis", result, expire=300)
    return result

