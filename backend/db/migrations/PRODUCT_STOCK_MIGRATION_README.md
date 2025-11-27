# Product Stock Tables Migration

## Overview

This migration creates a new stock management system with two main tables:
1. **product_item_stock** - Main stock table with aggregated quantities
2. **product_item_stock_details** - Batch-wise stock details

## Database Schema

### product_item_stock (Main Table)
- `id` - Primary key
- `product_id` - Foreign key to products table
- `product_code` - Product code (e.g., M04000123)
- `sku_code` - SKU code (e.g., SKU-M04000123)
- `gross_stock_receive` - Total stock received
- `issue` - Total stock issued
- `stock_qty` - Current stock quantity
- `adjusted_stock_in_qty` - Adjusted stock in quantity
- `adjusted_stock_out_qty` - Adjusted stock out quantity
- `depot_id` - Foreign key to depots table
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### product_item_stock_details (Details Table)
- `id` - Primary key
- `item_code` - Foreign key to product_item_stock
- `batch_no` - Batch number
- `expiry_date` - Expiry date
- `quantity` - Batch quantity
- `available_quantity` - Available quantity
- `reserved_quantity` - Reserved quantity
- `manufacturing_date` - Manufacturing date
- `storage_type` - Storage condition
- `status` - Status (Unrestricted/Restricted/Hold)
- `source_type` - Source type (FACTORY/DEPOT/RETURN)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Product Architecture

All products now follow a consistent architecture:
- **Product Code**: Format `M######` (e.g., M04000123)
- **SKU Code**: Format `SKU-M######` (e.g., SKU-M04000123)
- **Product Name**: Medicine name (e.g., "Omeprazole Capsule 20 mg")
- **Generic Name**: Active ingredient (e.g., "Omeprazole")

## Seed Data

The seed script creates 10 medicine products with:
- Consistent product codes and SKU codes
- Medicine names as product names
- Multiple batches per product (1-3 batches each)
- Proper expiry dates and manufacturing dates
- Stock quantities matching batch totals

### Products Included:
1. Omeprazole Capsule 20 mg (3 batches)
2. Paracetamol Tablet 500 mg (2 batches)
3. Amoxicillin Capsule 250 mg (3 batches)
4. Cetirizine Tablet 10 mg (1 batch)
5. Metformin Tablet 500 mg (2 batches)
6. Ibuprofen Tablet 400 mg (3 batches)
7. Amlodipine Tablet 5 mg (2 batches)
8. Atorvastatin Tablet 10 mg (3 batches)
9. Levetiracetam Injection 100 ml (2 batches)
10. Betahistine Tablet 16 mg (1 batch)

## Running the Migration

### Option 1: Using PowerShell Script (Recommended)
```powershell
cd backend/db/migrations
.\run_product_stock_migration.ps1
```

### Option 2: Manual Steps

1. **Run the migration SQL:**
   ```bash
   # In Docker
   docker exec -i <db_container> psql -U postgres -d swift_distro_hub < create_product_stock_tables.sql
   
   # Or locally
   psql -U postgres -d swift_distro_hub -f create_product_stock_tables.sql
   ```

2. **Run the seed script:**
   ```bash
   # In Docker
   docker exec <backend_container> python db/seed_product_stock_data.py
   
   # Or locally
   cd backend
   python db/seed_product_stock_data.py
   ```

## API Endpoints

### Product Item Stock
- `GET /api/product-item-stock` - Get all stock records
- `GET /api/product-item-stock/{id}` - Get specific stock record
- `POST /api/product-item-stock` - Create new stock record
- `PUT /api/product-item-stock/{id}` - Update stock record
- `GET /api/product-item-stock/{id}/details` - Get batch details
- `POST /api/product-item-stock/{id}/details` - Add batch detail
- `GET /api/product-item-stock/product/{product_id}/summary` - Get product stock summary

## Verification

After running the migration, verify the data:

```sql
-- Check stock records
SELECT COUNT(*) FROM product_item_stock;

-- Check batch details
SELECT COUNT(*) FROM product_item_stock_details;

-- View stock summary
SELECT 
    p.name,
    pis.product_code,
    pis.sku_code,
    pis.stock_qty,
    pis.gross_stock_receive,
    pis.issue,
    COUNT(pisd.id) as batch_count
FROM product_item_stock pis
JOIN products p ON pis.product_id = p.id
LEFT JOIN product_item_stock_details pisd ON pis.id = pisd.item_code
GROUP BY p.name, pis.product_code, pis.sku_code, pis.stock_qty, pis.gross_stock_receive, pis.issue;
```

## Notes

- The migration creates unique constraints on `(product_id, depot_id)` for stock records
- Batch details have unique constraint on `(item_code, batch_no)`
- Stock quantities are automatically calculated from batch details
- All timestamps are automatically managed (created_at, updated_at)

