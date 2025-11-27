-- Clear all orders and related data
-- This script removes all orders, order items, and related data
-- Delete in order to respect foreign key constraints

-- Delete delivery_order_items first (references order_items)
DELETE FROM delivery_order_items;

-- Delete delivery_orders (references orders)
DELETE FROM delivery_orders;

-- Delete picking_order_items if exists (references order_items)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'picking_order_items') THEN
        DELETE FROM picking_order_items;
    END IF;
END $$;

-- Delete picking_orders if exists (references orders)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'picking_orders') THEN
        DELETE FROM picking_orders;
    END IF;
END $$;

-- Delete order items (due to foreign key constraint)
DELETE FROM order_items;

-- Delete orders
DELETE FROM orders;

-- Reset sequences
ALTER SEQUENCE orders_id_seq RESTART WITH 1;
ALTER SEQUENCE order_items_id_seq RESTART WITH 1;

-- Verify deletion
SELECT COUNT(*) as remaining_orders FROM orders;
SELECT COUNT(*) as remaining_order_items FROM order_items;

