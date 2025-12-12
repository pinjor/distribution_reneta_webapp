"""
Migration script to add Transport Management System (TMS) tables
Run this script to apply the migration: python -m db.migrate_add_tms_tables
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.database import engine
import os

def run_migration():
    """Run the migration to add TMS tables and extend existing tables"""
    
    migration_sql = """
    -- Transport Management System (TMS) Migration
    -- Add TMS-related tables and extend existing tables

    -- Extend vehicles table with TMS fields
    ALTER TABLE vehicles 
    ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS fuel_rate DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS fuel_efficiency DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS model VARCHAR(100),
    ADD COLUMN IF NOT EXISTS year INTEGER,
    ADD COLUMN IF NOT EXISTS maintenance_schedule_km DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS last_maintenance_date DATE,
    ADD COLUMN IF NOT EXISTS last_maintenance_km DECIMAL(10,2);

    -- Extend drivers table with TMS fields
    ALTER TABLE drivers 
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address TEXT;

    -- Create route_stops table for storing route stop coordinates
    CREATE TABLE IF NOT EXISTS route_stops (
        id SERIAL PRIMARY KEY,
        route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        stop_sequence INTEGER NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        customer_name VARCHAR(255),
        address TEXT,
        latitude DECIMAL(10,7),
        longitude DECIMAL(10,7),
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_route_sequence UNIQUE(route_id, stop_sequence)
    );

    -- Create trips table for tracking vehicle/driver assignments
    CREATE TABLE IF NOT EXISTS trips (
        id SERIAL PRIMARY KEY,
        trip_number VARCHAR(50) UNIQUE NOT NULL,
        delivery_id INTEGER REFERENCES orders(id),
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
        driver_id INTEGER NOT NULL REFERENCES drivers(id),
        route_id INTEGER NOT NULL REFERENCES routes(id),
        trip_date DATE NOT NULL,
        distance_km DECIMAL(10,2),
        estimated_fuel_cost DECIMAL(10,2),
        actual_fuel_cost DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'Scheduled',
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create transport_expenses table for tracking trip expenses
    CREATE TABLE IF NOT EXISTS transport_expenses (
        id SERIAL PRIMARY KEY,
        trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        expense_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        expense_date DATE NOT NULL,
        is_auto_calculated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
    CREATE INDEX IF NOT EXISTS idx_route_stops_sequence ON route_stops(route_id, stop_sequence);
    CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
    CREATE INDEX IF NOT EXISTS idx_trips_route ON trips(route_id);
    CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(trip_date);
    CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
    CREATE INDEX IF NOT EXISTS idx_transport_expenses_trip ON transport_expenses(trip_id);
    CREATE INDEX IF NOT EXISTS idx_transport_expenses_type ON transport_expenses(expense_type);
    CREATE INDEX IF NOT EXISTS idx_transport_expenses_date ON transport_expenses(expense_date);
    """
    
    try:
        print("🔄 Running migration: Adding Transport Management System (TMS) tables...")
        
        with engine.connect() as conn:
            # Execute the migration
            conn.execute(text(migration_sql))
            conn.commit()
        
        print("✅ Migration completed successfully!")
        print("\nExtended tables:")
        print("  - vehicles (added fuel_type, fuel_rate, fuel_efficiency, model, year, maintenance fields)")
        print("  - drivers (added email, address)")
        print("\nCreated new tables:")
        print("  - route_stops (for route coordinates)")
        print("  - trips (for vehicle/driver assignments)")
        print("  - transport_expenses (for expense tracking)")
        print("\nCreated indexes for better query performance.")
        print("\n🎉 Your Transport Management System is now ready to use!")
        
    except Exception as e:
        print(f"❌ Error running migration: {str(e)}")
        print("\nIf tables/columns already exist, this is okay - the migration uses IF NOT EXISTS.")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()

