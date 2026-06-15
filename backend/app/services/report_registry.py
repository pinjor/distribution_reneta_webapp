"""Report registry and query implementations."""
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Order, OrderItem, Product, Customer, Depot
from app.models_platform import AuditLog, IntegrationFailure, OrderValidationRun, PromotionUsageLog, SyncQueue


ReportHandler = Callable[[Session, Dict[str, Any]], Dict[str, Any]]


def _filters(kwargs: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in kwargs.items() if v is not None}


def report_daily_sales(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    depot_code = params.get("depot_code")
    q = db.query(
        Order.depot_code,
        func.count(Order.id).label("order_count"),
        func.sum(Order.collected_amount).label("collected"),
    ).filter(Order.validated == True)
    if depot_code:
        q = q.filter(Order.depot_code == depot_code)
    rows = q.group_by(Order.depot_code).all()
    return {"report": "daily_sales_by_depot", "rows": [
        {"depot_code": r.depot_code, "order_count": r.order_count, "collected": float(r.collected or 0)}
        for r in rows
    ]}


def report_product_sales(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    rows = db.query(
        OrderItem.product_code,
        OrderItem.product_name,
        func.sum(OrderItem.quantity).label("qty"),
    ).group_by(OrderItem.product_code, OrderItem.product_name).limit(500).all()
    return {"report": "product_wise_sales", "rows": [
        {"product_code": r.product_code, "product_name": r.product_name, "quantity": float(r.qty or 0)}
        for r in rows
    ]}


def report_unfulfilled_gap(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    runs = db.query(OrderValidationRun).filter(
        OrderValidationRun.total_short_stock_value > 0,
        OrderValidationRun.is_current == True,
    ).limit(500).all()
    return {"report": "unfulfilled_order_gap", "rows": [
        {
            "order_id": r.order_id,
            "short_stock_value": float(r.total_short_stock_value or 0),
            "status": r.validation_status.value if r.validation_status else None,
        }
        for r in runs
    ]}


def report_batch_stock(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    from app.models import ProductItemStockDetail
    rows = db.query(ProductItemStockDetail).limit(1000).all()
    return {"report": "batch_wise_stock", "rows": [
        {"batch_no": r.batch_no, "qty": float(r.available_quantity or 0), "expiry": str(r.expiry_date)}
        for r in rows
    ]}


def report_near_expiry(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    from app.models import ProductItemStockDetail
    threshold = date.today() + timedelta(days=90)
    rows = db.query(ProductItemStockDetail).filter(
        ProductItemStockDetail.expiry_date <= threshold,
        ProductItemStockDetail.available_quantity > 0,
    ).limit(500).all()
    return {"report": "near_expiry_alert", "rows": [
        {"batch_no": r.batch_no, "expiry": str(r.expiry_date), "qty": float(r.available_quantity or 0)}
        for r in rows
    ]}


def report_collection_summary(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    rows = db.query(
        Order.collection_status,
        func.count(Order.id),
        func.sum(Order.collected_amount),
    ).group_by(Order.collection_status).all()
    return {"report": "collection_summary", "rows": [
        {"status": r[0], "count": r[1], "amount": float(r[2] or 0)} for r in rows
    ]}


def report_pending_collection(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    orders = db.query(Order).filter(
        Order.collection_status.in_(["Pending", "Partially Collected", "Postponed"])
    ).limit(500).all()
    return {"report": "pending_collection", "rows": [
        {"memo": o.memo_number, "customer": o.customer_name, "pending": float(o.pending_amount or 0)}
        for o in orders
    ]}


def report_audit_trail(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(500).all()
    return {"report": "user_audit_trail", "rows": [
        {"action": r.action, "entity": r.entity_type, "entity_id": r.entity_id, "user": r.user_name, "at": str(r.created_at)}
        for r in rows
    ]}


def report_sync_failures(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    rows = db.query(SyncQueue).filter(SyncQueue.status == "FAILED").limit(200).all()
    return {"report": "sync_failure", "rows": [{"id": r.id, "error": r.error_message} for r in rows]}


def report_promotion_utilization(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    rows = db.query(PromotionUsageLog).limit(500).all()
    return {"report": "bonus_scheme_utilization", "rows": [
        {"promotion_id": r.promotion_id, "order_id": r.order_id, "benefit": float(r.benefit_amount or 0)}
        for r in rows
    ]}


def report_order_lifecycle(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    order_id = params.get("order_id")
    if not order_id:
        return {"report": "order_lifecycle", "rows": [], "message": "order_id required"}
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"report": "order_lifecycle", "rows": []}
    return {"report": "order_lifecycle", "rows": [{
        "order_id": order.id,
        "delivery_status": order.delivery_status,
        "collection_status": order.collection_status,
        "validated": order.validated,
        "memo": order.memo_number,
    }]}


def report_zero_discrepancy_day_end(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    from app.models_platform import ReconciliationRun
    rows = db.query(ReconciliationRun).filter(ReconciliationRun.variance_amount == 0).limit(200).all()
    return {"report": "zero_discrepancy_day_end", "rows": [
        {"reconciliation_no": r.reconciliation_no, "loading_number": r.loading_number}
        for r in rows
    ]}


def _placeholder(report_id: str, name: str) -> ReportHandler:
    def handler(db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "report": report_id,
            "name": name,
            "rows": [],
            "data_ready": True,
            "message": "Schema ready; awaiting transaction population for full analytics",
        }
    return handler


REPORT_REGISTRY: Dict[str, Dict[str, Any]] = {
    "daily_sales_by_depot": {"name": "Daily Sales Summary by Depot/Region", "handler": report_daily_sales, "category": "sales"},
    "product_wise_sales": {"name": "Product-wise Sales Analysis", "handler": report_product_sales, "category": "sales"},
    "target_vs_achievement": {"name": "Target vs Achievement", "handler": _placeholder("target_vs_achievement", "Target vs Achievement"), "category": "sales"},
    "order_source_analysis": {"name": "Order Source Analysis", "handler": _placeholder("order_source_analysis", "Order Source Analysis"), "category": "sales"},
    "bonus_scheme_utilization": {"name": "Bonus & Scheme Utilization", "handler": report_promotion_utilization, "category": "sales"},
    "unfulfilled_order_gap": {"name": "Unfulfilled Order Gap", "handler": report_unfulfilled_gap, "category": "sales"},
    "order_lifecycle": {"name": "Order Lifecycle History", "handler": report_order_lifecycle, "category": "sales"},
    "chemist_sales_trend": {"name": "Chemist-wise Sales Trend", "handler": _placeholder("chemist_sales_trend", "Chemist-wise Sales Trend"), "category": "sales"},
    "institutional_vs_retail": {"name": "Institutional vs Retail Sales", "handler": _placeholder("institutional_vs_retail", "Institutional vs Retail Sales"), "category": "sales"},
    "territory_growth": {"name": "Territory-wise Growth", "handler": _placeholder("territory_growth", "Territory-wise Growth"), "category": "sales"},
    "batch_wise_stock": {"name": "Batch-wise Stock", "handler": report_batch_stock, "category": "inventory"},
    "near_expiry_alert": {"name": "Near-Expiry Alert", "handler": report_near_expiry, "category": "inventory"},
    "fefo_violation": {"name": "FEFO Violation", "handler": _placeholder("fefo_violation", "FEFO Violation"), "category": "inventory"},
    "quarantine_stock": {"name": "Quarantine Stock", "handler": _placeholder("quarantine_stock", "Quarantine Stock"), "category": "inventory"},
    "in_transit_stock": {"name": "In-Transit Stock", "handler": _placeholder("in_transit_stock", "In-Transit Stock"), "category": "inventory"},
    "damage_breakage": {"name": "Damage/Breakage", "handler": _placeholder("damage_breakage", "Damage/Breakage"), "category": "inventory"},
    "market_return_cn": {"name": "Market Return CN", "handler": _placeholder("market_return_cn", "Market Return CN"), "category": "inventory"},
    "stock_requisition_suggestion": {"name": "Stock Requisition Suggestion", "handler": _placeholder("stock_requisition_suggestion", "Stock Requisition Suggestion"), "category": "inventory"},
    "stock_valuation": {"name": "Stock Valuation", "handler": _placeholder("stock_valuation", "Stock Valuation"), "category": "inventory"},
    "warehouse_space_utilization": {"name": "Warehouse Space Utilization", "handler": _placeholder("warehouse_space_utilization", "Warehouse Space Utilization"), "category": "inventory"},
    "dex_activity_log": {"name": "DEX Activity Log", "handler": report_audit_trail, "category": "field"},
    "failed_delivery": {"name": "Failed Delivery Report", "handler": _placeholder("failed_delivery", "Failed Delivery Report"), "category": "field"},
    "productivity_per_route": {"name": "Productivity per Route", "handler": _placeholder("productivity_per_route", "Productivity per Route"), "category": "field"},
    "delivery_success_rate": {"name": "Delivery Success Rate", "handler": _placeholder("delivery_success_rate", "Delivery Success Rate"), "category": "field"},
    "reason_code_analysis": {"name": "Reason-Code Analysis", "handler": _placeholder("reason_code_analysis", "Reason-Code Analysis"), "category": "field"},
    "amended_delivery": {"name": "Amended Delivery Report", "handler": _placeholder("amended_delivery", "Amended Delivery Report"), "category": "field"},
    "postponed_delivery_schedule": {"name": "Postponed Delivery Schedule", "handler": _placeholder("postponed_delivery_schedule", "Postponed Delivery Schedule"), "category": "field"},
    "route_deviation": {"name": "Route Deviation Report", "handler": _placeholder("route_deviation", "Route Deviation Report"), "category": "field"},
    "digital_pod_gallery": {"name": "Digital POD Gallery", "handler": _placeholder("digital_pod_gallery", "Digital POD Gallery"), "category": "field"},
    "vehicle_load_utilization": {"name": "Vehicle Load Utilization", "handler": _placeholder("vehicle_load_utilization", "Vehicle Load Utilization"), "category": "field"},
    "daily_distance_km": {"name": "Daily Distance KM Report", "handler": _placeholder("daily_distance_km", "Daily Distance KM Report"), "category": "field"},
    "collection_summary": {"name": "Collection Summary Cash vs Digital", "handler": report_collection_summary, "category": "finance"},
    "agent_banking_deposit": {"name": "Agent Banking Deposit Report", "handler": _placeholder("agent_banking_deposit", "Agent Banking Deposit Report"), "category": "finance"},
    "pending_collection": {"name": "Pending Collection Report", "handler": report_pending_collection, "category": "finance"},
    "locker_overnight_cash": {"name": "Locker/Overnight Cash Report", "handler": _placeholder("locker_overnight_cash", "Locker/Overnight Cash Report"), "category": "finance"},
    "credit_aging": {"name": "Credit Aging Report", "handler": _placeholder("credit_aging", "Credit Aging Report"), "category": "finance"},
    "credit_limit_exception": {"name": "Credit Limit Exception Report", "handler": _placeholder("credit_limit_exception", "Credit Limit Exception Report"), "category": "finance"},
    "vat_tax_recovery": {"name": "VAT/Tax Recovery Report", "handler": _placeholder("vat_tax_recovery", "VAT/Tax Recovery Report"), "category": "finance"},
    "zero_discrepancy_day_end": {"name": "Zero-Discrepancy Day-End Report", "handler": report_zero_discrepancy_day_end, "category": "finance"},
    "dm_outstanding_balance": {"name": "DM Outstanding Balance", "handler": _placeholder("dm_outstanding_balance", "DM Outstanding Balance"), "category": "finance"},
    "bank_acknowledgment": {"name": "Bank Acknowledgment Report", "handler": _placeholder("bank_acknowledgment", "Bank Acknowledgment Report"), "category": "finance"},
    "daily_loading_summary": {"name": "Daily Loading Report Summary", "handler": _placeholder("daily_loading_summary", "Daily Loading Report Summary"), "category": "logistics"},
    "vehicle_efficiency": {"name": "Vehicle Efficiency Report", "handler": _placeholder("vehicle_efficiency", "Vehicle Efficiency Report"), "category": "logistics"},
    "depot_performance_league": {"name": "Depot-wise Performance League", "handler": _placeholder("depot_performance_league", "Depot-wise Performance League"), "category": "logistics"},
    "user_audit_trail": {"name": "User Audit Trail", "handler": report_audit_trail, "category": "logistics"},
    "barcode_scan_success": {"name": "Barcode Scan Success Report", "handler": _placeholder("barcode_scan_success", "Barcode Scan Success Report"), "category": "logistics"},
    "route_merge_split_log": {"name": "Route Merging/Splitting Log", "handler": _placeholder("route_merge_split_log", "Route Merging/Splitting Log"), "category": "logistics"},
    "commercial_sample_tracking": {"name": "Commercial Sample Tracking", "handler": _placeholder("commercial_sample_tracking", "Commercial Sample Tracking"), "category": "logistics"},
    "labor_productivity": {"name": "Labor Productivity Report", "handler": _placeholder("labor_productivity", "Labor Productivity Report"), "category": "logistics"},
    "hardware_health": {"name": "Hardware Health Report", "handler": _placeholder("hardware_health", "Hardware Health Report"), "category": "logistics"},
    "sync_failure": {"name": "Sync Failure Report", "handler": report_sync_failures, "category": "logistics"},
    "temperature_sensitive": {"name": "Temperature-Sensitive Product Report", "handler": _placeholder("temperature_sensitive", "Temperature-Sensitive Product Report"), "category": "compliance"},
    "controlled_substance": {"name": "Controlled Substance Report", "handler": _placeholder("controlled_substance", "Controlled Substance Report"), "category": "compliance"},
    "physician_sample_compliance": {"name": "Physician/Sample Compliance", "handler": _placeholder("physician_sample_compliance", "Physician/Sample Compliance"), "category": "compliance"},
    "price_protection_mrp": {"name": "Price Protection/MRP Change Report", "handler": _placeholder("price_protection_mrp", "Price Protection/MRP Change Report"), "category": "compliance"},
    "recall_readiness": {"name": "Recall Readiness Report", "handler": _placeholder("recall_readiness", "Recall Readiness Report"), "category": "compliance"},
    "cost_per_km": {"name": "Cost Per Kilometre", "handler": _placeholder("cost_per_km", "Cost Per Kilometre"), "category": "cost"},
    "cost_per_order": {"name": "Cost Per Order", "handler": _placeholder("cost_per_order", "Cost Per Order"), "category": "cost"},
    "cost_per_stop": {"name": "Cost Per Stop/Chemist", "handler": _placeholder("cost_per_stop", "Cost Per Stop/Chemist"), "category": "cost"},
    "vehicle_monthly_expense": {"name": "Vehicle-wise Monthly Expense Summary", "handler": _placeholder("vehicle_monthly_expense", "Vehicle-wise Monthly Expense Summary"), "category": "cost"},
    "fuel_consumption": {"name": "Fuel Consumption Analysis", "handler": _placeholder("fuel_consumption", "Fuel Consumption Analysis"), "category": "cost"},
    "owned_vs_rental_cost": {"name": "Owned vs Rental Cost Comparison", "handler": _placeholder("owned_vs_rental_cost", "Owned vs Rental Cost Comparison"), "category": "cost"},
    "da_travel_allowance": {"name": "DA Travel Allowance per Route", "handler": _placeholder("da_travel_allowance", "DA Travel Allowance per Route"), "category": "cost"},
    "route_profitability": {"name": "Route-wise Profitability Report", "handler": _placeholder("route_profitability", "Route-wise Profitability Report"), "category": "cost"},
    "high_cost_route_alert": {"name": "High-Cost Route Exception Alert", "handler": _placeholder("high_cost_route_alert", "High-Cost Route Exception Alert"), "category": "cost"},
}


def run_report(db: Session, report_id: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if report_id not in REPORT_REGISTRY:
        raise ValueError(f"Unknown report: {report_id}")
    entry = REPORT_REGISTRY[report_id]
    return entry["handler"](db, params or {})
