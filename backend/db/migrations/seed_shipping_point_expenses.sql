-- Seed expenses distributed across shipping points for trips
-- This creates expenses that are better distributed across shipping points

-- First, let's create more expenses for trips that have route shipping points
-- We'll create expenses for each shipping point in a route

-- Get trips with their routes and shipping points
-- Create fuel expenses for each shipping point based on distance
INSERT INTO transport_expenses (trip_id, trip_number, route_id, expense_type, amount, description, expense_date, is_auto_calculated, created_at, updated_at)
SELECT 
    t.id as trip_id,
    t.trip_number,
    t.route_id,
    'fuel' as expense_type,
    CASE 
        WHEN rsp.distance_km IS NOT NULL AND v.fuel_rate IS NOT NULL 
        THEN (rsp.distance_km * v.fuel_rate * 0.2)  -- 20% of distance for each shipping point
        ELSE 100.00 + (rsp.sequence * 20.00)
    END as amount,
    'Fuel cost for shipping point ' || rsp.sequence || ' (' || COALESCE(rsp.distance_km::text, '0') || ' km)' as description,
    t.trip_date + (rsp.sequence - 1) * INTERVAL '1 hour' as expense_date,
    true as is_auto_calculated,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM trips t
INNER JOIN route_shipping_points rsp ON t.route_id = rsp.route_id
LEFT JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.trip_number IS NOT NULL
  AND rsp.is_active = true
  AND NOT EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number 
        AND te.description LIKE '%shipping point ' || rsp.sequence || '%'
  )
LIMIT 20;

-- Add toll expenses for some shipping points
INSERT INTO transport_expenses (trip_id, trip_number, route_id, expense_type, amount, description, expense_date, is_auto_calculated, created_at, updated_at)
SELECT 
    t.id as trip_id,
    t.trip_number,
    t.route_id,
    'toll' as expense_type,
    50.00 + (rsp.sequence * 10.00) + (random() * 30)::numeric(10,2) as amount,
    'Toll charges at shipping point ' || rsp.sequence || ' - ' || COALESCE(sp.name, 'Point ' || rsp.sequence) as description,
    t.trip_date + (rsp.sequence - 1) * INTERVAL '1 hour' as expense_date,
    false as is_auto_calculated,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM trips t
INNER JOIN route_shipping_points rsp ON t.route_id = rsp.route_id
LEFT JOIN shipping_points sp ON rsp.shipping_point_id = sp.id
WHERE t.trip_number IS NOT NULL
  AND rsp.is_active = true
  AND rsp.sequence IN (1, 3, 5)  -- Add tolls to specific shipping points
  AND NOT EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number 
        AND te.expense_type = 'toll'
        AND te.description LIKE '%shipping point ' || rsp.sequence || '%'
  )
LIMIT 15;

-- Add maintenance expenses for some shipping points
INSERT INTO transport_expenses (trip_id, trip_number, route_id, expense_type, amount, description, expense_date, is_auto_calculated, created_at, updated_at)
SELECT 
    t.id as trip_id,
    t.trip_number,
    t.route_id,
    'maintenance' as expense_type,
    150.00 + (rsp.sequence * 25.00) + (random() * 50)::numeric(10,2) as amount,
    'Maintenance at shipping point ' || rsp.sequence || ' - ' || COALESCE(sp.name, 'Point ' || rsp.sequence) as description,
    t.trip_date + (rsp.sequence - 1) * INTERVAL '2 hours' as expense_date,
    false as is_auto_calculated,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM trips t
INNER JOIN route_shipping_points rsp ON t.route_id = rsp.route_id
LEFT JOIN shipping_points sp ON rsp.shipping_point_id = sp.id
WHERE t.trip_number IS NOT NULL
  AND rsp.is_active = true
  AND rsp.sequence IN (2, 4)  -- Add maintenance to specific shipping points
  AND NOT EXISTS (
      SELECT 1 FROM transport_expenses te 
      WHERE te.trip_number = t.trip_number 
        AND te.expense_type = 'maintenance'
        AND te.description LIKE '%shipping point ' || rsp.sequence || '%'
  )
LIMIT 10;

-- Add other miscellaneous expenses
INSERT INTO transport_expenses (trip_id, trip_number, route_id, expense_type, amount, description, expense_date, is_auto_calculated, created_at, updated_at)
SELECT 
    t.id as trip_id,
    t.trip_number,
    t.route_id,
    'other' as expense_type,
    30.00 + (rsp.sequence * 5.00) + (random() * 20)::numeric(10,2) as amount,
    'Miscellaneous expenses at shipping point ' || rsp.sequence || ' - ' || COALESCE(sp.name, 'Point ' || rsp.sequence) as description,
    t.trip_date + (rsp.sequence - 1) * INTERVAL '1 hour' as expense_date,
    false as is_auto_calculated,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM trips t
INNER JOIN route_shipping_points rsp ON t.route_id = rsp.route_id
LEFT JOIN shipping_points sp ON rsp.shipping_point_id = sp.id
WHERE t.trip_number IS NOT NULL
  AND rsp.is_active = true
  AND rsp.sequence IN (1, 2, 3, 4, 5)  -- Add to all shipping points
  AND (SELECT COUNT(*) FROM transport_expenses te WHERE te.trip_number = t.trip_number AND te.expense_type = 'other' AND te.description LIKE '%shipping point ' || rsp.sequence || '%') = 0
LIMIT 25;

