"""Seed script for collection approval demo data"""
from app.database import SessionLocal
from app.models import Order, OrderItem, Product, Customer, Employee, Depot, OrderStatusEnum
from datetime import date, datetime, timedelta
from decimal import Decimal
import random

def seed_collection_orders():
    db = SessionLocal()
    try:
        # Get existing data
        products = db.query(Product).limit(5).all()
        customers = db.query(Customer).limit(5).all()
        employees = db.query(Employee).limit(3).all()
        depots = db.query(Depot).limit(2).all()
        
        if not products or not customers or not employees or not depots:
            print("Need products, customers, employees, and depots to create collection orders")
            return
        
        # Generate memo numbers
        def generate_memo():
            return str(random.randint(10000000, 99999999))
        
        # Create sample orders with collection status
        collection_orders = [
            {
                "order_number": f"ORD-{date.today().strftime('%Y%m%d')}-001",
                "memo_number": generate_memo(),
                "depot_code": depots[0].code if depots[0].code else "DEPOT-001",
                "depot_name": depots[0].name,
                "customer_id": str(customers[0].id),
                "customer_name": customers[0].name,
                "customer_code": customers[0].code,
                "pso_id": str(employees[0].id),
                "pso_name": f"{employees[0].first_name} {employees[0].last_name or ''}".strip(),
                "pso_code": employees[0].employee_id,
                "delivery_date": date.today(),
                "collection_status": "Pending",
                "collection_source": "Mobile App",
                "collected_amount": Decimal('0'),
                "items": [
                    {"product": products[0], "quantity": 50, "price": 25.50},
                    {"product": products[1] if len(products) > 1 else products[0], "quantity": 30, "price": 45.00},
                ]
            },
            {
                "order_number": f"ORD-{date.today().strftime('%Y%m%d')}-002",
                "memo_number": generate_memo(),
                "depot_code": depots[0].code if depots[0].code else "DEPOT-001",
                "depot_name": depots[0].name,
                "customer_id": str(customers[1].id) if len(customers) > 1 else str(customers[0].id),
                "customer_name": customers[1].name if len(customers) > 1 else customers[0].name,
                "customer_code": customers[1].code if len(customers) > 1 else customers[0].code,
                "pso_id": str(employees[1].id) if len(employees) > 1 else str(employees[0].id),
                "pso_name": f"{employees[1].first_name} {employees[1].last_name or ''}".strip() if len(employees) > 1 else f"{employees[0].first_name} {employees[0].last_name or ''}".strip(),
                "pso_code": employees[1].employee_id if len(employees) > 1 else employees[0].employee_id,
                "delivery_date": date.today() - timedelta(days=1),
                "collection_status": "Partially Collected",
                "collection_type": "Partial",
                "collection_source": "Mobile App",
                "collected_amount": Decimal('1500.00'),
                "items": [
                    {"product": products[0], "quantity": 100, "price": 25.50},
                    {"product": products[2] if len(products) > 2 else products[0], "quantity": 50, "price": 35.75},
                ]
            },
            {
                "order_number": f"ORD-{date.today().strftime('%Y%m%d')}-003",
                "memo_number": generate_memo(),
                "depot_code": depots[0].code if depots[0].code else "DEPOT-001",
                "depot_name": depots[0].name,
                "customer_id": str(customers[2].id) if len(customers) > 2 else str(customers[0].id),
                "customer_name": customers[2].name if len(customers) > 2 else customers[0].name,
                "customer_code": customers[2].code if len(customers) > 2 else customers[0].code,
                "pso_id": str(employees[0].id),
                "pso_name": f"{employees[0].first_name} {employees[0].last_name or ''}".strip(),
                "pso_code": employees[0].employee_id,
                "delivery_date": date.today() - timedelta(days=2),
                "collection_status": "Postponed",
                "collection_type": "Postponed",
                "collection_source": "Mobile App",
                "collected_amount": Decimal('0'),
                "items": [
                    {"product": products[0], "quantity": 75, "price": 25.50},
                ]
            },
            {
                "order_number": f"ORD-{date.today().strftime('%Y%m%d')}-004",
                "memo_number": generate_memo(),
                "depot_code": depots[1].code if len(depots) > 1 and depots[1].code else "DEPOT-002",
                "depot_name": depots[1].name if len(depots) > 1 else depots[0].name,
                "customer_id": str(customers[0].id),
                "customer_name": customers[0].name,
                "customer_code": customers[0].code,
                "pso_id": str(employees[2].id) if len(employees) > 2 else str(employees[0].id),
                "pso_name": f"{employees[2].first_name} {employees[2].last_name or ''}".strip() if len(employees) > 2 else f"{employees[0].first_name} {employees[0].last_name or ''}".strip(),
                "pso_code": employees[2].employee_id if len(employees) > 2 else employees[0].employee_id,
                "delivery_date": date.today(),
                "collection_status": "Pending",
                "collection_source": "Mobile App",
                "collected_amount": Decimal('0'),
                "items": [
                    {"product": products[1] if len(products) > 1 else products[0], "quantity": 40, "price": 45.00},
                    {"product": products[3] if len(products) > 3 else products[0], "quantity": 25, "price": 15.25},
                ]
            },
            {
                "order_number": f"ORD-{date.today().strftime('%Y%m%d')}-005",
                "memo_number": generate_memo(),
                "depot_code": depots[0].code if depots[0].code else "DEPOT-001",
                "depot_name": depots[0].name,
                "customer_id": str(customers[3].id) if len(customers) > 3 else str(customers[0].id),
                "customer_name": customers[3].name if len(customers) > 3 else customers[0].name,
                "customer_code": customers[3].code if len(customers) > 3 else customers[0].code,
                "pso_id": str(employees[1].id) if len(employees) > 1 else str(employees[0].id),
                "pso_name": f"{employees[1].first_name} {employees[1].last_name or ''}".strip() if len(employees) > 1 else f"{employees[0].first_name} {employees[0].last_name or ''}".strip(),
                "pso_code": employees[1].employee_id if len(employees) > 1 else employees[0].employee_id,
                "delivery_date": date.today() - timedelta(days=1),
                "collection_status": "Partially Collected",
                "collection_type": "Partial",
                "collection_source": "Mobile App",
                "collected_amount": Decimal('2500.00'),
                "items": [
                    {"product": products[0], "quantity": 150, "price": 25.50},
                    {"product": products[1] if len(products) > 1 else products[0], "quantity": 80, "price": 45.00},
                    {"product": products[2] if len(products) > 2 else products[0], "quantity": 60, "price": 35.75},
                ]
            },
        ]
        
        created_count = 0
        for order_data in collection_orders:
            # Check if order with this memo_number already exists
            existing = db.query(Order).filter(Order.memo_number == order_data["memo_number"]).first()
            if existing:
                print(f"Skipping order with memo {order_data['memo_number']} - already exists")
                continue
            
            # Create order
            order = Order(
                order_number=order_data["order_number"],
                memo_number=order_data["memo_number"],
                depot_code=order_data["depot_code"],
                depot_name=order_data["depot_name"],
                customer_id=order_data["customer_id"],
                customer_name=order_data["customer_name"],
                customer_code=order_data["customer_code"],
                pso_id=order_data["pso_id"],
                pso_name=order_data["pso_name"],
                pso_code=order_data["pso_code"],
                delivery_date=order_data["delivery_date"],
                status=OrderStatusEnum.APPROVED,  # Use APPROVED status
                collection_status=order_data["collection_status"],
                collection_type=order_data.get("collection_type"),
                collected_amount=order_data["collected_amount"],
                collection_source=order_data["collection_source"],
            )
            
            db.add(order)
            db.flush()
            
            # Add items
            for item_data in order_data["items"]:
                item = OrderItem(
                    order_id=order.id,
                    product_code=item_data["product"].code or item_data["product"].sku,
                    product_name=item_data["product"].name,
                    quantity=item_data["quantity"],
                    free_goods=0,
                    total_quantity=item_data["quantity"],
                    trade_price=Decimal(str(item_data["price"])),
                    unit_price=Decimal(str(item_data["price"])),
                    discount_percent=Decimal('0'),
                    delivery_date=order_data["delivery_date"],  # Add delivery_date
                )
                db.add(item)
            
            created_count += 1
        
        db.commit()
        print(f"Successfully created {created_count} collection approval orders with items")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding collection orders: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_collection_orders()

