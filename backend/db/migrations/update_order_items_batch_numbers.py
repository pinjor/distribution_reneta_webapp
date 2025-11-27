#!/usr/bin/env python3
"""
Script to update order items with old alphanumeric batch numbers to use numeric batch numbers.
This script maps old batch numbers to new numeric ones and updates order_items table.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal

def update_order_items_batch_numbers():
    """
    Update order_items table to ensure all batch_number values are numeric.
    Since we've already converted all batches in product_item_stock_details,
    we need to find the corresponding numeric batch for each order item.
    """
    db: Session = SessionLocal()
    
    try:
        # Get all order items with batch numbers
        result = db.execute(text("""
            SELECT oi.id, oi.batch_number, oi.product_code, pis.product_id, pisd.batch_no as numeric_batch
            FROM order_items oi
            LEFT JOIN products p ON (p.code = oi.product_code OR p.old_code = oi.product_code OR p.sku = oi.product_code)
            LEFT JOIN product_item_stock pis ON pis.product_id = p.id
            LEFT JOIN product_item_stock_details pisd ON pisd.item_code = pis.id
            WHERE oi.batch_number IS NOT NULL 
            AND oi.batch_number != ''
            AND (oi.batch_number !~ '^[0-9]+$' OR oi.batch_number IS NULL)
        """))
        
        items_to_update = result.fetchall()
        print(f"Found {len(items_to_update)} order items with non-numeric batch numbers")
        
        if len(items_to_update) == 0:
            print("All order items already have numeric batch numbers!")
            return
        
        updated_count = 0
        not_found_count = 0
        
        for item in items_to_update:
            item_id, old_batch, product_code, product_id, numeric_batch = item
            
            if numeric_batch:
                # Update with the numeric batch
                db.execute(text("""
                    UPDATE order_items 
                    SET batch_number = :new_batch
                    WHERE id = :item_id
                """), {"new_batch": numeric_batch, "item_id": item_id})
                
                print(f"  Updated order item {item_id}: '{old_batch}' → '{numeric_batch}'")
                updated_count += 1
            else:
                # Try to find any numeric batch for this product
                result2 = db.execute(text("""
                    SELECT pisd.batch_no
                    FROM product_item_stock pis
                    JOIN product_item_stock_details pisd ON pisd.item_code = pis.id
                    WHERE pis.product_id = :product_id
                    AND pisd.batch_no ~ '^[0-9]+$'
                    ORDER BY pisd.available_quantity DESC
                    LIMIT 1
                """), {"product_id": product_id})
                
                batch_result = result2.fetchone()
                
                if batch_result:
                    new_batch = batch_result[0]
                    db.execute(text("""
                        UPDATE order_items 
                        SET batch_number = :new_batch
                        WHERE id = :item_id
                    """), {"new_batch": new_batch, "item_id": item_id})
                    
                    print(f"  Updated order item {item_id}: '{old_batch}' → '{new_batch}' (found first available numeric batch)")
                    updated_count += 1
                else:
                    print(f"  ⚠ Could not find numeric batch for order item {item_id} (product: {product_code})")
                    not_found_count += 1
        
        db.commit()
        
        print(f"\n{'='*60}")
        print(f"Update Summary:")
        print(f"  Total order items processed: {len(items_to_update)}")
        print(f"  Successfully updated: {updated_count}")
        print(f"  Not found: {not_found_count}")
        print(f"{'='*60}")
        
        # Verify all order items have numeric batches
        print("\nVerifying all order items have numeric batch numbers...")
        result = db.execute(text("""
            SELECT COUNT(*) as count
            FROM order_items
            WHERE batch_number IS NOT NULL 
            AND batch_number != ''
            AND batch_number !~ '^[0-9]+$'
        """))
        
        remaining = result.fetchone()[0]
        
        if remaining == 0:
            print("  ✅ All order items now have numeric batch numbers!")
        else:
            print(f"  ⚠ Warning: {remaining} order items still have non-numeric batch numbers")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Updating order items with numeric batch numbers...")
    print("="*60)
    update_order_items_batch_numbers()
    print("\n✅ Update complete!")

