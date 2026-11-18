"""Add delivery rejection columns to orders."""
from app.database import engine
from sqlalchemy import text


def migrate_add_delivery_rejected():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS delivery_rejected BOOLEAN DEFAULT FALSE;
        """))
        conn.execute(text("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS delivery_rejected_at TIMESTAMP;
        """))
        conn.execute(text("""
            ALTER TABLE orders
            ADD COLUMN IF NOT EXISTS delivery_rejected_reason TEXT;
        """))
        conn.execute(text("""
            UPDATE orders
            SET delivery_rejected = FALSE
            WHERE delivery_rejected IS NULL;
        """))
        conn.commit()
        print("✓ Added delivery_rejected columns to orders")


if __name__ == "__main__":
    migrate_add_delivery_rejected()
