"""Seed comprehensive orders for all routes - ensuring route wise memo list and delivery order list have data.

This script creates:
1. Validated orders that appear in Route Wise Memo List (validated=True, loaded=False)
2. Orders for Delivery Order List (validated orders that can be converted to delivery orders)
3. Ensures all routes have at least some orders

Run with:
    cd backend
    python -m db.seed_complete_orders
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import text

from app.database import SessionLocal
from app import models

def generate_order_number(order_id: int) -> str:
    """Generate order number in format order-{id}"""
    return f"order-{order_id}"

def seed_complete_orders():
    """Create orders for all routes with proper validation status"""
    session = SessionLocal()
    
    try:
        print("🌱 Seeding complete orders data...")
        
        # Get existing data
        products = session.query(models.Product).limit(20).all()
        customers = session.query(models.Customer).limit(15).all()
        employees = session.query(models.Employee).limit(5).all()
        depots = session.query(models.Depot).limit(3).all()
        routes = session.query(models.Route).filter(models.Route.status == "Active").all()
        
        if not products or not customers or not employees or not depots:
            print("⚠️  Missing required data: products, customers, employees, or depots")
            print("   Please run seed_master_data.py first")
            return
        
        if not routes:
            print("⚠️  No active routes found. Please create routes first.")
            print("   You can run seed_route_demo_data.py to create routes")
            return
        
        # Get depot
        depot = depots[0]
        
        delivery_date = date.today() + timedelta(days=3)
        
        orders_created = 0
        route_order_counts = {}
        
        # Create orders for each route
        for route_idx, route in enumerate(routes):
            route_order_counts[route.route_id] = 0
            
            # Each route gets at least 8 orders:
            # - 5 validated orders (will appear in Route Wise Memo List)
            # - 3 non-validated orders (will appear in Order List for validation)
            
            # Create 5 VALIDATED orders per route (for Route Wise Memo List)
            for i in range(5):
                customer = customers[(route_idx * 5 + i) % len(customers)]
                employee = employees[i % len(employees)]
                
                order = models.Order(
                    depot_code=depot.code,
                    depot_name=depot.name,
                    customer_id=str(customer.id),
                    customer_name=customer.name,
                    customer_code=customer.code,
                    pso_id=str(employee.id),
                    pso_name=f"{employee.first_name} {employee.last_name or ''}".strip(),
                    pso_code=employee.employee_id,
                    route_code=route.route_id,
                    route_name=route.name,
                    delivery_date=delivery_date,
                    status=models.OrderStatusEnum.APPROVED,
                    validated=True,  # Validated orders appear in Route Wise Memo List
                    printed=False,  # Not yet printed
                    loaded=False,  # Not yet loaded
                    postponed=False,
                )
                session.add(order)
                session.flush()
                
                # Generate order number
                order.order_number = generate_order_number(order.id)
                
                # Add 2-4 products per order
                num_products = (i % 3) + 2  # 2, 3, or 4 products
                selected_products = [products[(route_idx * 5 + i + j) % len(products)] for j in range(num_products)]
                
                total_amount = Decimal("0")
                
                for prod_idx, product in enumerate(selected_products):
                    quantity = 50 + (i * 10) + (prod_idx * 5)
                    free_goods = 2 + (prod_idx % 3)
                    total_qty = quantity + free_goods
                    
                    trade_price = product.base_price or Decimal("100")
                    unit_price = trade_price
                    discount_percent = Decimal(str((i + prod_idx) % 10))  # 0-9% discount
                    price_after_discount = unit_price * (1 - discount_percent / 100)
                    item_total = price_after_discount * total_qty
                    total_amount += item_total
                    
                    order_item = models.OrderItem(
                        product_code=product.code,
                        product_name=product.name,
                        pack_size=product.primary_packaging or product.unit_of_measure or "Nos",
                        quantity=quantity,
                        free_goods=free_goods,
                        total_quantity=total_qty,
                        trade_price=trade_price,
                        unit_price=unit_price,
                        discount_percent=discount_percent,
                        delivery_date=delivery_date,
                        selected=True,  # All items selected for validated orders
                    )
                    order.items.append(order_item)
                
                orders_created += 1
                route_order_counts[route.route_id] += 1
            
            # Create 3 NON-VALIDATED orders per route (for Order List - to be validated)
            for i in range(3):
                customer = customers[(route_idx * 5 + i + 5) % len(customers)]
                employee = employees[(i + 2) % len(employees)]
                
                order = models.Order(
                    depot_code=depot.code,
                    depot_name=depot.name,
                    customer_id=str(customer.id),
                    customer_name=customer.name,
                    customer_code=customer.code,
                    pso_id=str(employee.id),
                    pso_name=f"{employee.first_name} {employee.last_name or ''}".strip(),
                    pso_code=employee.employee_id,
                    route_code=route.route_id,
                    route_name=route.name,
                    delivery_date=delivery_date + timedelta(days=1),
                    status=models.OrderStatusEnum.APPROVED,
                    validated=False,  # Not validated yet - will appear in Order List
                    printed=False,
                    loaded=False,
                    postponed=False,
                )
                session.add(order)
                session.flush()
                
                # Generate order number
                order.order_number = generate_order_number(order.id)
                
                # Add 2-3 products per order
                num_products = (i % 2) + 2  # 2 or 3 products
                selected_products = [products[(route_idx * 5 + i + 5 + j) % len(products)] for j in range(num_products)]
                
                for prod_idx, product in enumerate(selected_products):
                    quantity = 40 + (i * 8) + (prod_idx * 4)
                    free_goods = 1 + (prod_idx % 2)
                    total_qty = quantity + free_goods
                    
                    trade_price = product.base_price or Decimal("80")
                    unit_price = trade_price
                    discount_percent = Decimal(str((i + prod_idx) % 8))  # 0-7% discount
                    
                    order_item = models.OrderItem(
                        product_code=product.code,
                        product_name=product.name,
                        pack_size=product.primary_packaging or product.unit_of_measure or "Nos",
                        quantity=quantity,
                        free_goods=free_goods,
                        total_quantity=total_qty,
                        trade_price=trade_price,
                        unit_price=unit_price,
                        discount_percent=discount_percent,
                        delivery_date=delivery_date + timedelta(days=1),
                        selected=True,  # Pre-select for easier validation
                    )
                    order.items.append(order_item)
                
                orders_created += 1
                route_order_counts[route.route_id] += 1
        
        session.commit()
        
        print(f"\n✅ Created {orders_created} orders across {len(routes)} routes")
        
        # Print summary by route
        print("\n📊 Summary by Route:")
        for route in routes:
            validated_count = session.query(models.Order).filter(
                models.Order.route_code == route.route_id,
                models.Order.validated == True,
                models.Order.loaded == False
            ).count()
            
            non_validated_count = session.query(models.Order).filter(
                models.Order.route_code == route.route_id,
                models.Order.validated == False
            ).count()
            
            total_count = session.query(models.Order).filter(
                models.Order.route_code == route.route_id
            ).count()
            
            print(f"  {route.route_id} ({route.name}):")
            print(f"    Total: {total_count} orders")
            print(f"    Validated (Route Wise Memo List): {validated_count} orders")
            print(f"    Non-validated (Order List): {non_validated_count} orders")
        
        print("\n✅ Complete orders seeded successfully!")
        print("\n📝 Next steps:")
        print("   1. Validated orders will appear in 'Route Wise Memo List'")
        print("   2. Non-validated orders will appear in 'Order List' for validation")
        print("   3. After validation, orders will move to 'Route Wise Memo List'")
        print("   4. Validated orders can be converted to delivery orders")
        
    except Exception as exc:
        session.rollback()
        print(f"❌ Failed to seed orders: {exc}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed_complete_orders()

