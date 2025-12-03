"""Migration script to add collection fields to orders table"""
from app.database import engine
from sqlalchemy import text

def migrate_add_collection_fields():
    """Add collection status fields to orders table"""
    with engine.connect() as conn:
        try:
            # Add collection fields
            conn.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN IF NOT EXISTS collection_status VARCHAR(50),
                ADD COLUMN IF NOT EXISTS collection_type VARCHAR(50),
                ADD COLUMN IF NOT EXISTS collected_amount NUMERIC(15, 2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS pending_amount NUMERIC(15, 2),
                ADD COLUMN IF NOT EXISTS collection_approved BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS collection_approved_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS collection_approved_by INTEGER REFERENCES employees(id),
                ADD COLUMN IF NOT EXISTS collection_source VARCHAR(50);
            """))
            conn.commit()
            print("Successfully added collection fields to orders table")
        except Exception as e:
            print(f"Error adding collection fields: {e}")
            # Check if columns already exist
            if "already exists" in str(e) or "duplicate" in str(e).lower():
                print("Columns may already exist, continuing...")
            else:
                raise

if __name__ == "__main__":
    migrate_add_collection_fields()

