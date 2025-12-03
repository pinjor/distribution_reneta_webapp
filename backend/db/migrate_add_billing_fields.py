"""Migration script to add billing-related fields and tables"""
from app.database import engine
from sqlalchemy import text

def migrate_add_billing_fields():
    """Add cold_chain_available to products and create billing tables"""
    with engine.connect() as conn:
        try:
            # Add cold_chain_available column to products table
            conn.execute(text("""
                ALTER TABLE products 
                ADD COLUMN IF NOT EXISTS cold_chain_available BOOLEAN DEFAULT FALSE;
            """))
            conn.commit()
            print("✓ Successfully added cold_chain_available column to products table")
        except Exception as e:
            print(f"Error adding cold_chain_available column: {e}")
            if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                conn.rollback()
                raise

        try:
            # Create collection_deposits table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS collection_deposits (
                    id SERIAL PRIMARY KEY,
                    deposit_number VARCHAR(50) UNIQUE NOT NULL,
                    deposit_date DATE NOT NULL,
                    collection_person_id INTEGER NOT NULL REFERENCES employees(id),
                    deposit_method VARCHAR(50) NOT NULL,
                    deposit_amount NUMERIC(15, 2) NOT NULL,
                    transaction_number VARCHAR(100) NOT NULL,
                    attachment_url VARCHAR(500),
                    remaining_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                    total_collection_amount NUMERIC(15, 2) NOT NULL,
                    notes TEXT,
                    approved BOOLEAN DEFAULT FALSE,
                    approved_by INTEGER REFERENCES employees(id),
                    approved_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            # Create collection_transactions table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS collection_transactions (
                    id SERIAL PRIMARY KEY,
                    order_id INTEGER NOT NULL REFERENCES orders(id),
                    collection_person_id INTEGER NOT NULL REFERENCES employees(id),
                    collection_date DATE NOT NULL,
                    collection_type VARCHAR(50) NOT NULL,
                    collected_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                    pending_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
                    total_amount NUMERIC(15, 2) NOT NULL,
                    deposit_id INTEGER REFERENCES collection_deposits(id),
                    remarks TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            conn.commit()
            print("✓ Successfully created billing tables (collection_deposits, collection_transactions)")
        except Exception as e:
            print(f"Error creating billing tables: {e}")
            if "already exists" not in str(e).lower() and "duplicate" not in str(e).lower():
                conn.rollback()
                raise
            else:
                print("Tables may already exist, continuing...")

if __name__ == "__main__":
    migrate_add_billing_fields()

