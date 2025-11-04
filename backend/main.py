from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import redis.asyncio as redis

from app.database import engine, Base
from app.routers import (
    auth, companies, depots, employees, customers, vendors,
    products, materials, shipping_points, uoms, primary_packagings, price_setups,
    vehicles, drivers, routes,
    stock_receipt, stock_issuance, vehicle_loading,
    stock_adjustment, stock_maintenance,
    dashboard, analytics, billing
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(uoms.router, prefix="/api/uoms", tags=["UOMs"])
app.include_router(primary_packagings.router, prefix="/api/primary-packagings", tags=["Primary Packagings"])
app.include_router(price_setups.router, prefix="/api/price-setups", tags=["Price Setups"])
app.include_router(vehicles.router, prefix="/api/vehicles", tags=["Vehicles"])
app.include_router(drivers.router, prefix="/api/drivers", tags=["Drivers"])
app.include_router(routes.router, prefix="/api/routes", tags=["Routes"])
app.include_router(stock_receipt.router, prefix="/api/stock/receipts", tags=["Stock Receipts"])
app.include_router(stock_issuance.router, prefix="/api/stock/issuances", tags=["Stock Issuances"])
app.include_router(vehicle_loading.router, prefix="/api/vehicle/loadings", tags=["Vehicle Loadings"])
app.include_router(stock_adjustment.router, prefix="/api/stock/adjustments", tags=["Stock Adjustments"])
app.include_router(stock_maintenance.router, prefix="/api/stock/maintenance", tags=["Stock Maintenance"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])

@app.get("/")
async def root():
    return {"message": "Swift Distribution Hub API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

