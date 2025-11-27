#!/usr/bin/env python3
"""
Complete script to find and convert ALL alphanumeric batch numbers to numeric
across ALL tables in the database.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from app.database import SessionLocal, engine
from decimal import Decimal
from datetime import datetime
import re

def is_numeric(batch_no: str) -> bool:
    """Check if batch number is numeric only"""
    if not batch_no:
        return False
    cleaned = str(batch_no).strip()
    return cleaned.isdigit()

def generate_numeric_batch(product_id: int, existing_numeric_batches: set, counter: int = 1) -> str:
    """Generate a unique numeric batch number"""
    base = f"{product_id}{counter:06d}"
    
    if len(base) > 10:
        base = f"{product_id}{counter:04d}"
    
    while base in existing_numeric_batches:
        counter += 1
        if len(f"{product_id}{counter:06d}") <= 10:
            base = f"{product_id}{counter:06d}"
        else:
            base = f"{product_id}{counter:04d}"
    
    existing_numeric_batches.add(base)
    return base

def find_all_batch_columns(db: Session):
    """Find all tables and columns that might contain batch numbers"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    batch_columns = []
    
    for table_name in tables:
        columns = inspector.get_columns(table_name)
        for column in columns:
            col_name = column['name'].lower()
            # Look for columns that might contain batch numbers
            if 'batch' in col_name:
                batch_columns.append((table_name, column['name']))
    
    return batch_columns

def convert_all_batches_to_numeric():
    """
    Find and convert ALL alphanumeric batch numbers across ALL tables.
    """
    db: Session = SessionLocal()
    
    try:
        print("="*60)
        print("COMPLETE BATCH NUMBER CONVERSION")
        print("="*60)
        
        # Find all tables with batch columns
        print("\n1. Finding all tables with batch columns...")
        batch_columns = find_all_batch_columns(db)
        print(f"   Found batch columns in {len(batch_columns)} table(s):")
        for table, column in batch_columns:
            print(f"     - {table}.{column}")
        
        total_converted = 0
        total_errors = 0
        
        # Process each table
        for table_name, column_name in batch_columns:
            print(f"\n2. Processing {table_name}.{column_name}...")
            
            try:
                # Get all non-numeric batches from this table
                if table_name == 'product_item_stock_details':
                    # Special handling for product_item_stock_details
                    result = db.execute(text(f"""
                        SELECT id, {column_name}, item_code
                        FROM {table_name}
                        WHERE {column_name} IS NOT NULL 
                        AND {column_name} != ''
                        AND {column_name} !~ '^[0-9]+$'
                    """))
                elif table_name == 'order_items':
                    # Special handling for order_items
                    result = db.execute(text(f"""
                        SELECT id, {column_name}, product_code
                        FROM {table_name}
                        WHERE {column_name} IS NOT NULL 
                        AND {column_name} != ''
                        AND {column_name} !~ '^[0-9]+$'
                    """))
                else:
                    # Generic handling for other tables
                    result = db.execute(text(f"""
                        SELECT id, {column_name}
                        FROM {table_name}
                        WHERE {column_name} IS NOT NULL 
                        AND {column_name} != ''
                        AND {column_name} !~ '^[0-9]+$'
                    """))
                
                rows = result.fetchall()
                print(f"   Found {len(rows)} non-numeric batch numbers")
                
                if len(rows) == 0:
                    print(f"   ✅ All batches in {table_name} are already numeric")
                    continue
                
                # Track numeric batches by product for uniqueness
                numeric_batches_by_product = {}
                converted_in_table = 0
                
                for row in rows:
                    try:
                        row_id = row[0]
                        old_batch = row[1]
                        
                        # Get product ID based on table
                        product_id = None
                        
                        if table_name == 'product_item_stock_details':
                            item_code = row[2]
                            stock_result = db.execute(text("""
                                SELECT product_id FROM product_item_stock WHERE id = :item_code
                            """), {"item_code": item_code})
                            stock_row = stock_result.fetchone()
                            if stock_row:
                                product_id = stock_row[0]
                        elif table_name == 'order_items':
                            product_code = row[2]
                            product_result = db.execute(text("""
                                SELECT id FROM products 
                                WHERE code = :code OR old_code = :code OR sku = :code
                                LIMIT 1
                            """), {"code": product_code})
                            product_row = product_result.fetchone()
                            if product_row:
                                product_id = product_row[0]
                        
                        # If no product_id found, use a default
                        if not product_id:
                            product_id = 1
                        
                        # Get existing numeric batches for this product
                        existing_numeric = numeric_batches_by_product.get(product_id, set())
                        
                        # Generate new numeric batch number
                        new_batch_no = generate_numeric_batch(product_id, existing_numeric)
                        
                        # Update the record
                        if table_name == 'product_item_stock_details':
                            # Check if batch already exists
                            existing = db.execute(text("""
                                SELECT id FROM product_item_stock_details
                                WHERE item_code = :item_code AND batch_no = :batch_no AND id != :id
                            """), {"item_code": row[2], "batch_no": new_batch_no, "id": row_id}).fetchone()
                            
                            if existing:
                                # Merge with existing batch
                                db.execute(text("""
                                    UPDATE product_item_stock_details
                                    SET quantity = quantity + (SELECT quantity FROM product_item_stock_details WHERE id = :id),
                                        available_quantity = available_quantity + (SELECT available_quantity FROM product_item_stock_details WHERE id = :id),
                                        reserved_quantity = reserved_quantity + (SELECT reserved_quantity FROM product_item_stock_details WHERE id = :id)
                                    WHERE item_code = :item_code AND batch_no = :batch_no AND id != :id
                                """), {"item_code": row[2], "batch_no": new_batch_no, "id": row_id})
                                
                                # Delete the old batch
                                db.execute(text("DELETE FROM product_item_stock_details WHERE id = :id"), {"id": row_id})
                                print(f"     Merged '{old_batch}' → '{new_batch_no}' (deleted duplicate)")
                            else:
                                db.execute(text(f"""
                                    UPDATE {table_name}
                                    SET {column_name} = :new_batch, updated_at = CURRENT_TIMESTAMP
                                    WHERE id = :id
                                """), {"new_batch": new_batch_no, "id": row_id})
                                print(f"     '{old_batch}' → '{new_batch_no}'")
                        else:
                            # For other tables, just update
                            db.execute(text(f"""
                                UPDATE {table_name}
                                SET {column_name} = :new_batch
                                WHERE id = :id
                            """), {"new_batch": new_batch_no, "id": row_id})
                            print(f"     '{old_batch}' → '{new_batch_no}'")
                        
                        # Track the new numeric batch
                        if product_id not in numeric_batches_by_product:
                            numeric_batches_by_product[product_id] = set()
                        numeric_batches_by_product[product_id].add(new_batch_no)
                        
                        converted_in_table += 1
                        total_converted += 1
                        
                    except Exception as e:
                        print(f"     ❌ Error converting row {row[0]}: {str(e)}")
                        total_errors += 1
                        continue
                
                db.commit()
                print(f"   ✅ Converted {converted_in_table} batches in {table_name}")
                
            except Exception as e:
                print(f"   ❌ Error processing {table_name}: {str(e)}")
                db.rollback()
                total_errors += 1
                continue
        
        # Final verification
        print(f"\n{'='*60}")
        print("FINAL VERIFICATION")
        print("="*60)
        
        all_numeric = True
        for table_name, column_name in batch_columns:
            result = db.execute(text(f"""
                SELECT COUNT(*) as count
                FROM {table_name}
                WHERE {column_name} IS NOT NULL 
                AND {column_name} != ''
                AND {column_name} !~ '^[0-9]+$'
            """))
            count = result.scalar()
            
            if count > 0:
                print(f"  ❌ {table_name}.{column_name}: {count} non-numeric batches remaining")
                all_numeric = False
            else:
                print(f"  ✅ {table_name}.{column_name}: All numeric")
        
        print(f"\n{'='*60}")
        print("CONVERSION SUMMARY")
        print("="*60)
        print(f"  Total batches converted: {total_converted}")
        print(f"  Errors: {total_errors}")
        print(f"  Final status: {'✅ ALL BATCHES ARE NUMERIC' if all_numeric else '❌ Some batches still need conversion'}")
        print("="*60)
        
        return all_numeric
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("Converting ALL alphanumeric batches to numeric across ALL tables...")
    convert_all_batches_to_numeric()
    print("\n✅ Conversion process complete!")

