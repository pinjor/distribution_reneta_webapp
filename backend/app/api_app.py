"""FastAPI application factory.

Production: create_api_app() — no Submit/Approve/Reject routes.
F.4B.2-DEV: create_api_app(isolated_workflow=True) — explicit isolated entrypoint only.
"""
from contextlib import asynccontextmanager
import json
import traceback

from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.database import engine, SessionLocal
from app.core.deps import require_auth
from app.core.config import get_settings
from app.core.audit_middleware import AuditWriteMiddleware
from app.core.schema_guard import assert_schema_ready, is_sqlite
from app.redis_cache import close_redis_client, get_redis_client

import app.models  # noqa: F401
import app.models_platform  # noqa: F401
import app.models_opening_stock  # noqa: F401

from app.routers.draft_modules import router as draft_modules_capability_router
from app.routers import (
    auth, companies, depots, employees, customers, vendors, doctors, chemist_shops,
    sample_gift_deliveries, export_deliveries,
    products, materials, shipping_points, route_shipping_points, uoms, primary_packagings, price_setups,
    role_masters, orders, product_receipts, order_deliveries,
    vehicles, drivers, routes, picking_orders,
    stock_receipt, stock_issuance, vehicle_loading,
    stock_adjustment, stock_maintenance, product_item_stock,
    dashboard, invoices, depot_transfers, billing, mobile, transport,
    audit_logs, validation, status as status_router, promotions, reconciliation,
    integrations, devices, sync, refunds, reports,
    opening_stock,
)

PROTECTED = [Depends(require_auth)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.validate_production()
    try:
        client = await get_redis_client()
        await client.ping()
    except Exception as exc:
        print(f"Redis unavailable, continuing without cache: {exc}")
        await close_redis_client()
    assert_schema_ready(engine)
    if not is_sqlite(engine):
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
    await close_redis_client()


def _json_safe(value):
    if isinstance(value, BaseException):
        return str(value)
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    try:
        json.dumps(value)
    except TypeError:
        return str(value)
    return value


def _cors_error_headers(request: Request) -> dict:
    origin = request.headers.get("origin")
    if origin and origin in get_settings().cors_origins:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}


def register_production_routes(app: FastAPI) -> None:
    app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
    app.include_router(companies.router, prefix="/api/companies", tags=["Companies"], dependencies=PROTECTED)
    app.include_router(depots.router, prefix="/api/depots", tags=["Depots"], dependencies=PROTECTED)
    app.include_router(employees.router, prefix="/api/employees", tags=["Employees"], dependencies=PROTECTED)
    app.include_router(customers.router, prefix="/api/customers", tags=["Customers"], dependencies=PROTECTED)
    app.include_router(vendors.router, prefix="/api/vendors", tags=["Vendors"], dependencies=PROTECTED)
    app.include_router(doctors.router, prefix="/api/doctors", tags=["Doctors"], dependencies=PROTECTED)
    app.include_router(chemist_shops.router, prefix="/api/chemist-shops", tags=["Chemist Shops"], dependencies=PROTECTED)
    app.include_router(sample_gift_deliveries.router, prefix="/api/sample-gift-deliveries", tags=["Sample Gift Deliveries"], dependencies=PROTECTED)
    app.include_router(export_deliveries.router, prefix="/api/export-deliveries", tags=["Export Deliveries"], dependencies=PROTECTED)
    app.include_router(draft_modules_capability_router, prefix="/api/draft-modules", tags=["Draft Modules"], dependencies=PROTECTED)
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
    app.include_router(opening_stock.router, prefix="/api/opening-stock", tags=["Opening Stock"], dependencies=PROTECTED)


def create_api_app(*, isolated_workflow: bool = False) -> FastAPI:
    title = "Swift Distribution Hub API"
    description = "API for Warehouse Distribution System"
    if isolated_workflow:
        title = "Swift Distribution Hub API — F.4B.2-DEV isolated"
        description = (
            "Disposable isolated workflow application. Not production. "
            "Not business-approved. Do not point live Compose at this entrypoint."
        )

    app = FastAPI(
        title=title,
        description=description,
        version="2.0.0",
        lifespan=lifespan,
    )
    app.state.isolated_workflow = bool(isolated_workflow)

    if isolated_workflow:
        from app.isolated_runtime import IsolatedWorkflowMarkerMiddleware

        app.add_middleware(IsolatedWorkflowMarkerMiddleware)

    app.add_middleware(AuditWriteMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().cors_origins,
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
            headers=_cors_error_headers(request),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": _json_safe(exc.errors()), "body": _json_safe(exc.body)},
            headers=_cors_error_headers(request),
        )

    register_production_routes(app)

    if isolated_workflow:
        from app.routers.draft_workflow import (
            export_workflow_router,
            sample_gift_workflow_router,
        )

        app.include_router(
            sample_gift_workflow_router,
            prefix="/api/sample-gift-deliveries",
            tags=["Sample Gift Workflow F.4B.2-DEV"],
            dependencies=PROTECTED,
        )
        app.include_router(
            export_workflow_router,
            prefix="/api/export-deliveries",
            tags=["Export Workflow F.4B.2-DEV"],
            dependencies=PROTECTED,
        )
        from app.routers.isolated_inventory import isolated_inventory_router

        app.include_router(
            isolated_inventory_router,
            prefix="/api/isolated-inventory",
            tags=["Isolated Inventory F.4C-DEV"],
            dependencies=PROTECTED,
        )
        from app.routers.isolated_fulfillment import isolated_fulfillment_router

        app.include_router(
            isolated_fulfillment_router,
            prefix="/api/isolated-fulfillment",
            tags=["Isolated Fulfillment F.4D-DEV"],
            dependencies=PROTECTED,
        )

    @app.get("/")
    async def root():
        payload = {"message": "Swift Distribution Hub API", "status": "running", "version": "2.0.0"}
        if isolated_workflow:
            payload["isolated_workflow"] = True
            payload["business_approved"] = False
        return payload

    @app.get("/health")
    async def health_check():
        if isolated_workflow:
            return {"status": "healthy", "isolated_workflow": True}
        return {"status": "healthy"}

    return app
