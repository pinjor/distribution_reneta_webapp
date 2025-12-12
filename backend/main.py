from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import redis.asyncio as redis
import traceback

from app.database import engine, Base
from app.routers import (
    auth, companies, depots, employees, customers, vendors,
    products, materials, shipping_points, route_shipping_points, uoms, primary_packagings, price_setups,
    role_masters, orders, product_receipts, order_deliveries,
    vehicles, drivers, routes, picking_orders,
    stock_receipt, stock_issuance, vehicle_loading,
    stock_adjustment, stock_maintenance, product_item_stock,
    dashboard, invoices, depot_transfers, billing, mobile, transport
)

# Redis client
redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global redis_client
    redis_client = redis.from_url("redis://redis:6379/0", encoding="utf-8", decode_responses=True)
    # Create database tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    if redis_client:
        await redis_client.close()

app = FastAPI(
    title="Swift Distribution Hub API",
    description="API for Warehouse Distribution System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - explicitly allow all origins for development
# Note: Using "*" with allow_credentials=True is not allowed by browsers
# So we list specific origins and use allow_credentials=False when using "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:80",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Global exception handler to ensure CORS headers are always included
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions and ensure CORS headers are included"""
    import traceback
    error_trace = traceback.format_exc()
    print(f"Unhandled exception: {exc}")
    print(error_trace)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": str(exc),
            "type": type(exc).__name__,
        },
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with CORS headers"""
    import traceback
    error_details = {
        "detail": exc.errors(),
        "body": exc.body,
        "path": str(request.url),
        "method": request.method
    }
    print(f"=== VALIDATION ERROR ===")
    print(f"Path: {request.url}")
    print(f"Method: {request.method}")
    print(f"Errors: {exc.errors()}")
    print(f"Body: {exc.body}")
    traceback.print_exc()
    print(f"========================")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_details,
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(depots.router, prefix="/api/depots", tags=["Depots"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(vendors.router, prefix="/api/vendors", tags=["Vendors"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(materials.router, prefix="/api/materials", tags=["Materials"])
app.include_router(shipping_points.router, prefix="/api/shipping-points", tags=["Shipping Points"])
app.include_router(route_shipping_points.router, prefix="/api/route-shipping-points", tags=["Route Shipping Points"])
app.include_router(uoms.router, prefix="/api/uoms", tags=["UOMs"])
app.include_router(primary_packagings.router, prefix="/api/primary-packagings", tags=["Primary Packagings"])
app.include_router(price_setups.router, prefix="/api/price-setups", tags=["Price Setups"])
app.include_router(role_masters.router, prefix="/api/role-masters", tags=["Role Masters"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(product_receipts.router, prefix="/api/product-receipts", tags=["Product Receipts"])
app.include_router(order_deliveries.router, prefix="/api/order-deliveries", tags=["Order Deliveries"])
app.include_router(picking_orders.router, prefix="/api/picking-orders", tags=["Picking Orders"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["Vehicles"])
app.include_router(drivers.router, prefix="/api/drivers", tags=["Drivers"])
app.include_router(routes.router, prefix="/api/routes", tags=["Routes"])
app.include_router(stock_receipt.router, prefix="/api/stock/receipts", tags=["Stock Receipts"])
app.include_router(stock_issuance.router, prefix="/api/stock/issuances", tags=["Stock Issuances"])
app.include_router(vehicle_loading.router, prefix="/api/vehicle/loadings", tags=["Vehicle Loadings"])
app.include_router(stock_adjustment.router, prefix="/api/stock/adjustments", tags=["Stock Adjustments"])
app.include_router(stock_maintenance.router, prefix="/api/stock/maintenance", tags=["Stock Maintenance"])
app.include_router(product_item_stock.router, prefix="/api/product-item-stock", tags=["Product Item Stock"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(depot_transfers.router, prefix="/api", tags=["Depot Transfers"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])
app.include_router(mobile.router, prefix="/api/mobile", tags=["Mobile App"])
app.include_router(transport.router, prefix="/api/transport", tags=["Transport Management"])

@app.get("/")
async def root():
    return {"message": "Swift Distribution Hub API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

