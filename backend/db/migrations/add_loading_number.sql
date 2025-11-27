-- Add loading_number field to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loading_number VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loading_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS area VARCHAR(100);

-- Create index for loading_number
CREATE INDEX IF NOT EXISTS idx_orders_loading_number ON orders(loading_number);

-- Add comment
COMMENT ON COLUMN orders.loading_number IS 'Unique loading number assigned when orders are assigned to employee and vehicle';

