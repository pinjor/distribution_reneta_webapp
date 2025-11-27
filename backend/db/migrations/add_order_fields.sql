-- Migration: Add new fields to orders and order_items tables
-- Date: 2025-01-XX
-- Description: Add fields for route-wise order management, free goods, discounts, and assignment tracking

-- Add new fields to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS free_goods NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_quantity NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS use_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0;

-- Calculate total_quantity for existing records
UPDATE order_items
SET total_quantity = quantity + COALESCE(free_goods, 0)
WHERE total_quantity IS NULL;

-- Set unit_price to trade_price for existing records
UPDATE order_items
SET unit_price = trade_price
WHERE unit_price IS NULL;

-- Add new fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS route_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS route_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS printed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS printed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS assigned_vehicle INTEGER REFERENCES vehicles(id),
ADD COLUMN IF NOT EXISTS loaded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS loaded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS assignment_date TIMESTAMP;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_route_code ON orders(route_code);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_vehicle ON orders(assigned_vehicle);
CREATE INDEX IF NOT EXISTS idx_orders_validated ON orders(validated);
CREATE INDEX IF NOT EXISTS idx_orders_printed ON orders(printed);
CREATE INDEX IF NOT EXISTS idx_orders_loaded ON orders(loaded);

-- Mark approved orders as validated
-- Cast enum to text for comparison
UPDATE orders
SET validated = TRUE
WHERE status::text = 'Approved' OR status::text = 'Partially Approved';

