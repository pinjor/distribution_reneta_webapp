-- Make depot_code and depot_name nullable in orders table
-- This allows orders to be created without a depot (central store model)

ALTER TABLE orders 
ALTER COLUMN depot_code DROP NOT NULL,
ALTER COLUMN depot_name DROP NOT NULL;

