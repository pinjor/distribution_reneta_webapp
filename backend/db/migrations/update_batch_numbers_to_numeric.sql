-- Update existing batch numbers to numeric format
-- This script updates batch numbers from text format (BATCH-XXX-2024-XXX) to numeric format (2024XXX)

BEGIN;

-- Update batch numbers in product_item_stock_details
UPDATE product_item_stock_details 
SET batch_no = CASE 
    WHEN batch_no = 'BATCH-OME-2024-001' THEN '2024001'
    WHEN batch_no = 'BATCH-OME-2024-002' THEN '2024002'
    WHEN batch_no = 'BATCH-OME-2024-003' THEN '2024003'
    WHEN batch_no = 'BATCH-PAR-2024-001' THEN '2024004'
    WHEN batch_no = 'BATCH-PAR-2024-002' THEN '2024005'
    WHEN batch_no = 'BATCH-AMX-2024-001' THEN '2024006'
    WHEN batch_no = 'BATCH-AMX-2024-002' THEN '2024007'
    WHEN batch_no = 'BATCH-AMX-2024-003' THEN '2024008'
    WHEN batch_no = 'BATCH-CET-2024-001' THEN '2024009'
    WHEN batch_no = 'BATCH-MET-2024-001' THEN '2024010'
    WHEN batch_no = 'BATCH-MET-2024-002' THEN '2024011'
    WHEN batch_no = 'BATCH-IBU-2024-001' THEN '2024012'
    WHEN batch_no = 'BATCH-IBU-2024-002' THEN '2024013'
    WHEN batch_no = 'BATCH-IBU-2024-003' THEN '2024014'
    WHEN batch_no = 'BATCH-AML-2024-001' THEN '2024015'
    WHEN batch_no = 'BATCH-AML-2024-002' THEN '2024016'
    WHEN batch_no = 'BATCH-ATO-2024-001' THEN '2024017'
    WHEN batch_no = 'BATCH-ATO-2024-002' THEN '2024018'
    WHEN batch_no = 'BATCH-ATO-2024-003' THEN '2024019'
    WHEN batch_no = 'BATCH-LEV-2024-001' THEN '2024020'
    WHEN batch_no = 'BATCH-LEV-2024-002' THEN '2024021'
    WHEN batch_no = 'BATCH-BET-2024-001' THEN '2024022'
    ELSE batch_no
END
WHERE batch_no LIKE 'BATCH-%';

-- Show updated batch numbers
SELECT batch_no, COUNT(*) as count 
FROM product_item_stock_details 
GROUP BY batch_no 
ORDER BY batch_no;

COMMIT;

