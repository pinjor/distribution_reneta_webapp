-- Fix validation status for approved orders
-- Run this if the previous migration had an error on the last UPDATE

-- Mark approved orders as validated
UPDATE orders
SET validated = TRUE
WHERE status::text = 'Approved' OR status::text = 'Partially Approved';

