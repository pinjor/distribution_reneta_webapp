"""Create login users and set passwords on seeded employees."""

from app.auth import get_password_hash
from app.database import SessionLocal
from app.models import Employee

DEFAULT_PASSWORD = "admin123"

ADMIN_USERS = [
    {
        "employee_id": "EMP-001",
        "first_name": "Admin",
        "last_name": "User",
        "email": "admin@swiftdistro.com",
        "phone": "+880 1711-000001",
        "department": "IT",
        "designation": "System Administrator",
        "role": "admin",
        "depot_id": 1,
    },
    {
        "employee_id": "EMP-002",
        "first_name": "John",
        "last_name": "Smith",
        "email": "john.smith@swiftdistro.com",
        "phone": "+880 1711-000002",
        "department": "Warehouse",
        "designation": "Manager",
        "role": "manager",
        "depot_id": 1,
    },
    {
        "employee_id": "EMP-003",
        "first_name": "Sarah",
        "last_name": "Johnson",
        "email": "sarah.johnson@swiftdistro.com",
        "phone": "+880 1711-000003",
        "department": "Distribution",
        "designation": "Supervisor",
        "role": "user",
        "depot_id": 1,
    },
]


def main():
    db = SessionLocal()
    try:
        hashed = get_password_hash(DEFAULT_PASSWORD)
        created = 0
        updated = 0

        for user_data in ADMIN_USERS:
            existing = db.query(Employee).filter(Employee.email == user_data["email"]).first()
            if existing:
                if not existing.hashed_password:
                    existing.hashed_password = hashed
                    updated += 1
                continue
            db.add(Employee(**user_data, hashed_password=hashed, is_active=True))
            created += 1

        for employee in db.query(Employee).filter(Employee.hashed_password.is_(None)).all():
            employee.hashed_password = hashed
            updated += 1

        db.commit()
        print(f"✅ Test users ready: {created} created, {updated} passwords set")
        print(f"   Login: admin@swiftdistro.com / {DEFAULT_PASSWORD}")
        print(f"   PSO users can also login with their email / {DEFAULT_PASSWORD}")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding test users: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
