-- Create Product Item Stock table (main stock table)
CREATE TABLE IF NOT EXISTS product_item_stock (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    sku_code VARCHAR(50) NOT NULL,
    gross_stock_receive DECIMAL(15, 2) DEFAULT 0,
    issue DECIMAL(15, 2) DEFAULT 0,
    stock_qty DECIMAL(15, 2) DEFAULT 0,
    adjusted_stock_in_qty DECIMAL(15, 2) DEFAULT 0,
    adjusted_stock_out_qty DECIMAL(15, 2) DEFAULT 0,
    depot_id INTEGER REFERENCES depots(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, depot_id)
);

-- Create Product Item Stock Details table (batch details table)
CREATE TABLE IF NOT EXISTS product_item_stock_details (
    id SERIAL PRIMARY KEY,
    item_code INTEGER NOT NULL REFERENCES product_item_stock(id) ON DELETE CASCADE,
    batch_no VARCHAR(100) NOT NULL,
    expiry_date DATE,
    quantity DECIMAL(15, 2) DEFAULT 0,
    available_quantity DECIMAL(15, 2) DEFAULT 0,
    reserved_quantity DECIMAL(15, 2) DEFAULT 0,
    manufacturing_date DATE,
    storage_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Unrestricted',
    source_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_code, batch_no)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_item_stock_product_id ON product_item_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_product_item_stock_product_code ON product_item_stock(product_code);
CREATE INDEX IF NOT EXISTS idx_product_item_stock_sku_code ON product_item_stock(sku_code);
CREATE INDEX IF NOT EXISTS idx_product_item_stock_depot_id ON product_item_stock(depot_id);
CREATE INDEX IF NOT EXISTS idx_product_item_stock_details_item_code ON product_item_stock_details(item_code);
CREATE INDEX IF NOT EXISTS idx_product_item_stock_details_batch_no ON product_item_stock_details(batch_no);
CREATE INDEX IF NOT EXISTS idx_product_item_stock_details_expiry_date ON product_item_stock_details(expiry_date);

-- Add comments for documentation
COMMENT ON TABLE product_item_stock IS 'Main stock table for products with aggregated stock quantities';
COMMENT ON TABLE product_item_stock_details IS 'Batch-wise stock details linked to product_item_stock';

