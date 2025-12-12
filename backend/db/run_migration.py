"""
Migration script to add mobile acceptance fields to orders table
Run this script to apply the migration: python -m db.run_migration
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import text
from app.database import engine
import os

def run_migration():
    """Run the migration to add mobile acceptance fields"""
    
    migration_sql = """
    -- Add mobile acceptance columns to orders table
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS mobile_accepted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mobile_accepted_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS mobile_accepted_at TIMESTAMP;

    -- Create index for faster queries (only if they don't exist)
    CREATE INDEX IF NOT EXISTS idx_orders_mobile_accepted ON orders(mobile_accepted);
    CREATE INDEX IF NOT EXISTS idx_orders_mobile_accepted_by ON orders(mobile_accepted_by);
    CREATE INDEX IF NOT EXISTS idx_orders_loading_number_mobile ON orders(loading_number, mobile_accepted);
    """
    
    try:
        print("🔄 Running migration: Adding mobile acceptance fields to orders table...")
        
        with engine.connect() as conn:
            # Execute the migration
            conn.execute(text(migration_sql))
            conn.commit()
        
        print("✅ Migration completed successfully!")
        print("\nAdded columns:")
        print("  - mobile_accepted (BOOLEAN)")
        print("  - mobile_accepted_by (VARCHAR(100))")
        print("  - mobile_accepted_at (TIMESTAMP)")
        print("\nCreated indexes for better query performance.")
        print("\n🎉 Your mobile memo acceptance API is now ready to use!")
        
    except Exception as e:
        print(f"❌ Error running migration: {str(e)}")
        print("\nIf columns already exist, this is okay - the migration uses IF NOT EXISTS.")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()

