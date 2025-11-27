"""Seed demo data for routes and orders for route-wise order management testing.

Run with:
    cd backend
    python -m db.seed_route_demo_data
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import text

from app.database import SessionLocal, engine
from app import models

def seed_routes(session):
    """Create or update demo routes"""
    routes_data = [
        {"route_id": "R-1", "name": "Route R-1", "depot_id": 1, "stops": 12, "distance": "45 km", "avg_time": "4h 30m", "status": "Active"},
        {"route_id": "R-2", "name": "Route R-2", "depot_id": 1, "stops": 15, "distance": "52 km", "avg_time": "5h 15m", "status": "Active"},
        {"route_id": "R-3", "name": "Route R-3", "depot_id": 1, "stops": 8, "distance": "28 km", "avg_time": "3h", "status": "Active"},
        {"route_id": "R-4", "name": "Route R-4", "depot_id": 1, "stops": 10, "distance": "38 km", "avg_time": "4h", "status": "Active"},
        {"route_id": "R-5", "name": "Route R-5", "depot_id": 1, "stops": 6, "distance": "22 km", "avg_time": "2h 30m", "status": "Active"},
    ]
    
    for route_data in routes_data:
        route = session.query(models.Route).filter(models.Route.route_id == route_data["route_id"]).first()
        if route:
            for key, value in route_data.items():
                setattr(route, key, value)
        else:
            route = models.Route(**route_data)
            session.add(route)
    
    session.flush()
    return session.query(models.Route).filter(models.Route.route_id.in_(["R-1", "R-2", "R-3", "R-4", "R-5"])).all()

def seed_orders(session, routes):
    """Create demo orders for each route"""
    # Get customers and products
    customers = session.query(models.Customer).limit(5).all()
    products = session.query(models.Product).limit(5).all()
    employees = session.query(models.Employee).limit(3).all()
    
    if not customers or not products or not employees:
        print("⚠️  Missing required data: customers, products, or employees")
        print("   Please run seed_master_data.py first")
        return
    
    delivery_date = date.today() + timedelta(days=7)
    
    # Route R-1: 50 orders, all validated, 50 pending print, 50 printed, 50 loaded
    route_r1 = next((r for r in routes if r.route_id == "R-1"), None)
    if route_r1:
        for i in range(50):
            customer = customers[i % len(customers)]
            employee = employees[i % len(employees)]
            
            order = models.Order(
                order_number=f"ORD-R1-{i+1:03d}",
                depot_code="120",
                depot_name="Kushtia Depot",
                customer_id=str(customer.id),
                customer_name=customer.name,
                customer_code=customer.code,
                pso_id=str(employee.id),
                pso_name=f"{employee.first_name} {employee.last_name or ''}".strip(),
                pso_code=employee.employee_id,
                route_code=route_r1.route_id,
                route_name=route_r1.name,
                delivery_date=delivery_date,
                status=models.OrderStatusEnum.APPROVED,
                validated=True,
                printed=i < 50,  # All printed
                printed_at=datetime.utcnow() if i < 50 else None,
                loaded=i < 50,  # All loaded
                loaded_at=datetime.utcnow() if i < 50 else None,
            )
            session.add(order)
            session.flush()
            
            # Add items
            product = products[i % len(products)]
            order.items.append(models.OrderItem(
                old_code=product.old_code or product.code,
                new_code=product.new_code,
                product_name=product.name,
                pack_size=product.primary_packaging or product.unit_of_measure or "Nos",
                quantity=100 + (i * 10),
                free_goods=5 + (i % 3),
                total_quantity=105 + (i * 10) + (i % 3),
                trade_price=product.base_price or Decimal("100"),
                unit_price=product.base_price or Decimal("100"),
                use_code=product.old_code or product.code,
                discount_percent=Decimal(str(i % 10)),
                delivery_date=delivery_date,
                selected=True,
            ))
    
    # Route R-2: 40 orders, 10 validated, rest pending
    route_r2 = next((r for r in routes if r.route_id == "R-2"), None)
    if route_r2:
        for i in range(40):
            customer = customers[i % len(customers)]
            employee = employees[i % len(employees)]
            
            order = models.Order(
                order_number=f"ORD-R2-{i+1:03d}",
                depot_code="120",
                depot_name="Kushtia Depot",
                customer_id=str(customer.id),
                customer_name=customer.name,
                customer_code=customer.code,
                pso_id=str(employee.id),
                pso_name=f"{employee.first_name} {employee.last_name or ''}".strip(),
                pso_code=employee.employee_id,
                route_code=route_r2.route_id,
                route_name=route_r2.name,
                delivery_date=delivery_date,
                status=models.OrderStatusEnum.APPROVED,
                validated=i < 10,  # First 10 validated
                printed=False,
                loaded=False,
            )
            session.add(order)
            session.flush()
            
            product = products[i % len(products)]
            order.items.append(models.OrderItem(
                old_code=product.old_code or product.code,
                new_code=product.new_code,
                product_name=product.name,
                pack_size=product.primary_packaging or product.unit_of_measure or "Nos",
                quantity=80 + (i * 5),
                free_goods=4 + (i % 2),
                total_quantity=84 + (i * 5) + (i % 2),
                trade_price=product.base_price or Decimal("100"),
                unit_price=product.base_price or Decimal("100"),
                use_code=product.old_code or product.code,
                discount_percent=Decimal(str((i % 5) * 2)),
                delivery_date=delivery_date,
                selected=True,
            ))
    
    # Route R-3: 30 orders, all validated, none printed
    route_r3 = next((r for r in routes if r.route_id == "R-3"), None)
    if route_r3:
        for i in range(30):
            customer = customers[i % len(customers)]
            employee = employees[i % len(employees)]
            
            order = models.Order(
                order_number=f"ORD-R3-{i+1:03d}",
                depot_code="120",
                depot_name="Kushtia Depot",
                customer_id=str(customer.id),
                customer_name=customer.name,
                customer_code=customer.code,
                pso_id=str(employee.id),
                pso_name=f"{employee.first_name} {employee.last_name or ''}".strip(),
                pso_code=employee.employee_id,
                route_code=route_r3.route_id,
                route_name=route_r3.name,
                delivery_date=delivery_date,
                status=models.OrderStatusEnum.APPROVED,
                validated=True,
                printed=False,
                loaded=False,
            )
            session.add(order)
            session.flush()
            
            product = products[i % len(products)]
            order.items.append(models.OrderItem(
                old_code=product.old_code or product.code,
                new_code=product.new_code,
                product_name=product.name,
                pack_size=product.primary_packaging or product.unit_of_measure or "Nos",
                quantity=60 + (i * 3),
                free_goods=3,
                total_quantity=63 + (i * 3),
                trade_price=product.base_price or Decimal("100"),
                unit_price=product.base_price or Decimal("100"),
                use_code=product.old_code or product.code,
                discount_percent=Decimal("0"),
                delivery_date=delivery_date,
                selected=True,
            ))
    
    # Route R-4: 100 orders, mixed statuses
    route_r4 = next((r for r in routes if r.route_id == "R-4"), None)
    if route_r4:
        for i in range(100):
            customer = customers[i % len(customers)]
            employee = employees[i % len(employees)]
            
            order = models.Order(
                order_number=f"ORD-R4-{i+1:03d}",
                depot_code="120",
                depot_name="Kushtia Depot",
                customer_id=str(customer.id),
                customer_name=customer.name,
                customer_code=customer.code,
                pso_id=str(employee.id),
                pso_name=f"{employee.first_name} {employee.last_name or ''}".strip(),
                pso_code=employee.employee_id,
                route_code=route_r4.route_id,
                route_name=route_r4.name,
                delivery_date=delivery_date,
                status=models.OrderStatusEnum.APPROVED,
                validated=i < 50,  # Half validated
                printed=i < 25,  # Quarter printed
                printed_at=datetime.utcnow() if i < 25 else None,
                loaded=i < 10,  # 10 loaded
                loaded_at=datetime.utcnow() if i < 10 else None,
            )
            session.add(order)
            session.flush()
            
            product = products[i % len(products)]
            order.items.append(models.OrderItem(
                old_code=product.old_code or product.code,
                new_code=product.new_code,
                product_name=product.name,
                pack_size=product.primary_packaging or product.unit_of_measure or "Nos",
                quantity=50 + (i % 20),
                free_goods=2 + (i % 3),
                total_quantity=52 + (i % 20) + (2 + (i % 3)),
                trade_price=product.base_price or Decimal("100"),
                unit_price=product.base_price or Decimal("100"),
                use_code=product.old_code or product.code,
                discount_percent=Decimal(str(i % 15)),
                delivery_date=delivery_date,
                selected=True,
            ))
    
    # Route R-5: 20 orders, none validated
    route_r5 = next((r for r in routes if r.route_id == "R-5"), None)
    if route_r5:
        for i in range(20):
            customer = customers[i % len(customers)]
            employee = employees[i % len(employees)]
            
            order = models.Order(
                order_number=f"ORD-R5-{i+1:03d}",
                depot_code="120",
                depot_name="Kushtia Depot",
                customer_id=str(customer.id),
                customer_name=customer.name,
                customer_code=customer.code,
                pso_id=str(employee.id),
                pso_name=f"{employee.first_name} {employee.last_name or ''}".strip(),
                pso_code=employee.employee_id,
                route_code=route_r5.route_id,
                route_name=route_r5.name,
                delivery_date=delivery_date,
                status=models.OrderStatusEnum.APPROVED,
                validated=False,
                printed=False,
                loaded=False,
            )
            session.add(order)
            session.flush()
            
            product = products[i % len(products)]
            order.items.append(models.OrderItem(
                old_code=product.old_code or product.code,
                new_code=product.new_code,
                product_name=product.name,
                pack_size=product.primary_packaging or product.unit_of_measure or "Nos",
                quantity=40 + (i * 2),
                free_goods=2,
                total_quantity=42 + (i * 2),
                trade_price=product.base_price or Decimal("100"),
                unit_price=product.base_price or Decimal("100"),
                use_code=product.old_code or product.code,
                discount_percent=Decimal("0"),
                delivery_date=delivery_date,
                selected=True,
            ))

def main():
    session = SessionLocal()
    try:
        print("🌱 Seeding route demo data...")
        
        # Create routes
        routes = seed_routes(session)
        print(f"✅ Created/updated {len(routes)} routes")
        
        # Create orders
        seed_orders(session, routes)
        print("✅ Created demo orders for all routes")
        
        session.commit()
        
        # Print summary
        print("\n📊 Summary by Route:")
        for route in routes:
            orders = session.query(models.Order).filter(
                models.Order.route_code == route.route_id,
                models.Order.status.in_([models.OrderStatusEnum.APPROVED, models.OrderStatusEnum.PARTIALLY_APPROVED])
            ).all()
            
            validated = sum(1 for o in orders if o.validated)
            printed = sum(1 for o in orders if o.printed)
            loaded = sum(1 for o in orders if o.loaded)
            
            print(f"  {route.route_id} ({route.name}): {len(orders)} orders, {validated} validated, {printed} printed, {loaded} loaded")
        
        print("\n✅ Route demo data seeded successfully!")
        
    except Exception as exc:
        session.rollback()
        print(f"❌ Failed to seed data: {exc}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    main()

