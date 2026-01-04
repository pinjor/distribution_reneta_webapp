# Database Seeding Guide

This guide explains how to populate the database with sample data for all modules.

## Quick Start

### Option 1: Use the Seed Script (Recommended)

**Windows:**
```powershell
.\seed_database.bat
```

**Linux/macOS:**
```bash
./seed_database.sh
```

### Option 2: Manual Seeding via Docker

```bash
# Make sure containers are running
docker-compose up -d

# Run the master seed script
docker exec -it swift_distro_api python -m db.seed_all_data
```

## What Gets Seeded

The master seed script (`seed_all_data.py`) runs the following in order:

1. **Master Data** (`seed_master_data.py`)
   - Companies and Depots
   - Products and Materials
   - Customers and Vendors
   - Employees
   - UOMs, Primary Packagings, Price Setups
   - Shipping Points

2. **Vehicles & Drivers** (`seed_vehicles.py`)
   - Vehicles (trucks, vans, etc.)
   - Drivers
   - Vehicle-driver assignments

3. **Routes** (`seed_route_demo_data.py`)
   - Routes (R-1, R-2, R-3, R-4, R-5)
   - Route orders with various statuses
   - Order items

4. **Product Stock** (`seed_product_stock_data.py`)
   - Product stock entries
   - Batch information
   - Stock quantities per depot

5. **Complete Orders** (`seed_complete_orders.py`)
   - Validated orders (for Route Wise Memo List)
   - Non-validated orders (for Order List)
   - Orders for all routes

6. **Delivery Orders** (`seed_delivery_orders.py`)
   - Delivery orders with routes and products
   - Order items with quantities

7. **Collection/Billing Data** (`seed_collection_data.py`)
   - Orders for Remaining Cash Deposit List
   - Orders for Approval for Collection
   - Collection deposits
   - Billing transactions

## Individual Seed Scripts

If you need to seed specific data only:

```bash
# Master data only
docker exec -it swift_distro_api python -m db.seed_master_data

# Vehicles and drivers only
docker exec -it swift_distro_api python -m db.seed_vehicles

# Routes only
docker exec -it swift_distro_api python -m db.seed_route_demo_data

# Complete orders only
docker exec -it swift_distro_api python -m db.seed_complete_orders

# Delivery orders only
docker exec -it swift_distro_api python -m db.seed_delivery_orders

# Collection/billing data only
docker exec -it swift_distro_api python -m db.seed_collection_data

# Product stock only
docker exec -it swift_distro_api python -m db.seed_product_stock_data
```

## Verification

After seeding, verify the data:

### Check Order Management
```bash
# Check orders count
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub -c "SELECT COUNT(*) FROM orders;"

# Check route orders
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub -c "SELECT route_code, COUNT(*) FROM orders GROUP BY route_code;"
```

### Check Delivery Management
```bash
# Check delivery orders
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub -c "SELECT COUNT(*) FROM orders WHERE validated = false;"
```

### Check Billing
```bash
# Check collection deposits
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub -c "SELECT COUNT(*) FROM collection_deposits;"
```

### Check Transport Management
```bash
# Check vehicles
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub -c "SELECT COUNT(*) FROM vehicles;"

# Check drivers
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub -c "SELECT COUNT(*) FROM drivers;"

# Check routes
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub -c "SELECT COUNT(*) FROM routes;"
```

## Troubleshooting

### Error: "Container not running"
**Solution:**
```bash
docker-compose up -d
```

### Error: "No module named 'db'"
**Solution:**
Make sure you're running from the backend container:
```bash
docker exec -it swift_distro_api python -m db.seed_all_data
```

### Error: "No products/customers found"
**Solution:**
Run master data seed first:
```bash
docker exec -it swift_distro_api python -m db.seed_master_data
```

### Error: "Database connection error"
**Solution:**
1. Check if PostgreSQL is running: `docker-compose ps postgres`
2. Check database connection: `docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub -c "SELECT 1;"`
3. Restart containers: `docker-compose restart`

### Data Not Showing in Frontend
**Solution:**
1. Verify data exists in database (use verification commands above)
2. Refresh the frontend page
3. Check browser console for API errors
4. Check backend logs: `docker-compose logs backend`

## Resetting Data

To clear and reseed all data:

```bash
# Stop containers
docker-compose down

# Remove volumes (⚠️ deletes all data)
docker-compose down -v

# Start containers
docker-compose up -d

# Wait for containers to be ready
sleep 10

# Seed data
.\seed_database.bat  # Windows
# or
./seed_database.sh   # Linux/macOS
```

## Expected Data Counts

After running `seed_all_data.py`, you should have:

- **Companies**: 1-2
- **Depots**: 2-3
- **Products**: 50-100
- **Customers**: 20-50
- **Employees**: 10-20
- **Vehicles**: 10-20
- **Drivers**: 10-20
- **Routes**: 5
- **Orders**: 100-200
- **Collection Deposits**: 20-50

## Next Steps

After seeding:
1. **Access the application**: http://localhost
2. **Login**: Use test credentials (create test user if needed)
3. **Navigate to modules**:
   - Order Management → Should show orders
   - Delivery Management → Should show delivery orders
   - Billing → Should show collection deposits
   - Transport Management → Should show vehicles, drivers, routes

## Support

If you encounter issues:
1. Check logs: `docker-compose logs backend`
2. Verify database: Use verification commands above
3. Check [TROUBLESHOOTING_DOCKER.md](TROUBLESHOOTING_DOCKER.md)
4. Review seed script output for errors

