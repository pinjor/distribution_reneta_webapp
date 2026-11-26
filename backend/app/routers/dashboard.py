from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Depot,
    Employee,
    Order,
    Product,
    ProductItemStock,
    ProductItemStockDetail,
    StockLedger,
)
from app.core.deps import require_auth
from app.core.depot_scope import apply_depot_code_filter
from app.redis_cache import cache_get, cache_set

router = APIRouter()

def _order_query(db: Session, user: Employee):
    query = db.query(Order)
    return apply_depot_code_filter(query, user, Order.depot_code, db)

@router.get("/kpis")
async def get_dashboard_kpis(
    db: Session = Depends(get_db),
    user: Employee = Depends(require_auth),
):
    cache_key = f"dashboard_kpis:{user.id}:{user.depot_id or 'all'}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    
    from datetime import date
    today = date.today()
    
    # Total Stock (not depot-scoped — ledger is global)
    total_stock = db.query(func.sum(StockLedger.quantity)).scalar() or 0
    
    base = _order_query(db, user)
    orders_today = base.filter(func.date(Order.created_at) == today).count()
    
    validated_today = base.filter(
        Order.validated == True,
        or_(Order.loaded == False, Order.loaded.is_(None))
    ).count()
    
    assigned_today = base.filter(
        Order.loaded == True,
        Order.loading_number.isnot(None)
    ).count()
    
    pending_validation = base.filter(
        Order.validated == False,
        Order.route_code.isnot(None),
        Order.route_code != ""
    ).count()
    
    validated_orders = base.filter(
        Order.validated == True,
        or_(Order.loaded == False, Order.loaded.is_(None))
    ).count()
    
    assigned_orders = base.filter(
        Order.loaded == True,
        Order.loading_number.isnot(None)
    ).count()
    
    fully_delivered = base.filter(Order.collection_status == "Fully Collected").count()
    partially_delivered = base.filter(Order.collection_status == "Partially Collected").count()
    postponed_orders = base.filter(Order.collection_status == "Postponed").count()
    pending_collection = base.filter(
        Order.collection_status == "Pending",
        Order.collection_approved == False
    ).count()

    stock_query = db.query(Depot.name, func.coalesce(func.sum(StockLedger.quantity), 0)).outerjoin(
        StockLedger, StockLedger.depot_id == Depot.id
    )
    if user.depot_id:
        stock_query = stock_query.filter(Depot.id == user.depot_id)
    stock_by_depot = [
        {"depot": name or "Unknown", "stock": int(qty or 0)}
        for name, qty in stock_query.group_by(Depot.name).all()
        if name
    ]

    cutoff = today + timedelta(days=60)
    expiry_query = (
        db.query(
            Product.name,
            ProductItemStockDetail.batch_no,
            ProductItemStockDetail.expiry_date,
            func.coalesce(ProductItemStockDetail.available_quantity, ProductItemStockDetail.quantity),
        )
        .join(ProductItemStock, ProductItemStock.id == ProductItemStockDetail.item_code)
        .join(Product, Product.id == ProductItemStock.product_id)
        .filter(ProductItemStockDetail.expiry_date.isnot(None))
        .filter(ProductItemStockDetail.expiry_date <= cutoff)
        .filter(func.coalesce(ProductItemStockDetail.available_quantity, ProductItemStockDetail.quantity) > 0)
    )
    if user.depot_id:
        expiry_query = expiry_query.filter(ProductItemStock.depot_id == user.depot_id)
    expiry_alerts = []
    for name, batch, expiry, qty in expiry_query.order_by(ProductItemStockDetail.expiry_date.asc()).limit(15).all():
        days = (expiry - today).days if expiry else 0
        severity = "error" if days <= 7 else "warning" if days <= 30 else "info"
        expiry_alerts.append(
            {
                "product": name,
                "batch": batch,
                "expiry": expiry.isoformat() if expiry else None,
                "days": days,
                "severity": severity,
                "quantity": float(qty or 0),
            }
        )
    
    result = {
        "total_stock": int(total_stock),
        "orders_today": orders_today,
        "validated_today": validated_today,
        "assigned_today": assigned_today,
        "stock_by_depot": stock_by_depot,
        "expiry_alerts": expiry_alerts,
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
    
    await cache_set(cache_key, result, expire=300)
    return result
