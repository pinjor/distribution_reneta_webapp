#!/usr/bin/env python3
"""
Script to ensure all products have at least one numeric batch with stock.
This script will:
1. Find all active products without numeric batches
2. Create a default stock record and batch for each product
3. Assign stock to a default depot if depot_id is provided
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Product, ProductItemStock, ProductItemStockDetail, Depot
from decimal import Decimal
from datetime import date, datetime, timedelta

def ensure_all_products_have_batches(depot_id: int = None, default_stock: Decimal = Decimal("1000")):
    """
    Ensure all active products have at least one numeric batch with stock.
    
    Args:
        depot_id: Optional depot ID. If None, uses the first available depot.
        default_stock: Default stock quantity to assign (default: 1000)
    """
    db: Session = SessionLocal()
    
    try:
        # Get or find a depot
        if depot_id:
            depot = db.query(Depot).filter(Depot.id == depot_id).first()
            if not depot:
                print(f"Depot with ID {depot_id} not found. Using first available depot.")
                depot = db.query(Depot).first()
        else:
            depot = db.query(Depot).first()
        
        if not depot:
            print("ERROR: No depots found in database. Please create a depot first.")
            return
        
        print(f"Using depot: {depot.name} (ID: {depot.id}, Code: {depot.code})")
        
        # Get all active products
        products = db.query(Product).filter(Product.is_active == True).all()
        print(f"\nFound {len(products)} active products")
        
        products_processed = 0
        products_created = 0
        products_skipped = 0
        
        for product in products:
            products_processed += 1
            
            # Check if product has any numeric batches with stock
            stock_records = db.query(ProductItemStock).filter(
                ProductItemStock.product_id == product.id
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
                products_skipped += 1
                print(f"  [{products_processed}/{len(products)}] {product.code or product.old_code}: Already has numeric batches with stock")
                continue
            
            # Product needs a batch - create stock record and batch
            print(f"  [{products_processed}/{len(products)}] {product.code or product.old_code}: Creating stock record and batch...")
            
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
                db.flush()  # Get the ID
            else:
                stock_record = existing_stock
                # Update stock quantities
                stock_record.stock_qty = (stock_record.stock_qty or Decimal("0")) + default_stock
                stock_record.gross_stock_receive = (stock_record.gross_stock_receive or Decimal("0")) + default_stock
                stock_record.updated_at = datetime.utcnow()
            
            # Generate a numeric batch number (use product ID + timestamp for uniqueness)
            import time
            batch_number = f"{product.id}{int(time.time()) % 1000000:06d}"  # 6-digit numeric batch
            
            # Check if batch already exists
            existing_batch = db.query(ProductItemStockDetail).filter(
                ProductItemStockDetail.item_code == stock_record.id,
                ProductItemStockDetail.batch_no == batch_number
            ).first()
            
            if not existing_batch:
                # Create batch detail
                expiry_date = date.today() + timedelta(days=365)  # 1 year from now
                
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
                products_created += 1
                print(f"    ✓ Created batch {batch_number} with stock {default_stock}")
            else:
                # Update existing batch
                existing_batch.quantity = (existing_batch.quantity or Decimal("0")) + default_stock
                existing_batch.available_quantity = (existing_batch.available_quantity or Decimal("0")) + default_stock
                existing_batch.updated_at = datetime.utcnow()
                products_created += 1
                print(f"    ✓ Updated batch {batch_number} with additional stock {default_stock}")
        
        db.commit()
        
        print(f"\n{'='*60}")
        print(f"Summary:")
        print(f"  Total products processed: {products_processed}")
        print(f"  Products with existing batches: {products_skipped}")
        print(f"  Products with batches created/updated: {products_created}")
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
    
    parser = argparse.ArgumentParser(description="Ensure all products have numeric batches with stock")
    parser.add_argument("--depot-id", type=int, help="Depot ID to assign stock to (default: first depot)")
    parser.add_argument("--stock", type=float, default=1000.0, help="Default stock quantity (default: 1000)")
    
    args = parser.parse_args()
    
    ensure_all_products_have_batches(
        depot_id=args.depot_id,
        default_stock=Decimal(str(args.stock))
    )

