#!/usr/bin/env python3
"""
Check batches for a specific product and depot
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal

def check_product_batches(product_code: str, depot_code: str = None):
    db: Session = SessionLocal()
    
    try:
        # Find product
        result = db.execute(text("""
            SELECT id, code, name FROM products 
            WHERE code = :code OR old_code = :code OR sku = :code
        """), {"code": product_code})
        product = result.fetchone()
        
        if not product:
            print(f"Product {product_code} not found")
            return
        
        product_id, code, name = product
        print(f"Product: {name} (ID: {product_id}, Code: {code})")
        
        # Find depot if provided
        depot_id = None
        if depot_code:
            result = db.execute(text("SELECT id, name FROM depots WHERE code = :code"), {"code": depot_code})
            depot = result.fetchone()
            if depot:
                depot_id, depot_name = depot
                print(f"Depot: {depot_name} (ID: {depot_id}, Code: {depot_code})")
            else:
                print(f"Depot {depot_code} not found")
        
        # Get all stock records for this product
        if depot_id:
            result = db.execute(text("""
                SELECT id, depot_id, stock_qty 
                FROM product_item_stock 
                WHERE product_id = :product_id AND depot_id = :depot_id
            """), {"product_id": product_id, "depot_id": depot_id})
        else:
            result = db.execute(text("""
                SELECT id, depot_id, stock_qty 
                FROM product_item_stock 
                WHERE product_id = :product_id
            """), {"product_id": product_id})
        
        stock_records = result.fetchall()
        print(f"\nStock records: {len(stock_records)}")
        
        if len(stock_records) == 0:
            print("  ❌ No stock records found for this product")
            return
        
        # Get batches for each stock record
        total_batches = 0
        numeric_batches = 0
        batches_with_stock = 0
        
        for stock_id, stock_depot_id, stock_qty in stock_records:
            result = db.execute(text("""
                SELECT batch_no, quantity, available_quantity, reserved_quantity, expiry_date
                FROM product_item_stock_details
                WHERE item_code = :stock_id
            """), {"stock_id": stock_id})
            
            batches = result.fetchall()
            print(f"\n  Stock Record ID {stock_id} (Depot ID: {stock_depot_id}):")
            
            for batch_no, qty, avail_qty, res_qty, expiry in batches:
                total_batches += 1
                is_numeric = batch_no and batch_no.strip().isdigit()
                has_stock = float(avail_qty or 0) > 0
                
                if is_numeric:
                    numeric_batches += 1
                if has_stock:
                    batches_with_stock += 1
                
                status = []
                if not is_numeric:
                    status.append("NON-NUMERIC")
                if not has_stock:
                    status.append("NO STOCK")
                
                status_str = f" [{', '.join(status)}]" if status else " ✅"
                
                print(f"    Batch: {batch_no} | Qty: {qty} | Available: {avail_qty} | Reserved: {res_qty} | Expiry: {expiry}{status_str}")
        
        print(f"\nSummary:")
        print(f"  Total batches: {total_batches}")
        print(f"  Numeric batches: {numeric_batches}")
        print(f"  Batches with stock: {batches_with_stock}")
        print(f"  Numeric batches with stock: {min(numeric_batches, batches_with_stock)}")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("product_code", help="Product code to check")
    parser.add_argument("--depot", help="Depot code to filter")
    args = parser.parse_args()
    check_product_batches(args.product_code, args.depot)

