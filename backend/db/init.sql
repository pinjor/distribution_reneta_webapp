-- Create database schema for Swift Distribution Hub

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    gstin VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Depots table
CREATE TABLE IF NOT EXISTS depots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    company_id INTEGER REFERENCES companies(id),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    hashed_password VARCHAR(255),
    department VARCHAR(100),
    designation VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    depot_id INTEGER REFERENCES depots(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'Retailer',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    gstin VARCHAR(20),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    gstin VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100),
    hsn_code VARCHAR(20),
    unit_of_measure VARCHAR(20) DEFAULT 'PCS',
    base_price DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(20) DEFAULT 'PCS',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipping Points table
CREATE TABLE IF NOT EXISTS shipping_points (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    depot_id INTEGER REFERENCES depots(id),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    capacity DECIMAL(10,2),
    depot_id INTEGER REFERENCES depots(id),
    vendor VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    driver_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry DATE,
    contact VARCHAR(20),
    vehicle_id VARCHAR(50),
    route VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Available',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Ledger table
CREATE TABLE IF NOT EXISTS stock_ledger (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    batch VARCHAR(100),
    depot_id INTEGER REFERENCES depots(id),
    storage_type VARCHAR(50),
    quantity DECIMAL(10,2),
    reserved_quantity DECIMAL(10,2) DEFAULT 0,
    available_quantity DECIMAL(10,2),
    expiry_date DATE,
    status VARCHAR(50) DEFAULT 'Unrestricted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Receipts table
CREATE TABLE IF NOT EXISTS stock_receipts (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    receipt_date DATE NOT NULL,
    challan_number VARCHAR(100),
    depot_id INTEGER REFERENCES depots(id),
    vendor_id INTEGER REFERENCES vendors(id),
    total_quantity DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'Completed',
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Receipt Items table
CREATE TABLE IF NOT EXISTS stock_receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER REFERENCES stock_receipts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    batch VARCHAR(100),
    quantity DECIMAL(10,2),
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Issuances table
CREATE TABLE IF NOT EXISTS stock_issuances (
    id SERIAL PRIMARY KEY,
    issuance_number VARCHAR(50) UNIQUE NOT NULL,
    issuance_date DATE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    depot_id INTEGER REFERENCES depots(id),
    total_quantity DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'Pending',
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Issuance Items table
CREATE TABLE IF NOT EXISTS stock_issuance_items (
    id SERIAL PRIMARY KEY,
    issuance_id INTEGER REFERENCES stock_issuances(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    batch VARCHAR(100),
    quantity DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Loading table
CREATE TABLE IF NOT EXISTS vehicle_loadings (
    id SERIAL PRIMARY KEY,
    loading_number VARCHAR(50) UNIQUE NOT NULL,
    loading_date DATE NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id),
    driver_id INTEGER REFERENCES drivers(id),
    route_id INTEGER,
    total_quantity DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'Pending',
    created_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Loading Items table
CREATE TABLE IF NOT EXISTS vehicle_loading_items (
    id SERIAL PRIMARY KEY,
    loading_id INTEGER REFERENCES vehicle_loadings(id) ON DELETE CASCADE,
    issuance_id INTEGER REFERENCES stock_issuances(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Adjustments table
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id SERIAL PRIMARY KEY,
    adjustment_number VARCHAR(50) UNIQUE NOT NULL,
    adjustment_date DATE NOT NULL,
    depot_id INTEGER REFERENCES depots(id),
    adjustment_type VARCHAR(50),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    submitted_by INTEGER REFERENCES employees(id),
    approved_by INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Adjustment Items table
CREATE TABLE IF NOT EXISTS stock_adjustment_items (
    id SERIAL PRIMARY KEY,
    adjustment_id INTEGER REFERENCES stock_adjustments(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    batch VARCHAR(100),
    quantity_change DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    route_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    depot_id INTEGER REFERENCES depots(id),
    stops INTEGER DEFAULT 0,
    distance VARCHAR(50),
    avg_time VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    customer_id INTEGER REFERENCES customers(id),
    depot_id INTEGER REFERENCES depots(id),
    issuance_id INTEGER REFERENCES stock_issuances(id),
    amount DECIMAL(15,2) NOT NULL,
    mode VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Pending',
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_stock_ledger_product ON stock_ledger(product_id);
CREATE INDEX idx_stock_ledger_depot ON stock_ledger(depot_id);
CREATE INDEX idx_stock_receipts_depot ON stock_receipts(depot_id);
CREATE INDEX idx_stock_issuances_customer ON stock_issuances(customer_id);
CREATE INDEX idx_vehicles_depot ON vehicles(depot_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Insert sample data
INSERT INTO companies (name, code, city, state, phone, email) VALUES
('Swift Distribution Pvt Ltd', 'SWIFT001', 'Bangalore', 'Karnataka', '+91-80-12345678', 'info@swiftdistro.com');

INSERT INTO depots (name, code, company_id, city, state) VALUES
('Bangalore Hub', 'BLR-HUB-001', 1, 'Bangalore', 'Karnataka'),
('Chennai Depot', 'CHN-DEP-001', 1, 'Chennai', 'Tamil Nadu'),
('Mumbai Central', 'MUM-CEN-001', 1, 'Mumbai', 'Maharashtra');

INSERT INTO products (name, code, category, hsn_code, base_price) VALUES
('Paracetamol 500mg', 'PROD-001', 'Pharmaceutical', '30049099', 25.50),
('Amoxicillin 250mg', 'PROD-002', 'Pharmaceutical', '30041021', 45.00),
('Ibuprofen 400mg', 'PROD-003', 'Pharmaceutical', '30049099', 35.75),
('Cetirizine 10mg', 'PROD-004', 'Pharmaceutical', '30049099', 15.25),
('Metformin 500mg', 'PROD-005', 'Pharmaceutical', '30049044', 30.00);

INSERT INTO customers (name, code, type, city, state, phone) VALUES
('Apollo Pharmacy - Koramangala', 'CUST-001', 'Retailer', 'Bangalore', 'Karnataka', '+91-80-11111111'),
('Medplus - Indiranagar', 'CUST-002', 'Retailer', 'Bangalore', 'Karnataka', '+91-80-22222222'),
('Wellness Forever - HSR Layout', 'CUST-003', 'Retailer', 'Bangalore', 'Karnataka', '+91-80-33333333');

INSERT INTO vendors (name, code, city, state, phone) VALUES
('Pharma Supplies Co', 'VEND-001', 'Bangalore', 'Karnataka', '+91-80-99999999'),
('MediCare Logistics', 'VEND-002', 'Mumbai', 'Maharashtra', '+91-22-88888888');

-- Insert employees with passwords (hashed with bcrypt, password is "admin123" for all test users)
-- Note: These will be created via the Python script after database initialization

-- Insert vehicles
INSERT INTO vehicles (vehicle_id, vehicle_type, registration_number, capacity, depot_id, vendor, status) VALUES
('VH-001', 'Refrigerated Van', 'KA-01-AB-1234', 2000, 1, 'Cold Chain Logistics', 'Active'),
('VH-002', 'Standard Truck', 'KA-02-CD-5678', 5000, 1, 'Fast Transport Co', 'Active'),
('VH-003', 'Mini Truck', 'KA-03-EF-9012', 1000, 1, 'Quick Delivery Ltd', 'Maintenance'),
('VH-004', 'Refrigerated Truck', 'KA-04-GH-3456', 3000, 2, 'Cold Chain Logistics', 'Active');

-- Insert drivers
INSERT INTO drivers (driver_id, first_name, last_name, license_number, license_expiry, contact, vehicle_id, route, status) VALUES
('DR-001', 'Rajesh', 'Kumar', 'KA123456789012', '2026-08-15', '+91-9876543210', 'KA-01-AB-1234', 'Bangalore North', 'On Route'),
('DR-002', 'Suresh', 'Reddy', 'KA223456789013', '2025-12-20', '+91-9876543211', 'KA-02-CD-5678', 'Bangalore South', 'Available'),
('DR-003', 'Venkat', 'Rao', 'KA323456789014', '2026-03-10', '+91-9876543212', 'KA-03-EF-9012', 'HSR - Koramangala', 'Off Duty'),
('DR-004', 'Mohan', 'Lal', 'TN123456789015', '2027-01-05', '+91-9876543213', 'KA-04-GH-3456', 'Chennai Central', 'On Route');

-- Insert routes
INSERT INTO routes (route_id, name, depot_id, stops, distance, avg_time, status) VALUES
('RT-001', 'Bangalore North Circuit', 1, 12, '45 km', '4h 30m', 'Active'),
('RT-002', 'Bangalore South Circuit', 1, 15, '52 km', '5h 15m', 'Active'),
('RT-003', 'HSR - Koramangala Express', 1, 8, '28 km', '3h', 'Active'),
('RT-004', 'Whitefield - Electronic City', 1, 10, '38 km', '4h', 'Active');

