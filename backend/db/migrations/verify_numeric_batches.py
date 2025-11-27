#!/usr/bin/env python3
"""
Script to verify all batches are numeric in the database.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal

def verify_numeric_batches():
    db: Session = SessionLocal()
    
    try:
        # Check product_item_stock_details
        result = db.execute(text("""
            SELECT COUNT(*) as count
            FROM product_item_stock_details
            WHERE batch_no IS NULL OR batch_no = '' OR batch_no !~ '^[0-9]+$'
        """))
        non_numeric_batches = result.scalar()
        
        # Check order_items
        result2 = db.execute(text("""
            SELECT COUNT(*) as count
            FROM order_items
            WHERE batch_number IS NOT NULL 
            AND batch_number != ''
            AND batch_number !~ '^[0-9]+$'
        """))
        non_numeric_order_items = result2.scalar()
        
        # Get total counts
        result3 = db.execute(text("SELECT COUNT(*) FROM product_item_stock_details"))
        total_batches = result3.scalar()
        
        result4 = db.execute(text("SELECT COUNT(*) FROM order_items WHERE batch_number IS NOT NULL"))
        total_order_items = result4.scalar()
        
        print("="*60)
        print("Batch Number Verification Report")
        print("="*60)
        print(f"\nProduct Item Stock Details:")
        print(f"  Total batches: {total_batches}")
        print(f"  Non-numeric batches: {non_numeric_batches}")
        print(f"  Status: {'✅ All numeric' if non_numeric_batches == 0 else '❌ Has non-numeric batches'}")
        
        print(f"\nOrder Items:")
        print(f"  Total order items with batch numbers: {total_order_items}")
        print(f"  Non-numeric batch numbers: {non_numeric_order_items}")
        print(f"  Status: {'✅ All numeric' if non_numeric_order_items == 0 else '❌ Has non-numeric batch numbers'}")
        
        print("\n" + "="*60)
        
        if non_numeric_batches == 0 and non_numeric_order_items == 0:
            print("✅ SUCCESS: All batches are numeric!")
            return True
        else:
            print("❌ WARNING: Some batches are still non-numeric")
            return False
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    verify_numeric_batches()

