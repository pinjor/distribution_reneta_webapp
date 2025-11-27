#!/usr/bin/env python3
"""
Script to convert all alphanumeric batch numbers to numeric batch numbers.
This script will:
1. Find all batches with alphanumeric batch numbers
2. Convert them to unique numeric batch numbers
3. Update the database records
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import ProductItemStockDetail, ProductItemStock, Product
from decimal import Decimal
from datetime import date, datetime
import re

def is_numeric(batch_no: str) -> bool:
    """Check if batch number is numeric only"""
    if not batch_no:
        return False
    cleaned = str(batch_no).strip()
    return cleaned.isdigit()

def generate_numeric_batch(product_id: int, existing_numeric_batches: set, counter: int = 1) -> str:
    """Generate a unique numeric batch number"""
    # Use product ID + counter to ensure uniqueness
    base = f"{product_id}{counter:06d}"
    
    # If too long, use just counter with product prefix
    if len(base) > 10:
        base = f"{product_id}{counter:04d}"
    
    # Ensure it's unique
    while base in existing_numeric_batches:
        counter += 1
        if len(f"{product_id}{counter:06d}") <= 10:
            base = f"{product_id}{counter:06d}"
        else:
            base = f"{product_id}{counter:04d}"
    
    existing_numeric_batches.add(base)
    return base

def convert_batches_to_numeric():
    """
    Convert all alphanumeric batch numbers to numeric batch numbers.
    """
    db: Session = SessionLocal()
    
    try:
        # Get all batch details
        all_batches = db.query(ProductItemStockDetail).all()
        print(f"Found {len(all_batches)} total batches in database")
        
        # Track batches to update
        batches_to_update = []
        numeric_batches_by_product = {}
        
        # First pass: identify alphanumeric batches and collect existing numeric batches
        for batch in all_batches:
            batch_no = (batch.batch_no or "").strip()
            
            if not batch_no:
                # Empty batch number - generate one
                batches_to_update.append((batch, None))
                continue
            
            if not is_numeric(batch_no):
                # Alphanumeric batch - needs conversion
                batches_to_update.append((batch, batch_no))
            else:
                # Already numeric - track it for uniqueness
                stock_record = db.query(ProductItemStock).filter(
                    ProductItemStock.id == batch.item_code
                ).first()
                
                if stock_record:
                    product_id = stock_record.product_id
                    if product_id not in numeric_batches_by_product:
                        numeric_batches_by_product[product_id] = set()
                    numeric_batches_by_product[product_id].add(batch_no)
        
        print(f"Found {len(batches_to_update)} batches that need conversion")
        
        if len(batches_to_update) == 0:
            print("All batches are already numeric!")
            return
        
        # Second pass: convert alphanumeric batches to numeric
        converted_count = 0
        error_count = 0
        
        for batch, old_batch_no in batches_to_update:
            try:
                # Get product ID from stock record
                stock_record = db.query(ProductItemStock).filter(
                    ProductItemStock.id == batch.item_code
                ).first()
                
                if not stock_record:
                    print(f"  ⚠ Skipping batch (ID: {batch.id}) - stock record not found")
                    error_count += 1
                    continue
                
                product_id = stock_record.product_id
                
                # Get existing numeric batches for this product
                existing_numeric = numeric_batches_by_product.get(product_id, set())
                
                # Generate new numeric batch number
                new_batch_no = generate_numeric_batch(product_id, existing_numeric)
                
                # Check if this batch number already exists for this stock record
                existing_batch = db.query(ProductItemStockDetail).filter(
                    ProductItemStockDetail.item_code == batch.item_code,
                    ProductItemStockDetail.batch_no == new_batch_no,
                    ProductItemStockDetail.id != batch.id  # Exclude current batch
                ).first()
                
                if existing_batch:
                    # Merge with existing batch (add quantities)
                    print(f"  Merging batch '{old_batch_no or '(empty)'}' into existing numeric batch '{new_batch_no}'")
                    existing_batch.quantity = (existing_batch.quantity or Decimal("0")) + (batch.quantity or Decimal("0"))
                    existing_batch.available_quantity = (existing_batch.available_quantity or Decimal("0")) + (batch.available_quantity or Decimal("0"))
                    existing_batch.reserved_quantity = (existing_batch.reserved_quantity or Decimal("0")) + (batch.reserved_quantity or Decimal("0"))
                    
                    # Use the earlier expiry date if available
                    if batch.expiry_date and (not existing_batch.expiry_date or batch.expiry_date < existing_batch.expiry_date):
                        existing_batch.expiry_date = batch.expiry_date
                    
                    # Delete the old batch
                    db.delete(batch)
                    converted_count += 1
                else:
                    # Update batch number
                    print(f"  Converting '{old_batch_no or '(empty)'}' → '{new_batch_no}' (Product ID: {product_id})")
                    batch.batch_no = new_batch_no
                    batch.updated_at = datetime.utcnow()
                    converted_count += 1
                
                # Track the new numeric batch
                if product_id not in numeric_batches_by_product:
                    numeric_batches_by_product[product_id] = set()
                numeric_batches_by_product[product_id].add(new_batch_no)
                
            except Exception as e:
                print(f"  ❌ Error converting batch (ID: {batch.id}): {str(e)}")
                error_count += 1
                continue
        
        # Commit all changes
        db.commit()
        
        print(f"\n{'='*60}")
        print(f"Conversion Summary:")
        print(f"  Total batches processed: {len(batches_to_update)}")
        print(f"  Successfully converted: {converted_count}")
        print(f"  Errors: {error_count}")
        print(f"{'='*60}")
        
        # Verify all batches are now numeric
        print("\nVerifying all batches are numeric...")
        remaining_alphanumeric = db.query(ProductItemStockDetail).all()
        alphanumeric_count = 0
        
        for batch in remaining_alphanumeric:
            batch_no = (batch.batch_no or "").strip()
            if batch_no and not is_numeric(batch_no):
                alphanumeric_count += 1
                print(f"  ⚠ Still alphanumeric: '{batch_no}' (ID: {batch.id})")
        
        if alphanumeric_count == 0:
            print("  ✅ All batches are now numeric!")
        else:
            print(f"  ⚠ Warning: {alphanumeric_count} batches are still alphanumeric")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Converting all alphanumeric batches to numeric batches...")
    print("="*60)
    convert_batches_to_numeric()
    print("\n✅ Conversion complete!")

