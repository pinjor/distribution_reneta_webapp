"""Seed drivers for transport management"""

from datetime import date

from app.database import SessionLocal
from app import models


def seed_drivers():
    """Create sample drivers"""
    db = SessionLocal()

    try:
        print("🌱 Seeding drivers...")

        drivers_data = [
            {
                "driver_id": "DRV-001",
                "first_name": "Mohammad",
                "last_name": "Ali",
                "contact": "01712345678",
                "email": "mohammad.ali@renata.test",
                "address": "Mirpur, Dhaka",
                "license_number": "DL-12345",
                "license_expiry": date(2027, 12, 31),
                "status": "Available",
                "is_active": True,
            },
            {
                "driver_id": "DRV-002",
                "first_name": "Abdul",
                "last_name": "Karim",
                "contact": "01712345679",
                "email": "abdul.karim@renata.test",
                "address": "Agrabad, Chattogram",
                "license_number": "DL-12346",
                "license_expiry": date(2027, 11, 30),
                "status": "On Trip",
                "is_active": True,
            },
            {
                "driver_id": "DRV-003",
                "first_name": "Rashid",
                "last_name": "Ahmed",
                "contact": "01712345680",
                "email": "rashid.ahmed@renata.test",
                "address": "Boalia, Rajshahi",
                "license_number": "DL-12347",
                "license_expiry": date(2028, 1, 15),
                "status": "Available",
                "is_active": True,
            },
            {
                "driver_id": "DRV-004",
                "first_name": "Hasan",
                "last_name": "Mia",
                "contact": "01712345681",
                "email": "hasan.mia@renata.test",
                "address": "Sonadanga, Khulna",
                "license_number": "DL-12348",
                "license_expiry": date(2027, 10, 20),
                "status": "On Route",
                "is_active": True,
            },
            {
                "driver_id": "DRV-005",
                "first_name": "Kamal",
                "last_name": "Hossain",
                "contact": "01712345682",
                "email": "kamal.hossain@renata.test",
                "address": "Zindabazar, Sylhet",
                "license_number": "DL-12349",
                "license_expiry": date(2028, 2, 28),
                "status": "Available",
                "is_active": True,
            },
            {
                "driver_id": "DRV-006",
                "first_name": "Farhana",
                "last_name": "Akter",
                "contact": "01712345683",
                "email": "farhana.akter@renata.test",
                "address": "Kazir Dewri, Chattogram",
                "license_number": "DL-12350",
                "license_expiry": date(2028, 6, 12),
                "status": "On Trip",
                "is_active": True,
            },
            {
                "driver_id": "DRV-007",
                "first_name": "Imran",
                "last_name": "Chowdhury",
                "contact": "01712345684",
                "email": "imran.chowdhury@renata.test",
                "address": "Uttara, Dhaka",
                "license_number": "DL-12351",
                "license_expiry": date(2026, 8, 9),
                "status": "Off Duty",
                "is_active": True,
            },
        ]

        created = 0
        updated = 0
        for driver_data in drivers_data:
            existing = db.query(models.Driver).filter(models.Driver.driver_id == driver_data["driver_id"]).first()
            if existing:
                for key, value in driver_data.items():
                    setattr(existing, key, value)
                updated += 1
                continue
            db.add(models.Driver(**driver_data))
            created += 1

        db.commit()
        print(f"✅ Created {created} drivers, updated {updated}")
        print(f"   Total drivers in database: {db.query(models.Driver).count()}")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding drivers: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed_drivers()
