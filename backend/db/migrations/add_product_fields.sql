-- Migration: Add new product fields
-- Add new columns to products table

ALTER TABLE products
ADD COLUMN IF NOT EXISTS sku VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS old_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS new_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS generic_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS primary_packaging VARCHAR(50),
ADD COLUMN IF NOT EXISTS product_type_commercial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS product_type_sample BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS product_type_institutional BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS product_type_export BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ifc_value1 NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS ifc_value2 NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS ifc_result NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS mc_value1 NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS mc_value2 NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS mc_value3 NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS mc_result NUMERIC(10, 2);

-- Generate SKU for existing products if they don't have one
UPDATE products
SET sku = 'PRD-' || LPAD(CAST(id AS VARCHAR), 4, '0')
WHERE sku IS NULL OR sku = '';

-- Make sku NOT NULL after populating existing records
ALTER TABLE products
ALTER COLUMN sku SET NOT NULL;

-- Create index on sku for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

