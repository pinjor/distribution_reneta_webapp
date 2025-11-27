#!/usr/bin/env python3
"""
Seed orders using real master data from the database.
This script creates realistic orders using existing customers, products, routes, and employees.
"""

import sys
import os
from datetime import datetime, date, timedelta
from decimal import Decimal
import random

# Add backend directory to path (when running from /app in container)
backend_path = os.getenv("PYTHONPATH", "/app")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Also try adding parent directories
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dirs = [
    os.path.dirname(os.path.dirname(os.path.dirname(current_dir))),  # backend/
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))), "backend"),  # backend/backend
]
for parent_dir in parent_dirs:
    if os.path.exists(parent_dir) and parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import (
    Order, OrderItem, OrderStatusEnum,
    Customer, Product, Route, Employee, Depot
)
from app.database import Base

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://swift_user:swift_pass@postgres:5432/swift_distro_hub")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def generate_order_number(prefix: str = "ORD") -> str:
    """Generate unique order number"""
    stamp = datetime.utcnow()
    return f"{prefix}-{stamp.strftime('%Y%m%d')}-{stamp.strftime('%H%M%S')}{stamp.microsecond // 1000:03d}"

def get_random_date(start_date: date, end_date: date) -> date:
    """Get random date between start and end"""
    time_between = end_date - start_date
    days_between = time_between.days
    random_days = random.randrange(days_between)
    return start_date + timedelta(days=random_days)

def seed_orders():
    """Seed orders using master data"""
    db = SessionLocal()
    
    try:
        print("Starting order seeding from master data...")
        
        # Get master data
        customers = db.query(Customer).filter(Customer.is_active != False).all()
        products = db.query(Product).filter(Product.is_active != False).all()
        routes = db.query(Route).filter(Route.status == 'Active').all()
        employees = db.query(Employee).filter(Employee.is_active != False).all()
        depots = db.query(Depot).filter(Depot.is_active != False).all()
        
        if not customers:
            print("❌ No customers found. Please seed customers first.")
            return
        if not products:
            print("❌ No products found. Please seed products first.")
            return
        if not routes:
            print("❌ No routes found. Please seed routes first.")
            return
        if not employees:
            print("❌ No employees found. Please seed employees first.")
            return
        if not depots:
            print("❌ No depots found. Please seed depots first.")
            return
        
        print(f"Found: {len(customers)} customers, {len(products)} products, {len(routes)} routes, {len(employees)} employees, {len(depots)} depots")
        
        # Get products with stock
        from app.models import ProductItemStock, ProductItemStockDetail
        products_with_stock = []
        for product in products:
            stock = db.query(ProductItemStock).filter(ProductItemStock.product_id == product.id).first()
            if stock:
                products_with_stock.append(product)
        
        if not products_with_stock:
            print("⚠️  No products with stock found. Using all products anyway.")
            products_with_stock = products
        
        print(f"Using {len(products_with_stock)} products with stock")
        
        # Status distribution
        statuses = [
            (OrderStatusEnum.DRAFT, 3),
            (OrderStatusEnum.SUBMITTED, 2),
            (OrderStatusEnum.APPROVED, 8),
            (OrderStatusEnum.PARTIALLY_APPROVED, 2),
        ]
        
        # Date range (last 30 days to future 7 days)
        today = date.today()
        start_date = today - timedelta(days=30)
        end_date = today + timedelta(days=7)
        
        orders_created = 0
        orders_approved = 0
        
        # Create 20-30 orders
        num_orders = random.randint(20, 30)
        
        for i in range(num_orders):
            # Select random customer
            customer = random.choice(customers)
            
            # Select random route
            route = random.choice(routes)
            
            # Select random employee (PSO)
            pso = random.choice(employees)
            
            # Select depot from route or random
            depot = route.depot if route.depot else random.choice(depots)
            
            # Determine status
            status_weights = [s[1] for s in statuses]
            status = random.choices([s[0] for s in statuses], weights=status_weights)[0]
            
            # Generate order
            order = Order(
                order_number=generate_order_number(),
                depot_code=depot.code,
                depot_name=depot.name,
                route_code=route.route_id,
                route_name=route.name,
                customer_id=str(customer.id),
                customer_name=customer.name,
                customer_code=customer.code,
                pso_id=str(pso.id),
                pso_name=f"{pso.first_name} {pso.last_name or ''}".strip(),
                pso_code=pso.employee_id,
                delivery_date=get_random_date(today, end_date),
                status=status,
                notes=f"Order created from master data seed - {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}",
                validated=status in [OrderStatusEnum.APPROVED, OrderStatusEnum.PARTIALLY_APPROVED],
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
            )
            
            db.add(order)
            db.flush()  # Get order ID
            
            # Create 2-5 items per order
            num_items = random.randint(2, 5)
            selected_products = random.sample(products_with_stock, min(num_items, len(products_with_stock)))
            
            for product in selected_products:
                # Get stock details
                stock = db.query(ProductItemStock).filter(ProductItemStock.product_id == product.id).first()
                stock_detail = None
                if stock:
                    stock_detail = db.query(ProductItemStockDetail).filter(
                        ProductItemStockDetail.item_code == stock.id
                    ).first()
                
                # Get product code
                product_code = product.old_code or product.code
                
                # Random quantities
                quantity = random.randint(10, 500)
                free_goods = random.randint(0, int(quantity * 0.1))  # 0-10% free goods
                total_quantity = quantity + free_goods
                
                # Prices
                trade_price = float(product.base_price or 100) * random.uniform(0.8, 1.2)
                unit_price = trade_price
                discount_percent = Decimal(random.uniform(0, 15))  # 0-15% discount
                
                # Batch and stock
                batch_number = stock_detail.batch_no if stock_detail else None
                current_stock = float(stock.stock_qty) if stock and stock.stock_qty else 1000
                
                order_item = OrderItem(
                    order_id=order.id,
                    product_code=product_code,
                    product_name=product.name,
                    pack_size=product.primary_packaging or "Blister",
                    quantity=Decimal(quantity),
                    free_goods=Decimal(free_goods),
                    total_quantity=Decimal(total_quantity),
                    trade_price=Decimal(trade_price),
                    unit_price=Decimal(unit_price),
                    use_code=product_code,
                    discount_percent=discount_percent,
                    batch_number=batch_number,
                    current_stock=Decimal(current_stock),
                    delivery_date=order.delivery_date,
                    selected=True,
                )
                
                db.add(order_item)
            
            orders_created += 1
            if status in [OrderStatusEnum.APPROVED, OrderStatusEnum.PARTIALLY_APPROVED]:
                orders_approved += 1
        
        db.commit()
        
        print(f"\n✅ Seeding completed successfully!")
        print(f"   Created: {orders_created} orders")
        print(f"   Approved: {orders_approved} orders")
        print(f"   Draft: {num_orders - orders_approved} orders")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error seeding orders: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_orders()

