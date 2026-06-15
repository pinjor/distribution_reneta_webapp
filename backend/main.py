from fastapi import APIRouter, Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import redis.asyncio as redis
import traceback

from app.database import engine, Base
from app.core.deps import require_auth
from app.core.config import get_settings
from app.core.audit_middleware import AuditWriteMiddleware

# Import platform models so create_all registers them
import app.models_platform  # noqa: F401

from app.routers import (
    auth, companies, depots, employees, customers, vendors,
    products, materials, shipping_points, route_shipping_points, uoms, primary_packagings, price_setups,
    role_masters, orders, product_receipts, order_deliveries,
    vehicles, drivers, routes, picking_orders,
    stock_receipt, stock_issuance, vehicle_loading,
    stock_adjustment, stock_maintenance, product_item_stock,
    dashboard, invoices, depot_transfers, billing, mobile, transport,
    audit_logs, validation, status as status_router, promotions, reconciliation,
    integrations, devices, sync, refunds, reports,
)

PROTECTED = [Depends(require_auth)]

redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    settings = get_settings()
    settings.validate_production()
    try:
        redis_client = redis.from_url("redis://redis:6379/0", encoding="utf-8", decode_responses=True)
    except Exception:
        redis_client = None
    Base.metadata.create_all(bind=engine)
    # Apply legacy column alters on existing PostgreSQL volumes (safe IF NOT EXISTS)
    try:
        from sqlalchemy import text
        from app.database import SessionLocal
        db = SessionLocal()
        try:
            db.execute(text(
                "ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE"
            ))
            db.commit()
        finally:
            db.close()
    except Exception as exc:
        print(f"Startup schema patch skipped: {exc}")
    # Seed permissions and validation rules
    from app.database import SessionLocal
    from app.core.permissions import PERMISSIONS
    from app.models_platform import Permission
    from app.services.order_validation_service import OrderValidationService
    db = SessionLocal()
    try:
        for code, name, module in PERMISSIONS:
            if not db.query(Permission).filter(Permission.code == code).first():
                db.add(Permission(code=code, name=name, module=module))
        OrderValidationService.ensure_default_rules(db)
        db.commit()
    finally:
        db.close()
    yield
    if redis_client:
        await redis_client.close()

app = FastAPI(
    title="Swift Distribution Hub API",
    description="API for Warehouse Distribution System",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(AuditWriteMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost", "http://localhost:80", "http://localhost:5173",
        "http://localhost:8080", "http://localhost:3000",
        "http://127.0.0.1:5173", "http://127.0.0.1:8080", "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled exception: {exc}")
    print(traceback.format_exc())
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc), "type": type(exc).__name__},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body},
        headers={"Access-Control-Allow-Origin": request.headers.get("origin", "*")},
    )

# Public routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

# Protected business routes
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"], dependencies=PROTECTED)
app.include_router(depots.router, prefix="/api/depots", tags=["Depots"], dependencies=PROTECTED)
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"], dependencies=PROTECTED)
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"], dependencies=PROTECTED)
app.include_router(vendors.router, prefix="/api/vendors", tags=["Vendors"], dependencies=PROTECTED)
app.include_router(products.router, prefix="/api/products", tags=["Products"], dependencies=PROTECTED)
app.include_router(materials.router, prefix="/api/materials", tags=["Materials"], dependencies=PROTECTED)
app.include_router(shipping_points.router, prefix="/api/shipping-points", tags=["Shipping Points"], dependencies=PROTECTED)
app.include_router(route_shipping_points.router, prefix="/api/route-shipping-points", tags=["Route Shipping Points"], dependencies=PROTECTED)
app.include_router(uoms.router, prefix="/api/uoms", tags=["UOMs"], dependencies=PROTECTED)
app.include_router(primary_packagings.router, prefix="/api/primary-packagings", tags=["Primary Packagings"], dependencies=PROTECTED)
app.include_router(price_setups.router, prefix="/api/price-setups", tags=["Price Setups"], dependencies=PROTECTED)
app.include_router(role_masters.router, prefix="/api/role-masters", tags=["Role Masters"], dependencies=PROTECTED)
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"], dependencies=PROTECTED)
app.include_router(validation.router, prefix="/api/orders", tags=["Order Validation"], dependencies=PROTECTED)
app.include_router(status_router.router, prefix="/api/orders", tags=["Order Status"], dependencies=PROTECTED)
app.include_router(product_receipts.router, prefix="/api/product-receipts", tags=["Product Receipts"], dependencies=PROTECTED)
app.include_router(order_deliveries.router, prefix="/api/order-deliveries", tags=["Order Deliveries"], dependencies=PROTECTED)
app.include_router(picking_orders.router, prefix="/api/picking-orders", tags=["Picking Orders"], dependencies=PROTECTED)
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["Vehicles"], dependencies=PROTECTED)
app.include_router(drivers.router, prefix="/api/drivers", tags=["Drivers"], dependencies=PROTECTED)
app.include_router(routes.router, prefix="/api/routes", tags=["Routes"], dependencies=PROTECTED)
app.include_router(stock_receipt.router, prefix="/api/stock/receipts", tags=["Stock Receipts"], dependencies=PROTECTED)
app.include_router(stock_issuance.router, prefix="/api/stock/issuances", tags=["Stock Issuances"], dependencies=PROTECTED)
app.include_router(vehicle_loading.router, prefix="/api/vehicle/loadings", tags=["Vehicle Loadings"], dependencies=PROTECTED)
app.include_router(stock_adjustment.router, prefix="/api/stock/adjustments", tags=["Stock Adjustments"], dependencies=PROTECTED)
app.include_router(stock_maintenance.router, prefix="/api/stock/maintenance", tags=["Stock Maintenance"], dependencies=PROTECTED)
app.include_router(product_item_stock.router, prefix="/api/product-item-stock", tags=["Product Item Stock"], dependencies=PROTECTED)
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"], dependencies=PROTECTED)
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"], dependencies=PROTECTED)
app.include_router(depot_transfers.router, prefix="/api", tags=["Depot Transfers"], dependencies=PROTECTED)
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"], dependencies=PROTECTED)
app.include_router(mobile.router, prefix="/api/mobile", tags=["Mobile App"], dependencies=PROTECTED)
app.include_router(transport.router, prefix="/api/transport", tags=["Transport Management"], dependencies=PROTECTED)
app.include_router(audit_logs.router, prefix="/api/audit-logs", tags=["Audit Logs"], dependencies=PROTECTED)
app.include_router(promotions.router, prefix="/api/promotions", tags=["Promotions"], dependencies=PROTECTED)
app.include_router(reconciliation.router, prefix="/api/reconciliation", tags=["Reconciliation"], dependencies=PROTECTED)
app.include_router(integrations.router, prefix="/api/integrations", tags=["Integrations"], dependencies=PROTECTED)
app.include_router(devices.router, prefix="/api/devices", tags=["Devices"], dependencies=PROTECTED)
app.include_router(sync.router, prefix="/api/sync", tags=["Sync"], dependencies=PROTECTED)
app.include_router(refunds.router, prefix="/api/refunds", tags=["Refunds"], dependencies=PROTECTED)
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"], dependencies=PROTECTED)

@app.get("/")
async def root():
    return {"message": "Swift Distribution Hub API", "status": "running", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
