-- Verification script to check if migration was successful

-- Check order_items columns
SELECT 
    'order_items' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name IN ('free_goods', 'total_quantity', 'unit_price', 'use_code', 'discount_percent')
ORDER BY column_name;

-- Check orders columns
SELECT 
    'orders' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('route_code', 'route_name', 'validated', 'printed', 'printed_at', 'assigned_to', 'assigned_vehicle', 'loaded', 'loaded_at', 'assignment_date')
ORDER BY column_name;

-- Check indexes
SELECT 
    indexname,
    tablename
FROM pg_indexes 
WHERE tablename = 'orders' 
AND indexname LIKE 'idx_orders_%'
ORDER BY indexname;

-- Summary
SELECT 
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'order_items' AND column_name IN ('free_goods', 'total_quantity', 'unit_price', 'use_code', 'discount_percent')) as order_items_new_cols,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'orders' AND column_name IN ('route_code', 'route_name', 'validated', 'printed', 'printed_at', 'assigned_to', 'assigned_vehicle', 'loaded', 'loaded_at', 'assignment_date')) as orders_new_cols,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'orders' AND indexname LIKE 'idx_orders_%') as new_indexes;

