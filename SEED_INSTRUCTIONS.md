# Seed Script Instructions

## Prerequisites
Before running the seed script, you need to start the database server.

## Steps to Run Seed Scripts

### 1. Start Docker Services

**Option A: Start all services (recommended)**
```bash
docker-compose up -d
```

**Option B: Start only database and Redis**
```bash
docker-compose up -d postgres redis
```

This will start:
- PostgreSQL on port **55432**
- Redis on port 6379

### 2. Verify Database is Running

Check if the PostgreSQL container is running:
```bash
docker ps
```

You should see `swift_distro_postgres` container in the list.

### 3. Run Seed Scripts

**Seed complete orders (for Route Wise Memo List):**
```bash
cd backend
python -m db.seed_complete_orders
```

This creates:
- ✅ Validated orders that appear in Route Wise Memo List
- ✅ Non-validated orders for Order List
- ✅ Orders for all routes (no empty routes)
- ✅ All order numbers in format `order-{id}`

**Other seed scripts you may need:**
```bash
# Seed master data (products, customers, employees, etc.)
python -m db.seed_master_data

# Seed routes
python -m db.seed_route_demo_data

# Seed delivery orders
python -m db.seed_delivery_orders
```

### 4. Verify Data

After seeding, check:
- **Route Wise Memo List**: Should show validated orders grouped by route
- **Order List**: Should show non-validated orders ready for validation
- **Delivery Order List**: Should show orders that can be converted to delivery orders

## Troubleshooting

### Error: "Connection refused"
- **Solution**: Make sure Docker containers are running (`docker ps`)
- Start containers: `docker-compose up -d postgres redis`

### Error: "Database does not exist"
- **Solution**: The database is created automatically when the container starts
- If issues persist, check `docker-compose.yml` for correct database name

### Error: "No products/customers found"
- **Solution**: Run `python -m db.seed_master_data` first to create base data

## Quick Command Reference

```bash
# Start database
docker-compose up -d postgres redis

# Stop database
docker-compose stop postgres redis

# View logs
docker-compose logs postgres

# Connect to database directly
docker exec -it swift_distro_postgres psql -U swift_user -d swift_distro_hub
```

