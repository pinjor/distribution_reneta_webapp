"""Migration script to add postponed field to orders table"""
from app.database import engine
from sqlalchemy import text

def migrate_add_postponed_field():
    """Add postponed column to orders table"""
    with engine.connect() as conn:
        try:
            # Add postponed column to orders table
            conn.execute(text("""
                ALTER TABLE orders 
                ADD COLUMN IF NOT EXISTS postponed BOOLEAN DEFAULT FALSE;
            """))
            conn.commit()
            print("✓ Successfully added postponed column to orders table")
        except Exception as e:
            print(f"Error adding postponed column: {e}")
            if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                conn.rollback()
                raise

if __name__ == "__main__":
    migrate_add_postponed_field()

