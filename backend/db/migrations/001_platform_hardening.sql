-- Platform hardening migration 001
-- Run: psql $DATABASE_URL -f backend/db/migrations/001_platform_hardening.sql

-- Employee security
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Order status separation
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source VARCHAR(50) DEFAULT 'MANUAL_DMS';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'COD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'ORDER_CREATED';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_source VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_collection_status ON orders(collection_status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_depot_code ON orders(depot_code);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Backfill delivery_status from legacy fields
UPDATE orders SET delivery_status = 'VALIDATED' WHERE validated = TRUE AND (delivery_status IS NULL OR delivery_status = 'ORDER_CREATED');
UPDATE orders SET delivery_status = 'PLANNED_FOR_DELIVERY' WHERE loaded = TRUE AND delivery_status = 'VALIDATED';

-- Note: platform tables created by SQLAlchemy create_all on startup
-- For production, use Alembic autogenerate from models_platform.py
