-- Seed demo data for routes and orders
-- This creates sample routes and orders for testing the route-wise order management

-- First, ensure we have routes (they should already exist from init.sql)
-- If not, create them:
INSERT INTO routes (route_id, name, depot_id, stops, distance, avg_time, status)
VALUES 
    ('R-1', 'Route R-1', 1, 12, '45 km', '4h 30m', 'Active'),
    ('R-2', 'Route R-2', 1, 15, '52 km', '5h 15m', 'Active'),
    ('R-3', 'Route R-3', 1, 8, '28 km', '3h', 'Active'),
    ('R-4', 'Route R-4', 1, 10, '38 km', '4h', 'Active'),
    ('R-5', 'Route R-5', 1, 6, '22 km', '2h 30m', 'Active')
ON CONFLICT (route_id) DO NOTHING;

-- Create sample approved orders with route assignments
-- Note: This assumes you have customers, employees, and products already in the database

-- Route R-1 Orders
INSERT INTO orders (
    order_number, depot_code, depot_name, customer_id, customer_name, customer_code,
    pso_id, pso_name, pso_code, route_code, route_name, delivery_date, status, validated, printed
)
SELECT 
    'ORD-2025-001', '120', 'Kushtia Depot', 
    CAST(id AS VARCHAR), name, code,
    'PSO-001', 'Rahim Uddin', 'PSO-001',
    'R-1', 'Route R-1', CURRENT_DATE + INTERVAL '7 days',
    'Approved', TRUE, FALSE
FROM customers LIMIT 1
ON CONFLICT DO NOTHING
RETURNING id;

-- Get the order ID and create items
DO $$
DECLARE
    order_id_val INTEGER;
    product_id_val INTEGER;
BEGIN
    -- Get first order ID
    SELECT id INTO order_id_val FROM orders WHERE order_number = 'ORD-2025-001' LIMIT 1;
    
    -- Get a product
    SELECT id INTO product_id_val FROM products LIMIT 1;
    
    IF order_id_val IS NOT NULL AND product_id_val IS NOT NULL THEN
        -- Insert order items for R-1
        INSERT INTO order_items (
            order_id, old_code, new_code, product_name, pack_size, quantity,
            free_goods, total_quantity, trade_price, unit_price, use_code, discount_percent,
            delivery_date, selected
        )
        VALUES 
            (order_id_val, 'M01000676', 'N01000676', 'Tab Betahistine Dihydrochloride 16 mg', 'Blister', 100, 5, 105, 120, 120, 'M01000676', 5, CURRENT_DATE + INTERVAL '7 days', TRUE),
            (order_id_val, 'M03000079', 'N03000079', 'Levetiracetam Syrup 100 ml', 'Bottle', 50, 2, 52, 220, 220, 'M03000079', 0, CURRENT_DATE + INTERVAL '7 days', TRUE);
    END IF;
END $$;

-- Route R-2 Orders
INSERT INTO orders (
    order_number, depot_code, depot_name, customer_id, customer_name, customer_code,
    pso_id, pso_name, pso_code, route_code, route_name, delivery_date, status, validated, printed
)
SELECT 
    'ORD-2025-002', '120', 'Kushtia Depot', 
    CAST(id AS VARCHAR), name, code,
    'PSO-002', 'Karim Ahmed', 'PSO-002',
    'R-2', 'Route R-2', CURRENT_DATE + INTERVAL '7 days',
    'Approved', TRUE, FALSE
FROM customers OFFSET 1 LIMIT 1
ON CONFLICT DO NOTHING
RETURNING id;

DO $$
DECLARE
    order_id_val INTEGER;
BEGIN
    SELECT id INTO order_id_val FROM orders WHERE order_number = 'ORD-2025-002' LIMIT 1;
    
    IF order_id_val IS NOT NULL THEN
        INSERT INTO order_items (
            order_id, old_code, new_code, product_name, pack_size, quantity,
            free_goods, total_quantity, trade_price, unit_price, use_code, discount_percent,
            delivery_date, selected
        )
        VALUES 
            (order_id_val, 'M04000123', 'N04000123', 'Omeprazole Capsule 20 mg', 'Bottle', 75, 3, 78, 95, 95, 'M04000123', 10, CURRENT_DATE + INTERVAL '7 days', TRUE);
    END IF;
END $$;

-- Route R-3 Orders
INSERT INTO orders (
    order_number, depot_code, depot_name, customer_id, customer_name, customer_code,
    pso_id, pso_name, pso_code, route_code, route_name, delivery_date, status, validated, printed
)
SELECT 
    'ORD-2025-003', '120', 'Kushtia Depot', 
    CAST(id AS VARCHAR), name, code,
    'PSO-003', 'Farhana Akter', 'PSO-003',
    'R-3', 'Route R-3', CURRENT_DATE + INTERVAL '7 days',
    'Approved', TRUE, TRUE
FROM customers OFFSET 2 LIMIT 1
ON CONFLICT DO NOTHING
RETURNING id;

DO $$
DECLARE
    order_id_val INTEGER;
BEGIN
    SELECT id INTO order_id_val FROM orders WHERE order_number = 'ORD-2025-003' LIMIT 1;
    
    IF order_id_val IS NOT NULL THEN
        INSERT INTO order_items (
            order_id, old_code, new_code, product_name, pack_size, quantity,
            free_goods, total_quantity, trade_price, unit_price, use_code, discount_percent,
            delivery_date, selected
        )
        VALUES 
            (order_id_val, 'M01000676', 'N01000676', 'Tab Betahistine Dihydrochloride 16 mg', 'Blister', 200, 10, 210, 120, 120, 'M01000676', 0, CURRENT_DATE + INTERVAL '7 days', TRUE);
        
        -- Mark as printed
        UPDATE orders SET printed = TRUE, printed_at = CURRENT_TIMESTAMP WHERE id = order_id_val;
    END IF;
END $$;

-- Route R-4 Orders (multiple)
INSERT INTO orders (
    order_number, depot_code, depot_name, customer_id, customer_name, customer_code,
    pso_id, pso_name, pso_code, route_code, route_name, delivery_date, status, validated, printed, loaded
)
SELECT 
    'ORD-2025-004', '120', 'Kushtia Depot', 
    CAST(id AS VARCHAR), name, code,
    'PSO-001', 'Rahim Uddin', 'PSO-001',
    'R-4', 'Route R-4', CURRENT_DATE + INTERVAL '7 days',
    'Approved', TRUE, TRUE, TRUE
FROM customers LIMIT 1
ON CONFLICT DO NOTHING
RETURNING id;

DO $$
DECLARE
    order_id_val INTEGER;
BEGIN
    SELECT id INTO order_id_val FROM orders WHERE order_number = 'ORD-2025-004' LIMIT 1;
    
    IF order_id_val IS NOT NULL THEN
        INSERT INTO order_items (
            order_id, old_code, new_code, product_name, pack_size, quantity,
            free_goods, total_quantity, trade_price, unit_price, use_code, discount_percent,
            delivery_date, selected
        )
        VALUES 
            (order_id_val, 'M03000079', 'N03000079', 'Levetiracetam Syrup 100 ml', 'Bottle', 150, 7, 157, 220, 220, 'M03000079', 5, CURRENT_DATE + INTERVAL '7 days', TRUE);
        
        -- Mark as printed and loaded
        UPDATE orders SET 
            printed = TRUE, 
            printed_at = CURRENT_TIMESTAMP,
            loaded = TRUE,
            loaded_at = CURRENT_TIMESTAMP
        WHERE id = order_id_val;
    END IF;
END $$;

-- Route R-5 Orders
INSERT INTO orders (
    order_number, depot_code, depot_name, customer_id, customer_name, customer_code,
    pso_id, pso_name, pso_code, route_code, route_name, delivery_date, status, validated
)
SELECT 
    'ORD-2025-005', '120', 'Kushtia Depot', 
    CAST(id AS VARCHAR), name, code,
    'PSO-002', 'Karim Ahmed', 'PSO-002',
    'R-5', 'Route R-5', CURRENT_DATE + INTERVAL '7 days',
    'Approved', FALSE
FROM customers OFFSET 1 LIMIT 1
ON CONFLICT DO NOTHING
RETURNING id;

DO $$
DECLARE
    order_id_val INTEGER;
BEGIN
    SELECT id INTO order_id_val FROM orders WHERE order_number = 'ORD-2025-005' LIMIT 1;
    
    IF order_id_val IS NOT NULL THEN
        INSERT INTO order_items (
            order_id, old_code, new_code, product_name, pack_size, quantity,
            free_goods, total_quantity, trade_price, unit_price, use_code, discount_percent,
            delivery_date, selected
        )
        VALUES 
            (order_id_val, 'M04000123', 'N04000123', 'Omeprazole Capsule 20 mg', 'Bottle', 80, 4, 84, 95, 95, 'M04000123', 0, CURRENT_DATE + INTERVAL '7 days', TRUE);
    END IF;
END $$;

-- Summary
SELECT 
    route_code,
    COUNT(*) as total_orders,
    SUM(CASE WHEN validated THEN 1 ELSE 0 END) as validated_orders,
    SUM(CASE WHEN printed THEN 1 ELSE 0 END) as printed_orders,
    SUM(CASE WHEN loaded THEN 1 ELSE 0 END) as loaded_orders
FROM orders
WHERE route_code IN ('R-1', 'R-2', 'R-3', 'R-4', 'R-5')
GROUP BY route_code
ORDER BY route_code;

