from app.database import SessionLocal
from app import models

session = SessionLocal()
receipts = session.query(models.ProductReceipt).order_by(models.ProductReceipt.created_at.desc()).limit(3).all()
for receipt in receipts:
    print(receipt.id, receipt.receipt_number, receipt.source_type, receipt.status, len(receipt.items))
    for item in receipt.items:
        print('  ', item.item_name, item.depot_quantity)
session.close()
