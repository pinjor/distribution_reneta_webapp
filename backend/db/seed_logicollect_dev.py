"""Synthetic LogiCollect seed for disposable databases only.

  DATABASE_URL=postgresql://.../logicollect_dev python db/seed_logicollect_dev.py

Refuses swift_distro_hub. Password for all synthetic users: demo123
"""
from datetime import date

from app.database import SessionLocal, engine
from app.auth import get_password_hash
from app.models import Customer, Depot, Employee, Order, OrderItem, OrderStatusEnum, Product

if (engine.url.database or "") == "swift_distro_hub" or "swift_distro_hub" in str(engine.url):
    raise SystemExit("Refusing to seed swift_distro_hub")

PASSWORD = "demo123"


def upsert_employee(db, **kwargs):
    existing = db.query(Employee).filter(Employee.employee_id == kwargs["employee_id"]).first()
    if existing:
        return existing
    user = Employee(hashed_password=get_password_hash(PASSWORD), is_active=True, is_blocked=False, **kwargs)
    db.add(user)
    db.flush()
    return user


def main():
    db = SessionLocal()
    dhk = db.query(Depot).filter_by(code="DHK").first() or Depot(name="Dhaka", code="DHK")
    db.add(dhk)
    db.flush()
    dsr = upsert_employee(
        db,
        employee_id="D001",
        first_name="Shamim",
        last_name="Sarwar",
        email="dsr.d001@example.com",
        phone="01711111111",
        role="user",
        depot_id=dhk.id,
    )
    upsert_employee(
        db,
        employee_id="D002",
        first_name="Same",
        last_name="Depot",
        email="dsr.d002@example.com",
        phone="01711111113",
        role="user",
        depot_id=dhk.id,
    )
    upsert_employee(
        db,
        employee_id="FIN1",
        first_name="Finance",
        last_name="Owner",
        email="finance.lc@example.com",
        phone="01800000001",
        role="finance",
        depot_id=dhk.id,
    )
    product = db.query(Product).filter_by(code="PARA500").first()
    if not product:
        product = Product(name="Paracetamol 500mg", code="PARA500", sku="PARA500", unit_of_measure="strips")
        db.add(product)
        db.flush()
    customer = db.query(Customer).filter_by(code="CUST001").first()
    if not customer:
        customer = Customer(name="ABC Pharmacy", code="CUST001", phone="01711111112", address="123 MG Road", city="Dhaka")
        db.add(customer)
        db.flush()
    if not db.query(Order).filter_by(memo_number="2500001").first():
        order = Order(
            order_number="SO-2500001",
            memo_number="2500001",
            depot_code="DHK",
            customer_id=str(customer.id),
            customer_name=customer.name,
            customer_code=customer.code,
            pso_id="PSO1",
            pso_name="PSO",
            route_code="R1",
            route_name="Route A - Central Dhaka",
            delivery_date=date.today(),
            status=OrderStatusEnum.APPROVED,
            loaded=True,
            loading_number="L-LC-1",
            assigned_to=dsr.id,
        )
        db.add(order)
        db.flush()
        db.add(
            OrderItem(
                order_id=order.id,
                product_code=product.code,
                product_name=product.name,
                pack_size="strips",
                quantity=100,
                total_quantity=100,
                trade_price=50,
                unit_price=50,
                delivery_date=date.today(),
            )
        )
    db.commit()
    print("Seeded D001/D002/FIN1 password=demo123 memo=2500001 on", engine.url.database)


if __name__ == "__main__":
    main()
