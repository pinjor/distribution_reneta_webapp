"""Add rejected status columns to collection_deposits."""
from app.database import engine
from sqlalchemy import text


def migrate_add_deposit_rejected():
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE collection_deposits
            ADD COLUMN IF NOT EXISTS rejected BOOLEAN DEFAULT FALSE;
        """))
        conn.execute(text("""
            ALTER TABLE collection_deposits
            ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
        """))
        conn.execute(text("""
            UPDATE collection_deposits
            SET rejected = FALSE
            WHERE rejected IS NULL;
        """))
        conn.commit()
        print("✓ Added rejected columns to collection_deposits")


if __name__ == "__main__":
    migrate_add_deposit_rejected()
