#!/usr/bin/env python3
"""
Script to ensure all products have at least one numeric batch with stock in ALL depots.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Product, ProductItemStock, ProductItemStockDetail, Depot
from decimal import Decimal
from datetime import date, datetime, timedelta
import time

def ensure_all_products_have_batches_all_depots(default_stock: Decimal = Decimal("1000")):
    """
    Ensure all active products have at least one numeric batch with stock in ALL depots.
    """
    db: Session = SessionLocal()
    
    try:
        # Get all depots
        depots = db.query(Depot).all()
        if not depots:
            print("ERROR: No depots found in database.")
            return
        
        print(f"Found {len(depots)} depot(s)")
        for depot in depots:
            print(f"  - {depot.name} (ID: {depot.id}, Code: {depot.code})")
        
        # Get all active products
        products = db.query(Product).filter(Product.is_active == True).all()
        print(f"\nFound {len(products)} active products")
        
        total_created = 0
        total_skipped = 0
        
        for depot in depots:
            print(f"\n{'='*60}")
            print(f"Processing Depot: {depot.name} (ID: {depot.id}, Code: {depot.code})")
            print(f"{'='*60}")
            
            for product in products:
                # Check if product has any numeric batches with stock in this depot
                stock_records = db.query(ProductItemStock).filter(
                    ProductItemStock.product_id == product.id,
                    ProductItemStock.depot_id == depot.id
                ).all()
                
                has_numeric_batch_with_stock = False
                
                for stock_record in stock_records:
                    batch_details = db.query(ProductItemStockDetail).filter(
                        ProductItemStockDetail.item_code == stock_record.id
                    ).all()
                    
                    for batch_detail in batch_details:
                        batch_no = (batch_detail.batch_no or "").strip()
                        available_qty = float(batch_detail.available_quantity or 0)
                        
                        if batch_no and batch_no.isdigit() and available_qty > 0:
                            has_numeric_batch_with_stock = True
                            break
                    
                    if has_numeric_batch_with_stock:
                        break
                
                if has_numeric_batch_with_stock:
                    total_skipped += 1
                    continue
                
                # Product needs a batch in this depot
                print(f"  {product.code or product.old_code}: Creating stock record and batch...")
                
                # Check if stock record exists for this product and depot
                existing_stock = db.query(ProductItemStock).filter(
                    ProductItemStock.product_id == product.id,
                    ProductItemStock.depot_id == depot.id
                ).first()
                
                if not existing_stock:
                    # Get product codes
                    product_code = product.code or product.old_code or product.new_code or str(product.id)
                    sku_code = product.sku or product.code or product.old_code or product.new_code or f"SKU-{product.id}"
                    
                    # Create new stock record
                    stock_record = ProductItemStock(
                        product_id=product.id,
                        product_code=product_code,
                        sku_code=sku_code,
                        depot_id=depot.id,
                        stock_qty=default_stock,
                        gross_stock_receive=default_stock,
                        issue=Decimal("0"),
                        adjusted_stock_in_qty=Decimal("0"),
                        adjusted_stock_out_qty=Decimal("0"),
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(stock_record)
                    db.flush()
                else:
                    stock_record = existing_stock
                    # Update stock quantities
                    stock_record.stock_qty = (stock_record.stock_qty or Decimal("0")) + default_stock
                    stock_record.gross_stock_receive = (stock_record.gross_stock_receive or Decimal("0")) + default_stock
                    stock_record.updated_at = datetime.utcnow()
                
                # Generate a unique numeric batch number
                # Use product_id + depot_id + timestamp for uniqueness
                timestamp = int(time.time()) % 1000000
                batch_number = f"{product.id}{depot.id}{timestamp:06d}"[:10]  # Max 10 digits
                
                # Ensure it's numeric and unique
                if not batch_number.isdigit():
                    batch_number = f"{product.id}{depot.id}{timestamp:04d}"[:10]
                
                # Check if batch already exists
                existing_batch = db.query(ProductItemStockDetail).filter(
                    ProductItemStockDetail.item_code == stock_record.id,
                    ProductItemStockDetail.batch_no == batch_number
                ).first()
                
                if not existing_batch:
                    # Create batch detail
                    expiry_date = date.today() + timedelta(days=365)
                    
                    batch_detail = ProductItemStockDetail(
                        item_code=stock_record.id,
                        batch_no=batch_number,
                        quantity=default_stock,
                        available_quantity=default_stock,
                        reserved_quantity=Decimal("0"),
                        expiry_date=expiry_date,
                        manufacturing_date=date.today(),
                        storage_type="Ambient",
                        status="Unrestricted",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(batch_detail)
                    total_created += 1
                    print(f"    ✓ Created batch {batch_number} with stock {default_stock}")
                else:
                    # Update existing batch
                    existing_batch.quantity = (existing_batch.quantity or Decimal("0")) + default_stock
                    existing_batch.available_quantity = (existing_batch.available_quantity or Decimal("0")) + default_stock
                    existing_batch.updated_at = datetime.utcnow()
                    total_created += 1
                    print(f"    ✓ Updated batch {batch_number} with additional stock {default_stock}")
        
        db.commit()
        
        print(f"\n{'='*60}")
        print(f"FINAL SUMMARY:")
        print(f"  Total products: {len(products)}")
        print(f"  Total depots: {len(depots)}")
        print(f"  Total combinations: {len(products) * len(depots)}")
        print(f"  Batches created/updated: {total_created}")
        print(f"  Already had batches: {total_skipped}")
        print(f"{'='*60}")
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Ensure all products have numeric batches with stock in ALL depots")
    parser.add_argument("--stock", type=float, default=1000.0, help="Default stock quantity (default: 1000)")
    
    args = parser.parse_args()
    
    ensure_all_products_have_batches_all_depots(
        default_stock=Decimal(str(args.stock))
    )

