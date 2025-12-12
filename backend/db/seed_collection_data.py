"""Seed data for Remaining Cash Deposit List and Approval for Collection.

This script creates:
1. Orders for Remaining Cash Deposit List (approved from Assigned Order List, collection_source="Web")
   - Status: Pending, Partially Collected, Postponed
   - collection_approved = False
   - Has loading_number, assigned employee, vehicle

2. Orders for Approval for Collection (from Mobile App, collection_source="Mobile App")
   - Status: Partially Collected, Postponed
   - collection_approved = False
   - Has loading_number, assigned employee, vehicle

Run with:
    cd backend
    python -m db.seed_collection_data
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
import random

from app.database import SessionLocal
from app import models

def generate_order_number(order_id: int) -> str:
    """Generate order number in format order-{id}"""
    return f"order-{order_id}"

def generate_loading_number(index: int) -> str:
    """Generate loading number in format LOAD-YYYYMMDD-XXX"""
    today = datetime.utcnow().date()
    return f"LOAD-{today.strftime('%Y%m%d')}-{str(index).zfill(3)}"

def seed_collection_data():
    """Create orders for Remaining Cash Deposit List and Approval for Collection"""
    session = SessionLocal()
    
    try:
        print("🌱 Seeding collection data (Remaining Cash Deposit List & Approval for Collection)...")
        
        # Get existing data
        products = session.query(models.Product).limit(20).all()
        customers = session.query(models.Customer).limit(15).all()
        employees = session.query(models.Employee).limit(10).all()
        vehicles = session.query(models.Vehicle).filter(models.Vehicle.status == "Active").limit(10).all()
        routes = session.query(models.Route).filter(models.Route.status == "Active").limit(5).all()
        depots = session.query(models.Depot).limit(3).all()
        
        if not products or not customers or not employees or not vehicles or not routes:
            print("⚠️  Missing required data: products, customers, employees, vehicles, or routes")
            print("   Please run seed_master_data.py first")
            return
        
        depot = depots[0] if depots else None
        
        # Collection statuses for Remaining Cash Deposit List
        remaining_cash_statuses = ["Pending", "Partially Collected", "Postponed"]
        
        # Collection statuses for Approval for Collection (Mobile App)
        mobile_app_statuses = ["Partially Collected", "Postponed"]
        
        loading_number_counter = 1
        total_remaining_cash_orders = 0
        total_approval_collection_orders = 0
        
        # ===== 1. CREATE ORDERS FOR REMAINING CASH DEPOSIT LIST =====
        print("\n📋 Creating orders for Remaining Cash Deposit List...")
        
        for status_idx, collection_status in enumerate(remaining_cash_statuses):
            # Create 2 loading groups per status
            for loading_group in range(2):
                loading_number = generate_loading_number(loading_number_counter)
                loading_number_counter += 1
                
                # Get random employee and vehicle
                employee = employees[loading_group % len(employees)]
                vehicle = vehicles[loading_group % len(vehicles)]
                route = routes[loading_group % len(routes)]
                
                # Create 3-5 orders per loading group
                num_orders = random.randint(3, 5)
                
                for order_idx in range(num_orders):
                    customer = customers[(status_idx * 2 + loading_group + order_idx) % len(customers)]
                    
                    order = models.Order(
                        order_number=None,  # Will be set after flush
                        depot_code=depot.code if depot else "120",
                        depot_name=depot.name if depot else "Kushtia Depot",
                        customer_id=str(customer.id),
                        customer_name=customer.name,
                        customer_code=customer.code,
                        pso_id=str(employee.id),
                        pso_name=f"{employee.first_name} {employee.last_name or ''}".strip(),
                        pso_code=employee.employee_id,
                        route_code=route.route_id,
                        route_name=route.name,
                        delivery_date=date.today() + timedelta(days=random.randint(1, 7)),
                        status=models.OrderStatusEnum.APPROVED,
                        validated=True,
                        printed=True,
                        loaded=True,
                        postponed=False,
                        collection_status=collection_status,
                        collection_source="Web",  # From Assigned Order List
                        collection_approved=False,  # Not yet approved
                        loading_number=loading_number,
                        loading_date=date.today() - timedelta(days=random.randint(0, 2)),
                        area=route.name.split()[0] if route.name else "Area",
                        assigned_to=employee.id,
                        assigned_vehicle=vehicle.id,
                        assignment_date=datetime.utcnow() - timedelta(days=random.randint(1, 3)),
                        loaded_at=datetime.utcnow() - timedelta(days=random.randint(0, 1)),
                        notes=f"Remaining cash deposit order - {collection_status}"
                    )
                    session.add(order)
                    session.flush()
                    order.order_number = f"order-{order.id}"
                    
                    # Calculate total amount for collection status
                    total_amount = Decimal("0")
                    num_items = random.randint(2, 4)
                    selected_products = [products[(status_idx * 2 + loading_group + order_idx + i) % len(products)] for i in range(num_items)]
                    
                    for prod_idx, product in enumerate(selected_products):
                        quantity = 50 + (order_idx * 10) + (prod_idx * 5)
                        free_goods = random.randint(0, 5)
                        total_qty = quantity + free_goods
                        
                        trade_price = product.base_price or Decimal("100")
                        unit_price = trade_price
                        discount_percent = Decimal(str(random.randint(0, 10)))
                        price_after_discount = unit_price * (1 - discount_percent / 100)
                        total_price = price_after_discount * total_qty
                        total_amount += total_price
                        
                        order_item = models.OrderItem(
                            order_id=order.id,
                            product_code=product.code,
                            product_name=product.name,
                            pack_size=product.primary_packaging or product.unit_of_measure or "Nos",
                            quantity=quantity,
                            free_goods=free_goods,
                            total_quantity=total_qty,
                            trade_price=trade_price,
                            unit_price=unit_price,
                            discount_percent=discount_percent,
                            delivery_date=order.delivery_date,
                            selected=True
                        )
                        session.add(order_item)
                    
                    # Set collection amounts based on status
                    if collection_status == "Pending":
                        order.collected_amount = total_amount
                        order.pending_amount = Decimal('0')
                        order.collection_type = None
                    elif collection_status == "Partially Collected":
                        collected_ratio = Decimal(str(random.uniform(0.5, 0.9)))  # 50-90% collected
                        order.collected_amount = total_amount * collected_ratio
                        order.pending_amount = total_amount - order.collected_amount
                        order.collection_type = "Partial"
                    elif collection_status == "Postponed":
                        order.collected_amount = Decimal('0')
                        order.pending_amount = total_amount
                        order.collection_type = "Postponed"
                    
                    order.total_value = total_amount
                    total_remaining_cash_orders += 1
        
        print(f"✅ Created {total_remaining_cash_orders} orders for Remaining Cash Deposit List")
        
        # ===== 2. CREATE ORDERS FOR APPROVAL FOR COLLECTION (MOBILE APP) =====
        print("\n📱 Creating orders for Approval for Collection (Mobile App)...")
        
        for status_idx, collection_status in enumerate(mobile_app_statuses):
            # Create 2 loading groups per status
            for loading_group in range(2):
                loading_number = generate_loading_number(loading_number_counter)
                loading_number_counter += 1
                
                # Get different employee and vehicle
                employee = employees[(status_idx * 2 + loading_group + 3) % len(employees)]
                vehicle = vehicles[(status_idx * 2 + loading_group + 3) % len(vehicles)]
                route = routes[(status_idx * 2 + loading_group + 1) % len(routes)]
                
                # Create 2-4 orders per loading group
                num_orders = random.randint(2, 4)
                
                for order_idx in range(num_orders):
                    customer = customers[(status_idx * 2 + loading_group + order_idx + 5) % len(customers)]
                    
                    order = models.Order(
                        order_number=None,  # Will be set after flush
                        depot_code=depot.code if depot else "120",
                        depot_name=depot.name if depot else "Kushtia Depot",
                        customer_id=str(customer.id),
                        customer_name=customer.name,
                        customer_code=customer.code,
                        pso_id=str(employee.id),
                        pso_name=f"{employee.first_name} {employee.last_name or ''}".strip(),
                        pso_code=employee.employee_id,
                        route_code=route.route_id,
                        route_name=route.name,
                        delivery_date=date.today() + timedelta(days=random.randint(1, 7)),
                        status=models.OrderStatusEnum.APPROVED,
                        validated=True,
                        printed=True,
                        loaded=True,
                        postponed=False,
                        collection_status=collection_status,
                        collection_source="Mobile App",  # From mobile app
                        collection_approved=False,  # Needs approval
                        loading_number=loading_number,
                        loading_date=date.today() - timedelta(days=random.randint(0, 1)),
                        area=route.name.split()[0] if route.name else "Area",
                        assigned_to=employee.id,
                        assigned_vehicle=vehicle.id,
                        assignment_date=datetime.utcnow() - timedelta(days=random.randint(1, 2)),
                        loaded_at=datetime.utcnow() - timedelta(days=random.randint(0, 1)),
                        notes=f"Mobile app collection - {collection_status}"
                    )
                    session.add(order)
                    session.flush()
                    order.order_number = f"order-{order.id}"
                    
                    # Calculate total amount for collection status
                    total_amount = Decimal("0")
                    num_items = random.randint(2, 4)
                    selected_products = [products[(status_idx * 2 + loading_group + order_idx + i + 5) % len(products)] for i in range(num_items)]
                    
                    for prod_idx, product in enumerate(selected_products):
                        quantity = 40 + (order_idx * 8) + (prod_idx * 4)
                        free_goods = random.randint(0, 4)
                        total_qty = quantity + free_goods
                        
                        trade_price = product.base_price or Decimal("100")
                        unit_price = trade_price
                        discount_percent = Decimal(str(random.randint(0, 8)))
                        price_after_discount = unit_price * (1 - discount_percent / 100)
                        total_price = price_after_discount * total_qty
                        total_amount += total_price
                        
                        order_item = models.OrderItem(
                            order_id=order.id,
                            product_code=product.code,
                            product_name=product.name,
                            pack_size=product.primary_packaging or product.unit_of_measure or "Nos",
                            quantity=quantity,
                            free_goods=free_goods,
                            total_quantity=total_qty,
                            trade_price=trade_price,
                            unit_price=unit_price,
                            discount_percent=discount_percent,
                            delivery_date=order.delivery_date,
                            selected=True
                        )
                        session.add(order_item)
                    
                    # Set collection amounts based on status
                    if collection_status == "Partially Collected":
                        collected_ratio = Decimal(str(random.uniform(0.3, 0.7)))  # 30-70% collected
                        order.collected_amount = total_amount * collected_ratio
                        order.pending_amount = total_amount - order.collected_amount
                        order.collection_type = "Partial"
                    elif collection_status == "Postponed":
                        order.collected_amount = Decimal('0')
                        order.pending_amount = total_amount
                        order.collection_type = "Postponed"
                    
                    order.total_value = total_amount
                    total_approval_collection_orders += 1
        
        print(f"✅ Created {total_approval_collection_orders} orders for Approval for Collection")
        
        session.commit()
        
        print("\n✅ Collection data seeding completed successfully!")
        print(f"   - Remaining Cash Deposit List: {total_remaining_cash_orders} orders across {len(remaining_cash_statuses) * 2} loading groups")
        print(f"   - Approval for Collection: {total_approval_collection_orders} orders across {len(mobile_app_statuses) * 2} loading groups")
        print(f"   - Total loading numbers created: {loading_number_counter - 1}")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error seeding collection data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()


if __name__ == "__main__":
    seed_collection_data()

