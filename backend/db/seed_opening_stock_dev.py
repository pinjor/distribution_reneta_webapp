"""Synthetic Opening Stock seed for disposable databases only.

Refuses swift_distro_hub. Shared password: admin123 (matches website demo chips).
Does not insert ProductItemStock, ProductItemStockDetail, or StockLedger rows.
"""
from sqlalchemy.engine.url import make_url

from app.database import SessionLocal, engine
from app.auth import get_password_hash
from app.models import Depot, Employee, Product

if (engine.url.database or "") == "swift_distro_hub" or "swift_distro_hub" in str(engine.url):
    raise SystemExit("Refusing to seed swift_distro_hub")

PASSWORD = "admin123"


def upsert_employee(db, **kwargs):
    existing = db.query(Employee).filter(Employee.email == kwargs["email"]).first()
    if existing:
        return existing
    user = Employee(hashed_password=get_password_hash(PASSWORD), is_active=True, is_blocked=False, **kwargs)
    db.add(user)
    db.flush()
    return user


def main():
    print("Seeding", make_url(str(engine.url)).database)
    db = SessionLocal()
    try:
        dhk = db.query(Depot).filter_by(code="DHK").first() or Depot(name="Dhaka", code="DHK", city="Dhaka")
        ktn = db.query(Depot).filter_by(code="KHL").first() or Depot(name="Khulna", code="KHL", city="Khulna")
        db.add_all([dhk, ktn])
        db.flush()
        product = db.query(Product).filter_by(code="OS-PARA500").first()
        if not product:
            product = Product(
                name="Paracetamol 500mg",
                code="OS-PARA500",
                sku="OS-PARA500",
                unit_of_measure="PCS",
                is_active=True,
            )
            db.add(product)
            db.flush()
        upsert_employee(
            db,
            employee_id="ADM-OS",
            first_name="Admin",
            last_name="User",
            email="admin@swiftdistro.com",
            role="admin",
        )
        upsert_employee(
            db,
            employee_id="ADM-OS2",
            first_name="Second",
            last_name="Admin",
            email="os-admin2@test.com",
            role="admin",
        )
        upsert_employee(
            db,
            employee_id="MGR-OS",
            first_name="John",
            last_name="Smith",
            email="john.smith@swiftdistro.com",
            role="manager",
            depot_id=dhk.id,
        )
        upsert_employee(
            db,
            employee_id="USR-OS",
            first_name="Sarah",
            last_name="Johnson",
            email="sarah.johnson@swiftdistro.com",
            role="user",
            depot_id=dhk.id,
        )
        upsert_employee(
            db,
            employee_id="USR-OS2",
            first_name="Rahim",
            last_name="Uddin",
            email="rahim.uddin@swiftdistro.com",
            role="user",
            depot_id=dhk.id,
        )
        upsert_employee(
            db,
            employee_id="USR-OS3",
            first_name="Karim",
            last_name="Ahmed",
            email="karim.ahmed@swiftdistro.com",
            role="user",
            depot_id=dhk.id,
        )
        upsert_employee(
            db,
            employee_id="USR-OS4",
            first_name="Farhana",
            last_name="Akter",
            email="farhana.akter@swiftdistro.com",
            role="user",
            depot_id=dhk.id,
        )
        db.commit()
        print("Seed complete: depots DHK/KHL, product OS-PARA500, admin/manager/user")
    finally:
        db.close()


if __name__ == "__main__":
    main()
