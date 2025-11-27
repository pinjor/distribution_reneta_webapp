-- Migration: Update order_items table
-- 1. Add product_code column (rename from old_code if it exists)
-- 2. Remove new_code column
-- 3. Add batch_number column
-- 4. Add current_stock column

BEGIN;

-- Step 1: Add new columns first
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS product_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS current_stock NUMERIC(12, 2);

-- Step 2: Copy data from old_code to product_code (if old_code exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'old_code'
    ) THEN
        UPDATE order_items
        SET product_code = old_code
        WHERE product_code IS NULL AND old_code IS NOT NULL;
    END IF;
END $$;

-- Step 3: Make product_code NOT NULL (only if there's no NULL data)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM order_items WHERE product_code IS NULL) THEN
        ALTER TABLE order_items
        ALTER COLUMN product_code SET NOT NULL;
    END IF;
END $$;

-- Step 4: Drop new_code column if it exists
ALTER TABLE order_items
DROP COLUMN IF EXISTS new_code;

-- Step 5: Drop old_code column (after ensuring product_code has data)
ALTER TABLE order_items
DROP COLUMN IF EXISTS old_code;

-- Step 6: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS ix_order_items_product_code ON order_items (product_code);
CREATE INDEX IF NOT EXISTS ix_order_items_batch_number ON order_items (batch_number);

COMMIT;

