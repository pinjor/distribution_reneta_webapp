"""Seed script to mark some orders as postponed for testing"""
from app.database import SessionLocal
from app.models import Order, OrderStatusEnum
from datetime import date, datetime, timedelta

def seed_postponed_orders():
    """Mark some validated orders as postponed"""
    db = SessionLocal()
    try:
        # Get validated orders that are not already loaded
        validated_orders = (
            db.query(Order)
            .filter(
                Order.validated == True,
                Order.loaded == False,
                Order.status.in_([OrderStatusEnum.APPROVED, OrderStatusEnum.PARTIALLY_APPROVED])
            )
            .limit(5)
            .all()
        )
        
        if not validated_orders:
            print("No validated orders found to mark as postponed")
            return
        
        postponed_count = 0
        for i, order in enumerate(validated_orders[:3]):  # Mark first 3 as postponed
            order.postponed = True
            order.printed = False  # Reset printed status as postponed orders shouldn't be printed
            postponed_count += 1
        
        db.commit()
        print(f"✓ Successfully marked {postponed_count} orders as postponed")
        
    except Exception as e:
        print(f"Error marking orders as postponed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_postponed_orders()

