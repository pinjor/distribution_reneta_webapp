-- Migration: Add Mobile Acceptance Fields to Orders Table
-- Date: 2025-01-25
-- Description: Adds fields to track memo acceptance from mobile app

-- Add mobile acceptance columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS mobile_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mobile_accepted_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS mobile_accepted_at TIMESTAMP;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_mobile_accepted ON orders(mobile_accepted);
CREATE INDEX IF NOT EXISTS idx_orders_mobile_accepted_by ON orders(mobile_accepted_by);
CREATE INDEX IF NOT EXISTS idx_orders_loading_number_mobile ON orders(loading_number, mobile_accepted);

-- Add comment to columns
COMMENT ON COLUMN orders.mobile_accepted IS 'Whether memo was accepted by mobile user';
COMMENT ON COLUMN orders.mobile_accepted_by IS 'Mobile app user ID who accepted the memo';
COMMENT ON COLUMN orders.mobile_accepted_at IS 'Timestamp when memo was accepted by mobile user';

