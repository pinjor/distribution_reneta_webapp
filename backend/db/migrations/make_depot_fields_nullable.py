#!/usr/bin/env python3
"""
Make depot_code and depot_name nullable in orders table
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy import text
from app.database import SessionLocal, engine

def make_depot_fields_nullable():
    """
    Make depot_code and depot_name nullable in orders table
    """
    db = SessionLocal()
    
    try:
        # Alter table to make depot fields nullable
        db.execute(text("""
            ALTER TABLE orders 
            ALTER COLUMN depot_code DROP NOT NULL,
            ALTER COLUMN depot_name DROP NOT NULL;
        """))
        
        db.commit()
        print("✓ Successfully made depot_code and depot_name nullable in orders table")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    make_depot_fields_nullable()

