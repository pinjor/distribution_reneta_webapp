#!/usr/bin/env python3
"""
Seed demo vehicle data into the database
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Vehicle
from datetime import datetime

def seed_vehicles():
    db = SessionLocal()
    try:
        # Check if vehicles already exist
        existing = db.query(Vehicle).count()
        if existing > 0:
            print(f"Vehicles already exist ({existing} vehicles). Skipping seed.")
            return
        
        vehicles_data = [
            {
                "vehicle_id": "VH-001",
                "vehicle_type": "Refrigerated Van",
                "registration_number": "KA-01-AB-1234",
                "capacity": 2000.00,
                "depot_id": 1,  # Kushtia Depot
                "vendor": "Cold Chain Logistics",
                "status": "Active",
                "is_active": True,
            },
            {
                "vehicle_id": "VH-002",
                "vehicle_type": "Standard Truck",
                "registration_number": "KA-02-CD-5678",
                "capacity": 5000.00,
                "depot_id": 1,  # Kushtia Depot
                "vendor": "Fast Transport Co",
                "status": "Active",
                "is_active": True,
            },
            {
                "vehicle_id": "VH-003",
                "vehicle_type": "Mini Truck",
                "registration_number": "KA-03-EF-9012",
                "capacity": 1000.00,
                "depot_id": 2,  # Khulna Depot
                "vendor": "Quick Delivery Ltd",
                "status": "Active",
                "is_active": True,
            },
            {
                "vehicle_id": "VH-004",
                "vehicle_type": "Refrigerated Truck",
                "registration_number": "KA-04-GH-3456",
                "capacity": 3000.00,
                "depot_id": 2,  # Khulna Depot
                "vendor": "Cold Chain Logistics",
                "status": "Active",
                "is_active": True,
            },
            {
                "vehicle_id": "VH-005",
                "vehicle_type": "Large Truck",
                "registration_number": "KA-05-IJ-7890",
                "capacity": 8000.00,
                "depot_id": 3,  # Dhaka Central Depot
                "vendor": "Heavy Transport Inc",
                "status": "Active",
                "is_active": True,
            },
            {
                "vehicle_id": "VH-006",
                "vehicle_type": "Delivery Van",
                "registration_number": "KA-06-KL-2468",
                "capacity": 1500.00,
                "depot_id": 3,  # Dhaka Central Depot
                "vendor": "City Delivery Services",
                "status": "Active",
                "is_active": True,
            },
        ]
        
        for vehicle_data in vehicles_data:
            vehicle = Vehicle(**vehicle_data)
            db.add(vehicle)
        
        db.commit()
        print(f"Successfully seeded {len(vehicles_data)} vehicles!")
        
        # Verify
        count = db.query(Vehicle).count()
        print(f"Total vehicles in database: {count}")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding vehicles: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_vehicles()

