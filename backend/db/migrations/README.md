# Database Migration Guide

## Migration: Add Order Fields

This migration adds new fields to support route-wise order management, free goods, discounts, and assignment tracking.

### What This Migration Does

1. **Adds to `order_items` table:**
   - `free_goods` - Free goods quantity
   - `total_quantity` - Total quantity (quantity + free goods)
   - `unit_price` - Unit price
   - `use_code` - Use code field
   - `discount_percent` - Discount percentage

2. **Adds to `orders` table:**
   - `route_code` - Route code
   - `route_name` - Route name
   - `validated` - Validation status
   - `printed` - Print status
   - `printed_at` - Print timestamp
   - `assigned_to` - Assigned employee ID
   - `assigned_vehicle` - Assigned vehicle ID
   - `loaded` - Loaded status
   - `loaded_at` - Load timestamp
   - `assignment_date` - Assignment timestamp

3. **Creates indexes** for better query performance

4. **Updates existing records** with default values

---

## How to Run the Migration

### Option 1: Using Docker (Recommended)

If you're using Docker Compose:

```powershell
# Make sure containers are running
docker-compose up -d

# Run the migration script
cd backend\db\migrations
.\run_migration_docker.ps1
```

Or manually:

```powershell
# Copy migration file to container
docker cp backend\db\migrations\add_order_fields.sql swift_distro_postgres:/tmp/

# Execute migration
docker exec -i swift_distro_postgres psql -U swift_user -d swift_distro_hub -f /tmp/add_order_fields.sql

# Clean up
docker exec swift_distro_postgres rm /tmp/add_order_fields.sql
```

### Option 2: Using psql (Local PostgreSQL)

If you have PostgreSQL installed locally:

```powershell
# Set password (Windows PowerShell)
$env:PGPASSWORD = "swift_password"

# Run migration
psql -h localhost -p 5432 -U swift_user -d swift_distro_hub -f backend\db\migrations\add_order_fields.sql

# Or use the script
cd backend\db\migrations
.\run_migration.ps1
```

### Option 3: Using pgAdmin or DBeaver

1. Open pgAdmin or DBeaver
2. Connect to your database
3. Open the SQL file: `backend/db/migrations/add_order_fields.sql`
4. Execute the script

### Option 4: Using Python Script

```python
import psycopg2
from pathlib import Path

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="swift_distro_hub",
    user="swift_user",
    password="swift_password"
)

# Read and execute migration
migration_file = Path("backend/db/migrations/add_order_fields.sql")
with open(migration_file, 'r') as f:
    sql = f.read()

cursor = conn.cursor()
cursor.execute(sql)
conn.commit()
cursor.close()
conn.close()

print("Migration completed successfully!")
```

---

## Verification

After running the migration, verify it worked:

```sql
-- Check order_items columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('free_goods', 'total_quantity', 'unit_price', 'use_code', 'discount_percent');

-- Check orders columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('route_code', 'validated', 'printed', 'assigned_to', 'assigned_vehicle', 'loaded');

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'orders' 
AND indexname LIKE 'idx_orders_%';
```

---

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_orders_route_code;
DROP INDEX IF EXISTS idx_orders_assigned_to;
DROP INDEX IF EXISTS idx_orders_assigned_vehicle;
DROP INDEX IF EXISTS idx_orders_validated;
DROP INDEX IF EXISTS idx_orders_printed;
DROP INDEX IF EXISTS idx_orders_loaded;

-- Remove columns from orders
ALTER TABLE orders
DROP COLUMN IF EXISTS route_code,
DROP COLUMN IF EXISTS route_name,
DROP COLUMN IF EXISTS validated,
DROP COLUMN IF EXISTS printed,
DROP COLUMN IF EXISTS printed_at,
DROP COLUMN IF EXISTS assigned_to,
DROP COLUMN IF EXISTS assigned_vehicle,
DROP COLUMN IF EXISTS loaded,
DROP COLUMN IF EXISTS loaded_at,
DROP COLUMN IF EXISTS assignment_date;

-- Remove columns from order_items
ALTER TABLE order_items
DROP COLUMN IF EXISTS free_goods,
DROP COLUMN IF EXISTS total_quantity,
DROP COLUMN IF EXISTS unit_price,
DROP COLUMN IF EXISTS use_code,
DROP COLUMN IF EXISTS discount_percent;
```

---

## Troubleshooting

### Error: "relation does not exist"
- Make sure the database and tables exist
- Run `backend/db/init.sql` first if this is a fresh setup

### Error: "permission denied"
- Check database user permissions
- Ensure user has ALTER TABLE privileges

### Error: "column already exists"
- The migration uses `IF NOT EXISTS`, so this shouldn't happen
- If it does, the column might have been added manually

### Docker: "container not found"
- Start Docker containers: `docker-compose up -d`
- Check container name: `docker ps -a`

