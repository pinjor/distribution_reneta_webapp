-- Seed Route Shipping Points Data
-- This adds sample shipping points to routes with distances

-- Get route and shipping point IDs dynamically and insert sample data
INSERT INTO route_shipping_points (route_id, shipping_point_id, distance_km, sequence, is_active)
SELECT 
    r.id as route_id,
    sp.id as shipping_point_id,
    CASE 
        WHEN sp.id % 3 = 0 THEN 15.5
        WHEN sp.id % 3 = 1 THEN 25.3
        ELSE 35.7
    END as distance_km,
    ROW_NUMBER() OVER (PARTITION BY r.id ORDER BY sp.id) as sequence,
    true as is_active
FROM routes r
CROSS JOIN shipping_points sp
WHERE r.id IN (SELECT id FROM routes LIMIT 3)  -- Add to first 3 routes
  AND sp.id IN (SELECT id FROM shipping_points LIMIT 5)  -- Use first 5 shipping points
ON CONFLICT (route_id, shipping_point_id) DO NOTHING;

-- Alternative: Insert specific route-shipping point combinations
-- Uncomment and modify as needed based on your actual data

/*
-- Example for specific routes (adjust IDs based on your data)
INSERT INTO route_shipping_points (route_id, shipping_point_id, distance_km, sequence, is_active) VALUES
(1, 1, 10.5, 1, true),
(1, 2, 25.3, 2, true),
(1, 3, 40.8, 3, true),
(2, 1, 12.0, 1, true),
(2, 2, 28.5, 2, true),
(2, 4, 45.2, 3, true),
(3, 1, 8.5, 1, true),
(3, 3, 22.0, 2, true),
(3, 5, 38.7, 3, true)
ON CONFLICT (route_id, shipping_point_id) DO NOTHING;
*/

