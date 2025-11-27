-- Add memo_number column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS memo_number VARCHAR(8) UNIQUE;

-- Create index on memo_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_memo_number ON orders(memo_number);

-- Remove use_code column from order_items table
ALTER TABLE order_items DROP COLUMN IF EXISTS use_code;

