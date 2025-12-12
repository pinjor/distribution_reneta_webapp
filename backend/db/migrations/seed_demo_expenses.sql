-- Seed demo expense data for trips
-- This creates sample expenses for existing trips with shipping point distribution

-- First, ensure created_at and updated_at are set
UPDATE transport_expenses 
SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL OR updated_at IS NULL;

-- Add fuel expenses for trips
INSERT INTO transport_expenses (trip_id, trip_number, route_id, expense_type, amount, description, expense_date, is_auto_calculated, created_at, updated_at)
SELECT 
    t.id as trip_id,
    t.trip_number,
    t.route_id,
    'fuel' as expense_type,
    CASE 
        WHEN t.distance_km IS NOT NULL AND v.fuel_rate IS NOT NULL 
        THEN (t.distance_km * v.fuel_rate)
        ELSE 500.00
    END as amount,
    'Auto-calculated fuel cost for ' || COALESCE(t.distance_km::text, '0') || ' km' as description,
    t.trip_date as expense_date,
    true as is_auto_calculated,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM trips t
LEFT JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.trip_number IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number AND te.expense_type = 'fuel'
  )
LIMIT 10;

-- Add toll expenses
INSERT INTO transport_expenses (trip_id, trip_number, route_id, expense_type, amount, description, expense_date, is_auto_calculated, created_at, updated_at)
SELECT 
    t.id as trip_id,
    t.trip_number,
    t.route_id,
    'toll' as expense_type,
    150.00 + (random() * 100)::numeric(10,2) as amount,
    'Highway toll charges' as description,
    t.trip_date as expense_date,
    false as is_auto_calculated,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM trips t
WHERE t.trip_number IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number
  )
  AND NOT EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number AND te.expense_type = 'toll'
  )
LIMIT 5;

-- Add maintenance expenses
INSERT INTO transport_expenses (trip_id, trip_number, route_id, expense_type, amount, description, expense_date, is_auto_calculated, created_at, updated_at)
SELECT 
    t.id as trip_id,
    t.trip_number,
    t.route_id,
    'maintenance' as expense_type,
    300.00 + (random() * 200)::numeric(10,2) as amount,
    'Regular vehicle maintenance' as description,
    t.trip_date + INTERVAL '1 day' as expense_date,
    false as is_auto_calculated,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM trips t
WHERE t.trip_number IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number
  )
  AND NOT EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number AND te.expense_type = 'maintenance'
  )
LIMIT 3;

-- Add repair expenses
INSERT INTO transport_expenses (trip_id, trip_number, route_id, expense_type, amount, description, expense_date, is_auto_calculated, created_at, updated_at)
SELECT 
    t.id as trip_id,
    t.trip_number,
    t.route_id,
    'repair' as expense_type,
    500.00 + (random() * 300)::numeric(10,2) as amount,
    'Minor repair work' as description,
    t.trip_date + INTERVAL '2 days' as expense_date,
    false as is_auto_calculated,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM trips t
WHERE t.trip_number IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number
  )
  AND NOT EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number AND te.expense_type = 'repair'
  )
LIMIT 2;

-- Add other miscellaneous expenses
INSERT INTO transport_expenses (trip_id, trip_number, route_id, expense_type, amount, description, expense_date, is_auto_calculated, created_at, updated_at)
SELECT 
    t.id as trip_id,
    t.trip_number,
    t.route_id,
    'other' as expense_type,
    100.00 + (random() * 150)::numeric(10,2) as amount,
    'Miscellaneous expenses' as description,
    t.trip_date + INTERVAL '1 day' as expense_date,
    false as is_auto_calculated,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM trips t
WHERE t.trip_number IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number
  )
  AND (SELECT COUNT(*) FROM transport_expenses te WHERE te.trip_number = t.trip_number) < 4
LIMIT 5;

