"""
Seed script for product stock data with medicine names, proper codes, and multiple batches
"""
import sys
import os
from datetime import datetime, date, timedelta
from decimal import Decimal

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Product, Depot, ProductItemStock, ProductItemStockDetail, Base

# Medicine products with consistent code and SKU architecture
MEDICINE_PRODUCTS = [
    {
        "name": "Omeprazole Capsule 20 mg",
        "code": "M04000123",  # Product code
        "sku": "SKU-M04000123",  # SKU code
        "old_code": "M04000123",
        "new_code": "N04000123",
        "generic_name": "Omeprazole",
        "unit_of_measure": "Bottle",
        "base_price": 95.00,
        "primary_packaging": "Bottle",
        "batches": [
            {"batch_no": "2024001", "quantity": 500, "expiry": date(2026, 3, 15), "mfg_date": date(2024, 3, 15)},
            {"batch_no": "2024002", "quantity": 750, "expiry": date(2026, 6, 20), "mfg_date": date(2024, 6, 20)},
            {"batch_no": "2024003", "quantity": 300, "expiry": date(2026, 9, 10), "mfg_date": date(2024, 9, 10)},
        ]
    },
    {
        "name": "Paracetamol Tablet 500 mg",
        "code": "M01000001",
        "sku": "SKU-M01000001",
        "old_code": "M01000001",
        "new_code": "N01000001",
        "generic_name": "Paracetamol",
        "unit_of_measure": "Strip",
        "base_price": 25.00,
        "primary_packaging": "Blister",
        "batches": [
            {"batch_no": "2024004", "quantity": 1000, "expiry": date(2025, 12, 31), "mfg_date": date(2024, 1, 15)},
            {"batch_no": "2024005", "quantity": 1500, "expiry": date(2026, 3, 31), "mfg_date": date(2024, 4, 1)},
        ]
    },
    {
        "name": "Amoxicillin Capsule 250 mg",
        "code": "M02000045",
        "sku": "SKU-M02000045",
        "old_code": "M02000045",
        "new_code": "N02000045",
        "generic_name": "Amoxicillin",
        "unit_of_measure": "Bottle",
        "base_price": 120.00,
        "primary_packaging": "Bottle",
        "batches": [
            {"batch_no": "2024006", "quantity": 400, "expiry": date(2025, 11, 30), "mfg_date": date(2024, 2, 10)},
            {"batch_no": "2024007", "quantity": 600, "expiry": date(2026, 2, 28), "mfg_date": date(2024, 5, 15)},
            {"batch_no": "2024008", "quantity": 350, "expiry": date(2026, 5, 15), "mfg_date": date(2024, 8, 1)},
        ]
    },
    {
        "name": "Cetirizine Tablet 10 mg",
        "code": "M03000078",
        "sku": "SKU-M03000078",
        "old_code": "M03000078",
        "new_code": "N03000078",
        "generic_name": "Cetirizine",
        "unit_of_measure": "Strip",
        "base_price": 35.00,
        "primary_packaging": "Blister",
        "batches": [
            {"batch_no": "2024009", "quantity": 800, "expiry": date(2026, 1, 20), "mfg_date": date(2024, 1, 20)},
        ]
    },
    {
        "name": "Metformin Tablet 500 mg",
        "code": "M05000156",
        "sku": "SKU-M05000156",
        "old_code": "M05000156",
        "new_code": "N05000156",
        "generic_name": "Metformin",
        "unit_of_measure": "Strip",
        "base_price": 45.00,
        "primary_packaging": "Blister",
        "batches": [
            {"batch_no": "2024010", "quantity": 1200, "expiry": date(2026, 8, 31), "mfg_date": date(2024, 2, 28)},
            {"batch_no": "2024011", "quantity": 900, "expiry": date(2026, 11, 30), "mfg_date": date(2024, 5, 10)},
        ]
    },
    {
        "name": "Ibuprofen Tablet 400 mg",
        "code": "M06000234",
        "sku": "SKU-M06000234",
        "old_code": "M06000234",
        "new_code": "N06000234",
        "generic_name": "Ibuprofen",
        "unit_of_measure": "Strip",
        "base_price": 55.00,
        "primary_packaging": "Blister",
        "batches": [
            {"batch_no": "2024012", "quantity": 600, "expiry": date(2026, 4, 15), "mfg_date": date(2024, 4, 15)},
            {"batch_no": "2024013", "quantity": 450, "expiry": date(2026, 7, 20), "mfg_date": date(2024, 7, 20)},
            {"batch_no": "2024014", "quantity": 550, "expiry": date(2026, 10, 5), "mfg_date": date(2024, 10, 5)},
        ]
    },
    {
        "name": "Amlodipine Tablet 5 mg",
        "code": "M07000345",
        "sku": "SKU-M07000345",
        "old_code": "M07000345",
        "new_code": "N07000345",
        "generic_name": "Amlodipine",
        "unit_of_measure": "Strip",
        "base_price": 65.00,
        "primary_packaging": "Blister",
        "batches": [
            {"batch_no": "2024015", "quantity": 700, "expiry": date(2026, 5, 31), "mfg_date": date(2024, 6, 1)},
            {"batch_no": "2024016", "quantity": 500, "expiry": date(2026, 8, 15), "mfg_date": date(2024, 8, 15)},
        ]
    },
    {
        "name": "Atorvastatin Tablet 10 mg",
        "code": "M08000456",
        "sku": "SKU-M08000456",
        "old_code": "M08000456",
        "new_code": "N08000456",
        "generic_name": "Atorvastatin",
        "unit_of_measure": "Strip",
        "base_price": 85.00,
        "primary_packaging": "Blister",
        "batches": [
            {"batch_no": "2024017", "quantity": 400, "expiry": date(2026, 6, 30), "mfg_date": date(2024, 7, 1)},
            {"batch_no": "2024018", "quantity": 350, "expiry": date(2026, 9, 15), "mfg_date": date(2024, 9, 15)},
            {"batch_no": "2024019", "quantity": 300, "expiry": date(2026, 12, 20), "mfg_date": date(2024, 12, 20)},
        ]
    },
    {
        "name": "Levetiracetam Injection 100 ml",
        "code": "M09000567",
        "sku": "SKU-M09000567",
        "old_code": "M09000567",
        "new_code": "N09000567",
        "generic_name": "Levetiracetam",
        "unit_of_measure": "Vial",
        "base_price": 220.00,
        "primary_packaging": "Vial",
        "batches": [
            {"batch_no": "2024020", "quantity": 200, "expiry": date(2025, 10, 31), "mfg_date": date(2024, 3, 15)},
            {"batch_no": "2024021", "quantity": 150, "expiry": date(2026, 1, 31), "mfg_date": date(2024, 6, 20)},
        ]
    },
    {
        "name": "Betahistine Tablet 16 mg",
        "code": "M10000678",
        "sku": "SKU-M10000678",
        "old_code": "M10000678",
        "new_code": "N10000678",
        "generic_name": "Betahistine",
        "unit_of_measure": "Strip",
        "base_price": 120.00,
        "primary_packaging": "Blister",
        "batches": [
            {"batch_no": "2024022", "quantity": 500, "expiry": date(2026, 2, 28), "mfg_date": date(2024, 3, 1)},
        ]
    },
]

def seed_product_stock(db: Session):
    """Seed product stock data"""
    print("Starting product stock data seeding...")
    
    # Get first depot (or create one if none exists)
    depot = db.query(Depot).first()
    if not depot:
        print("No depot found. Please create a depot first.")
        return
    
    created_count = 0
    updated_count = 0
    
    for product_data in MEDICINE_PRODUCTS:
        # Find or create product
        product = db.query(Product).filter(Product.code == product_data["code"]).first()
        
        if not product:
            # Create product if it doesn't exist
            product = Product(
                name=product_data["name"],
                code=product_data["code"],
                sku=product_data["sku"],
                old_code=product_data["old_code"],
                new_code=product_data["new_code"],
                generic_name=product_data["generic_name"],
                unit_of_measure=product_data["unit_of_measure"],
                base_price=Decimal(str(product_data["base_price"])),
                primary_packaging=product_data["primary_packaging"],
                is_active=True
            )
            db.add(product)
            db.flush()
            print(f"Created product: {product_data['name']} ({product_data['code']})")
        else:
            # Update product to ensure consistency
            product.name = product_data["name"]
            product.sku = product_data["sku"]
            product.old_code = product_data["old_code"]
            product.new_code = product_data["new_code"]
            product.generic_name = product_data["generic_name"]
            product.unit_of_measure = product_data["unit_of_measure"]
            product.primary_packaging = product_data["primary_packaging"]
            print(f"Updated product: {product_data['name']} ({product_data['code']})")
        
        # Calculate total quantities from batches
        total_quantity = sum(batch["quantity"] for batch in product_data["batches"])
        total_receive = total_quantity
        
        # Find or create product item stock
        item_stock = db.query(ProductItemStock).filter(
            ProductItemStock.product_id == product.id,
            ProductItemStock.depot_id == depot.id
        ).first()
        
        if not item_stock:
            item_stock = ProductItemStock(
                product_id=product.id,
                product_code=product_data["code"],
                sku_code=product_data["sku"],
                gross_stock_receive=Decimal(str(total_receive)),
                issue=Decimal("0"),
                stock_qty=Decimal(str(total_quantity)),
                adjusted_stock_in_qty=Decimal("0"),
                adjusted_stock_out_qty=Decimal("0"),
                depot_id=depot.id
            )
            db.add(item_stock)
            db.flush()
            created_count += 1
            print(f"  Created stock record for {product_data['name']}")
        else:
            # Update stock quantities
            item_stock.product_code = product_data["code"]
            item_stock.sku_code = product_data["sku"]
            item_stock.gross_stock_receive = Decimal(str(total_receive))
            item_stock.stock_qty = Decimal(str(total_quantity))
            updated_count += 1
            print(f"  Updated stock record for {product_data['name']}")
        
        # Create batch details
        for batch_data in product_data["batches"]:
            batch_detail = db.query(ProductItemStockDetail).filter(
                ProductItemStockDetail.item_code == item_stock.id,
                ProductItemStockDetail.batch_no == batch_data["batch_no"]
            ).first()
            
            if not batch_detail:
                batch_detail = ProductItemStockDetail(
                    item_code=item_stock.id,
                    batch_no=batch_data["batch_no"],
                    expiry_date=batch_data["expiry"],
                    quantity=Decimal(str(batch_data["quantity"])),
                    available_quantity=Decimal(str(batch_data["quantity"])),
                    reserved_quantity=Decimal("0"),
                    manufacturing_date=batch_data["mfg_date"],
                    storage_type="Ambient",
                    status="Unrestricted",
                    source_type="FACTORY"
                )
                db.add(batch_detail)
                print(f"    Created batch: {batch_data['batch_no']} (Qty: {batch_data['quantity']})")
            else:
                batch_detail.quantity = Decimal(str(batch_data["quantity"]))
                batch_detail.available_quantity = Decimal(str(batch_data["quantity"]))
                batch_detail.expiry_date = batch_data["expiry"]
                batch_detail.manufacturing_date = batch_data["mfg_date"]
                print(f"    Updated batch: {batch_data['batch_no']} (Qty: {batch_data['quantity']})")
    
    try:
        db.commit()
        print(f"\n✅ Seeding completed successfully!")
        print(f"   Created: {created_count} stock records")
        print(f"   Updated: {updated_count} stock records")
        print(f"   Total products processed: {len(MEDICINE_PRODUCTS)}")
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error during seeding: {e}")
        raise

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_product_stock(db)
    finally:
        db.close()

