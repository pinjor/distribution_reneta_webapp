"""Seed drivers for transport management"""

from app.database import SessionLocal
from app import models

def seed_drivers():
    """Create sample drivers"""
    db = SessionLocal()
    
    try:
        print("🌱 Seeding drivers...")
        
        # Check if drivers already exist
        existing = db.query(models.Driver).count()
        if existing > 0:
            print(f"Drivers already exist ({existing} drivers). Skipping seed.")
            return
        
        drivers_data = [
            {
                "driver_id": "DRV-001",
                "first_name": "Mohammad",
                "last_name": "Ali",
                "contact": "01712345678",
                "license_number": "DL-12345",
                "license_expiry": "2025-12-31",
            },
            {
                "driver_id": "DRV-002",
                "first_name": "Abdul",
                "last_name": "Karim",
                "contact": "01712345679",
                "license_number": "DL-12346",
                "license_expiry": "2025-11-30",
            },
            {
                "driver_id": "DRV-003",
                "first_name": "Rashid",
                "last_name": "Ahmed",
                "contact": "01712345680",
                "license_number": "DL-12347",
                "license_expiry": "2026-01-15",
            },
            {
                "driver_id": "DRV-004",
                "first_name": "Hasan",
                "last_name": "Mia",
                "contact": "01712345681",
                "license_number": "DL-12348",
                "license_expiry": "2025-10-20",
            },
            {
                "driver_id": "DRV-005",
                "first_name": "Kamal",
                "last_name": "Hossain",
                "contact": "01712345682",
                "license_number": "DL-12349",
                "license_expiry": "2026-02-28",
            },
        ]
        
        for driver_data in drivers_data:
            driver = models.Driver(**driver_data)
            db.add(driver)
        
        db.commit()
        print(f"✅ Successfully created {len(drivers_data)} drivers!")
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

