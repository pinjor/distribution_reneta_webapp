-- Migration: Add postponed column to orders table
-- This column tracks orders that are postponed from mobile app by delivery person

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS postponed BOOLEAN DEFAULT FALSE;

-- Add comment to column
COMMENT ON COLUMN orders.postponed IS 'Indicates if the order is postponed from mobile app by delivery person';

