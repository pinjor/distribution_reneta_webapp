-- Seed sample expense data for trips
-- This creates sample expenses for existing trips

-- First, get some trips that have trip_numbers
-- Then create expenses for those trips

INSERT INTO transport_expenses (trip_id, trip_number, route_id, expense_type, amount, description, expense_date, is_auto_calculated)
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
    'Auto-calculated fuel cost' as description,
    t.trip_date as expense_date,
    true as is_auto_calculated
FROM trips t
LEFT JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.trip_number IS NOT NULL
  AND t.trip_date >= CURRENT_DATE - INTERVAL '30 days'
  AND NOT EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number AND te.expense_type = 'fuel'
  )
LIMIT 10;

-- Add some additional expenses (toll, maintenance, etc.)
INSERT INTO transport_expenses (trip_id, trip_number, route_id, expense_type, amount, description, expense_date, is_auto_calculated)
SELECT 
    t.id as trip_id,
    t.trip_number,
    t.route_id,
    CASE (ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY t.id) % 4)
        WHEN 0 THEN 'toll'
        WHEN 1 THEN 'maintenance'
        WHEN 2 THEN 'repair'
        ELSE 'other'
    END as expense_type,
    CASE (ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY t.id) % 4)
        WHEN 0 THEN 150.00
        WHEN 1 THEN 300.00
        WHEN 2 THEN 500.00
        ELSE 200.00
    END as amount,
    CASE (ROW_NUMBER() OVER (PARTITION BY t.id ORDER BY t.id) % 4)
        WHEN 0 THEN 'Highway toll charges'
        WHEN 1 THEN 'Regular maintenance'
        WHEN 2 THEN 'Minor repair work'
        ELSE 'Miscellaneous expenses'
    END as description,
    t.trip_date + INTERVAL '1 day' as expense_date,
    false as is_auto_calculated
FROM trips t
WHERE t.trip_number IS NOT NULL
  AND t.trip_date >= CURRENT_DATE - INTERVAL '30 days'
  AND EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number
  )
LIMIT 15;

