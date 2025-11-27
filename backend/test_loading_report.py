#!/usr/bin/env python3
"""
Test script to verify loading report generation
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Order
from app.routers.orders import get_loading_report
from fastapi import HTTPException

def test_report():
    db = SessionLocal()
    try:
        # Find an order with loading_number
        order = db.query(Order).filter(Order.loading_number.isnot(None)).first()
        
        if not order:
            print("No orders with loading_number found. Creating a test loading number...")
            # Get an assigned order and add a loading number
            assigned_order = db.query(Order).filter(
                Order.assigned_to.isnot(None),
                Order.assigned_vehicle.isnot(None)
            ).first()
            
            if assigned_order:
                from datetime import date
                assigned_order.loading_number = "20251125-0001"
                assigned_order.loading_date = date.today()
                assigned_order.area = "Test Area"
                db.commit()
                print(f"Created test loading number: {assigned_order.loading_number}")
                loading_number = assigned_order.loading_number
            else:
                print("No assigned orders found. Please assign some orders first.")
                return
        else:
            loading_number = order.loading_number
            print(f"Found order with loading_number: {loading_number}")
        
        # Test the report generation
        print(f"\nTesting report generation for loading_number: {loading_number}")
        try:
            response = get_loading_report(loading_number, db)
            print(f"✅ Report generated successfully!")
            print(f"   Content-Type: {response.media_type}")
            print(f"   Content-Length: {len(response.body)} bytes")
            print(f"   Headers: {response.headers}")
            
            # Save to file for inspection
            with open(f"/tmp/test_report_{loading_number}.pdf", "wb") as f:
                f.write(response.body)
            print(f"   Saved to: /tmp/test_report_{loading_number}.pdf")
            
        except HTTPException as e:
            print(f"❌ HTTP Error: {e.status_code} - {e.detail}")
        except Exception as e:
            print(f"❌ Error: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            
    finally:
        db.close()

if __name__ == "__main__":
    test_report()

