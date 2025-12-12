"""Seed script for valid delivery orders (non-validated orders with products and routes)"""
from app.database import SessionLocal
from app.models import Order, OrderItem, Product, Customer, Employee, Depot, Route, OrderStatusEnum
from datetime import date, datetime, timedelta
from decimal import Decimal
import random

def seed_delivery_orders():
    db = SessionLocal()
    try:
        # Get existing data
        products = db.query(Product).limit(10).all()
        customers = db.query(Customer).limit(5).all()
        employees = db.query(Employee).limit(3).all()
        depots = db.query(Depot).limit(2).all()
        routes = db.query(Route).filter(Route.status == "Active").limit(4).all()
        
        if not products or not customers or not employees or not depots or not routes:
            print("Need products, customers, employees, depots, and routes to create delivery orders")
            return
        
        # Create sample delivery orders (non-validated)
        delivery_orders = []
        
        # Create 10 valid orders with routes and products
        for i in range(10):
            customer = customers[i % len(customers)]
            employee = employees[i % len(employees)]
            depot = depots[i % len(depots)]
            route = routes[i % len(routes)]
            
            # Select 2-4 random products for each order
            num_products = random.randint(2, 4)
            selected_products = random.sample(products, min(num_products, len(products)))
            
            delivery_date = date.today() + timedelta(days=random.randint(1, 7))
            
            order_data = {
                "depot_code": depot.code if depot.code else f"DEPOT-{depot.id:03d}",
                "depot_name": depot.name,
                "customer_id": str(customer.id),
                "customer_name": customer.name,
                "customer_code": customer.code,
                "pso_id": str(employee.id),
                "pso_name": f"{employee.first_name} {employee.last_name or ''}".strip(),
                "pso_code": employee.employee_id,
                "route_code": route.route_id,
                "route_name": route.name,
                "delivery_date": delivery_date,
                "status": OrderStatusEnum.DRAFT if i % 3 == 0 else OrderStatusEnum.SUBMITTED,
                "validated": False,  # Not validated - will show in Delivery Order list
                "items": []
            }
            
            # Add items for each selected product
            for product in selected_products:
                quantity = random.randint(20, 200)
                free_goods = random.randint(0, 5) if i % 2 == 0 else 0
                trade_price = product.base_price if product.base_price else Decimal('25.00')
                discount_percent = Decimal(str(random.randint(0, 15)))
                unit_price = trade_price * (1 - discount_percent / 100)
                
                order_data["items"].append({
                    "product": product,
                    "quantity": quantity,
                    "free_goods": free_goods,
                    "trade_price": trade_price,
                    "unit_price": unit_price,
                    "discount_percent": discount_percent,
                    "pack_size": f"{random.randint(10, 100)} PCS"
                })
            
            delivery_orders.append(order_data)
        
        created_count = 0
        for order_data in delivery_orders:
            # Create order
            order = Order(
                depot_code=order_data["depot_code"],
                depot_name=order_data["depot_name"],
                customer_id=order_data["customer_id"],
                customer_name=order_data["customer_name"],
                customer_code=order_data["customer_code"],
                pso_id=order_data["pso_id"],
                pso_name=order_data["pso_name"],
                pso_code=order_data["pso_code"],
                route_code=order_data["route_code"],
                route_name=order_data["route_name"],
                delivery_date=order_data["delivery_date"],
                status=order_data["status"],
                validated=order_data["validated"],
                notes=f"Sample delivery order created on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            )
            
            db.add(order)
            db.flush()
            
            # Generate order number in format order-{id}
            order.order_number = f"order-{order.id}"
            
            # Add items (all selected by default)
            for item_data in order_data["items"]:
                total_qty = item_data["quantity"] + item_data["free_goods"]
                item = OrderItem(
                    order_id=order.id,
                    product_code=item_data["product"].code or item_data["product"].sku,
                    product_name=item_data["product"].name,
                    pack_size=item_data.get("pack_size"),
                    quantity=item_data["quantity"],
                    free_goods=item_data["free_goods"],
                    total_quantity=total_qty,
                    trade_price=item_data["trade_price"],
                    unit_price=item_data["unit_price"],
                    discount_percent=item_data["discount_percent"],
                    delivery_date=order_data["delivery_date"],
                    selected=True  # All items selected by default
                )
                db.add(item)
            
            created_count += 1
        
        db.commit()
        print(f"✅ Successfully created {created_count} valid delivery orders with products and routes")
        print(f"   - All orders have routes assigned")
        print(f"   - All orders have products/items")
        print(f"   - All orders are non-validated (will show in Delivery Order list)")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding delivery orders: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_delivery_orders()

