"""Seed core master data for the Swift Distribution Hub demo environment.

Run with:

    cd backend
    python -m db.seed_master_data

The script is idempotent – existing records with the same code are updated
instead of creating duplicates. Adjust or extend the DATA_* payloads as needed
for production imports.
"""

from datetime import date
from sqlalchemy import text

from app.database import SessionLocal, engine
from app import models


def upsert_company(session, payload):
    company = session.query(models.Company).filter(models.Company.code == payload["code"]).first()
    if company:
        for key, value in payload.items():
            setattr(company, key, value)
        return company
    company = models.Company(**payload)
    session.add(company)
    return company


def upsert_depot(session, payload):
    depot = session.query(models.Depot).filter(models.Depot.code == payload["code"]).first()
    if depot:
        for key, value in payload.items():
            setattr(depot, key, value)
        return depot
    depot = models.Depot(**payload)
    session.add(depot)
    return depot


def upsert_customer(session, payload):
    if not payload.get("sold_to_party"):
        payload["sold_to_party"] = payload.get("address")
    customer = session.query(models.Customer).filter(models.Customer.code == payload["code"]).first()
    if customer:
        for key, value in payload.items():
            setattr(customer, key, value)
        return customer
    customer = models.Customer(**payload)
    session.add(customer)
    return customer


def upsert_employee(session, payload):
    employee = session.query(models.Employee).filter(models.Employee.employee_id == payload["employee_id"]).first()
    if employee:
        for key, value in payload.items():
            setattr(employee, key, value)
        return employee
    employee = models.Employee(**payload)
    session.add(employee)
    return employee


def upsert_product(session, payload):
    product = session.query(models.Product).filter(models.Product.code == payload["code"]).first()
    if product:
        for key, value in payload.items():
            setattr(product, key, value)
        return product
    product = models.Product(**payload)
    session.add(product)
    return product


DATA_COMPANIES = [
    {
        "name": "Swift Distribution Pvt Ltd",
        "code": "SWIFT-DISTRO-001",
        "city": "Dhaka",
        "state": "Dhaka",
        "country": "Bangladesh",
        "phone": "+880 9611-000000",
        "email": "info@swiftdistro.com",
    }
]


DATA_DEPOTS = [
    {
        "name": "Kushtia Depot",
        "code": "120",
        "address": "Ishwardi Bypass, Kushtia",
        "city": "Kushtia",
        "state": "Khulna",
        "phone": "+880 9611-120120",
        "email": "kushtia.depot@swiftdistro.com",
        "company_id": 1,
    },
    {
        "name": "Khulna Depot",
        "code": "107",
        "address": "KDA Industrial Area",
        "city": "Khulna",
        "state": "Khulna",
        "phone": "+880 9611-107107",
        "email": "khulna.depot@swiftdistro.com",
        "company_id": 1,
    },
    {
        "name": "Dhaka Central Depot",
        "code": "115",
        "address": "Satarkul Road, Badda",
        "city": "Dhaka",
        "state": "Dhaka",
        "phone": "+880 9611-115115",
        "email": "dhaka.depot@swiftdistro.com",
        "company_id": 1,
    },
]


DATA_CUSTOMERS = [
    {
        "name": "Hospital Dispensary Satkania",
        "code": "CUST-07001",
        "address": "Satkania Upazila Health Complex",
        "ship_to_party": "Upazila Health Complex Warehouse",
        "city": "Chattogram",
        "phone": "+880 1554-700701",
        "priority": models.PriorityEnum.HIGH,
    },
    {
        "name": "Heraj Market Pharmacy",
        "code": "CUST-07002",
        "address": "Heraj Market",
        "ship_to_party": "Heraj Market Loading Bay",
        "city": "Khulna",
        "phone": "+880 1554-700702",
        "priority": models.PriorityEnum.MEDIUM,
    },
    {
        "name": "Rajbari Community Clinic",
        "code": "CUST-20046",
        "address": "Rajbari Sadar",
        "ship_to_party": "Rajbari Clinic Receiving Dock",
        "city": "Rajbari",
        "phone": "+880 1554-200446",
        "priority": models.PriorityEnum.MEDIUM,
    },
]


DATA_EMPLOYEES = [
    {
        "employee_id": "PSO-001",
        "first_name": "Rahim",
        "last_name": "Uddin",
        "email": "rahim.uddin@swiftdistro.com",
        "phone": "+880 1780-100001",
        "department": "Sales",
        "designation": "PSO",
        "depot_id": None,
        "is_active": True,
    },
    {
        "employee_id": "PSO-002",
        "first_name": "Karim",
        "last_name": "Ahmed",
        "email": "karim.ahmed@swiftdistro.com",
        "phone": "+880 1780-100002",
        "department": "Sales",
        "designation": "Senior PSO",
        "depot_id": None,
        "is_active": True,
    },
    {
        "employee_id": "PSO-003",
        "first_name": "Farhana",
        "last_name": "Akter",
        "email": "farhana.akter@swiftdistro.com",
        "phone": "+880 1780-100003",
        "department": "Sales",
        "designation": "Territory Officer",
        "depot_id": None,
        "is_active": True,
    },
]


DATA_PRODUCTS = [
    {
        "name": "Tab Betahistine Dihydrochloride 16 mg",
        "code": "M01000676",
        "sku": "M01000676",
        "old_code": "M01000676",
        "new_code": "N01000676",
        "generic_name": "Betahistine Dihydrochloride",
        "unit_of_measure": "Nos",
        "primary_packaging": "Blister",
        "base_price": 120,
        "free_goods_threshold": 100,
        "free_goods_quantity": 5,
        "is_active": True,
    },
    {
        "name": "Levetiracetam Syrup 100 ml",
        "code": "M03000079",
        "sku": "M03000079",
        "old_code": "M03000079",
        "new_code": "N03000079",
        "generic_name": "Levetiracetam",
        "unit_of_measure": "Phial",
        "primary_packaging": "Bottle",
        "base_price": 220,
        "free_goods_threshold": 100,
        "free_goods_quantity": 5,
        "is_active": True,
    },
    {
        "name": "Omeprazole Capsule 20 mg",
        "code": "M04000123",
        "sku": "M04000123",
        "old_code": "M04000123",
        "new_code": "N04000123",
        "generic_name": "Omeprazole",
        "unit_of_measure": "Bottle",
        "primary_packaging": "Bottle",
        "base_price": 95,
        "free_goods_threshold": 100,
        "free_goods_quantity": 5,
        "is_active": True,
    },
    {
        "name": "IZOVAC GUMBORO-3 (VET) VACCINE 1X1'S",
        "code": "190000132",
        "sku": "190000132",
        "old_code": "190000132",
        "new_code": "190000132",
        "generic_name": "Avian vaccine",
        "unit_of_measure": "IFC",
        "primary_packaging": "Vial",
        "base_price": 0,
        "free_goods_threshold": 100,
        "free_goods_quantity": 5,
        "is_active": True,
    },
    {
        "name": "IZOVAC H120 CLONE 1x1s",
        "code": "190000242",
        "sku": "190000242",
        "old_code": "190000242",
        "new_code": "190000242",
        "generic_name": "Avian vaccine",
        "unit_of_measure": "IFC",
        "primary_packaging": "Vial",
        "base_price": 0,
        "free_goods_threshold": 100,
        "free_goods_quantity": 5,
        "is_active": True,
    },
]


def main():
    models.Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS ship_to_party TEXT"))
        connection.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS sold_to_party TEXT"))
        connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS free_goods_threshold NUMERIC(12,2) DEFAULT 100"))
        connection.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS free_goods_quantity NUMERIC(12,2) DEFAULT 5"))
        connection.execute(text(
            "ALTER TABLE delivery_order_items ADD COLUMN IF NOT EXISTS free_goods_threshold NUMERIC(12,2)"
        ))
        connection.execute(text(
            "ALTER TABLE delivery_order_items ADD COLUMN IF NOT EXISTS free_goods_quantity NUMERIC(12,2)"
        ))
        connection.execute(text(
            "ALTER TABLE delivery_order_items ADD COLUMN IF NOT EXISTS free_goods_awarded NUMERIC(12,2)"
        ))
        connection.execute(text(
            "ALTER TABLE delivery_order_items ADD COLUMN IF NOT EXISTS product_rate NUMERIC(12,2)"
        ))
        connection.execute(text(
            "ALTER TABLE delivery_order_items ADD COLUMN IF NOT EXISTS trade_amount NUMERIC(14,2)"
        ))
        connection.execute(text(
            "ALTER TABLE delivery_order_items ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(14,2)"
        ))
        connection.execute(text(
            "ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS vehicle_id INTEGER"
        ))
        connection.execute(text(
            "ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS driver_id INTEGER"
        ))

    session = SessionLocal()
    try:
        company_record = session.query(models.Company).filter(models.Company.code == DATA_COMPANIES[0]["code"]).first()
        if not company_record:
            company_record = upsert_company(session, DATA_COMPANIES[0])
            session.flush()

        for depot in DATA_DEPOTS:
            depot_payload = {**depot, "company_id": company_record.id}
            upsert_depot(session, depot_payload)

        for customer in DATA_CUSTOMERS:
            upsert_customer(session, customer)

        for employee in DATA_EMPLOYEES:
            upsert_employee(session, employee)

        for product in DATA_PRODUCTS:
            upsert_product(session, product)

        session.commit()
        print("✅ Master data seeded successfully.")
    except Exception as exc:
        session.rollback()
        print("❌ Failed to seed data:", exc)
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
