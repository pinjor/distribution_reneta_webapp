-- Migration: Add Route Shipping Points and Update Transport Expenses
-- Date: 2024

-- Create route_shipping_points table
CREATE TABLE IF NOT EXISTS route_shipping_points (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    shipping_point_id INTEGER NOT NULL REFERENCES shipping_points(id) ON DELETE CASCADE,
    distance_km NUMERIC(10, 2) NOT NULL,
    sequence INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(route_id, shipping_point_id)
);

-- Create index on route_id for faster queries
CREATE INDEX IF NOT EXISTS idx_route_shipping_points_route_id ON route_shipping_points(route_id);
CREATE INDEX IF NOT EXISTS idx_route_shipping_points_shipping_point_id ON route_shipping_points(shipping_point_id);

-- Add new columns to transport_expenses table
ALTER TABLE transport_expenses 
ADD COLUMN IF NOT EXISTS trip_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS route_id INTEGER REFERENCES routes(id);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_transport_expenses_trip_number ON transport_expenses(trip_number);
CREATE INDEX IF NOT EXISTS idx_transport_expenses_route_id ON transport_expenses(route_id);

-- Update existing expenses to link trip_number from trips table
UPDATE transport_expenses te
SET trip_number = t.trip_number,
    route_id = t.route_id
FROM trips t
WHERE te.trip_id = t.id
  AND (te.trip_number IS NULL OR te.route_id IS NULL);

