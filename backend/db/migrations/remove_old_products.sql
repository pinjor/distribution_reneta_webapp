-- Remove old products that don't match the new medicine product codes
-- This will keep only the products with codes: M01000001, M02000045, M03000078, M04000123, M05000156, M06000234, M07000345, M08000456, M09000567, M10000678

-- List of medicine product codes to keep
-- M01000001 - Paracetamol Tablet 500 mg
-- M02000045 - Amoxicillin Capsule 250 mg
-- M03000078 - Cetirizine Tablet 10 mg
-- M04000123 - Omeprazole Capsule 20 mg
-- M05000156 - Metformin Tablet 500 mg
-- M06000234 - Ibuprofen Tablet 400 mg
-- M07000345 - Amlodipine Tablet 5 mg
-- M08000456 - Atorvastatin Tablet 10 mg
-- M09000567 - Levetiracetam Injection 100 ml
-- M10000678 - Betahistine Tablet 16 mg

BEGIN;

-- First, delete stock details for old products
DELETE FROM product_item_stock_details 
WHERE item_code IN (
    SELECT pis.id 
    FROM product_item_stock pis
    JOIN products p ON pis.product_id = p.id
    WHERE p.code NOT IN ('M01000001', 'M02000045', 'M03000078', 'M04000123', 'M05000156', 'M06000234', 'M07000345', 'M08000456', 'M09000567', 'M10000678')
);

-- Delete stock records for old products
DELETE FROM product_item_stock 
WHERE product_id IN (
    SELECT id FROM products 
    WHERE code NOT IN ('M01000001', 'M02000045', 'M03000078', 'M04000123', 'M05000156', 'M06000234', 'M07000345', 'M08000456', 'M09000567', 'M10000678')
);

-- Delete from stock_ledger for old products
DELETE FROM stock_ledger 
WHERE product_id IN (
    SELECT id FROM products 
    WHERE code NOT IN ('M01000001', 'M02000045', 'M03000078', 'M04000123', 'M05000156', 'M06000234', 'M07000345', 'M08000456', 'M09000567', 'M10000678')
);

-- Delete old products
DELETE FROM products 
WHERE code NOT IN ('M01000001', 'M02000045', 'M03000078', 'M04000123', 'M05000156', 'M06000234', 'M07000345', 'M08000456', 'M09000567', 'M10000678');

-- Show remaining products
SELECT id, code, sku, name, is_active FROM products ORDER BY code;

COMMIT;

