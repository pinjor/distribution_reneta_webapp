#!/usr/bin/env python3
"""Seed demo vehicle data using real depots."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Depot, Vehicle


def seed_vehicles():
    db = SessionLocal()
    try:
        depots = db.query(Depot).order_by(Depot.id).all()
        if not depots:
            print("Need depots before seeding vehicles. Run seed_master_data first.")
            return 0

        samples = [
            {
                "vehicle_id": "VH-0001",
                "vehicle_type": "Refrigerated Truck",
                "registration_number": "DHAKA-4045",
                "capacity": 3.5,
                "vendor": "Renata Logistics",
                "status": "Active",
                "is_active": True,
                "fuel_type": "Diesel",
                "fuel_rate": 18.5,
                "fuel_efficiency": 6.2,
                "model": "Tata LPT 1618",
                "year": 2022,
                "maintenance_schedule_km": 80000,
                "last_maintenance_km": 64210,
            },
            {
                "vehicle_id": "VH-0002",
                "vehicle_type": "Mini Truck",
                "registration_number": "CTG-5123",
                "capacity": 2.0,
                "vendor": "North Star Transport",
                "status": "Active",
                "is_active": True,
                "fuel_type": "CNG",
                "fuel_rate": 8.0,
                "fuel_efficiency": 9.4,
                "model": "Isuzu NMR",
                "year": 2021,
                "maintenance_schedule_km": 60000,
                "last_maintenance_km": 41880,
            },
            {
                "vehicle_id": "VH-0003",
                "vehicle_type": "Dry Van",
                "registration_number": "RAJ-9981",
                "capacity": 5.0,
                "vendor": "Renata Logistics",
                "status": "Inactive",
                "is_active": False,
                "fuel_type": "Diesel",
                "fuel_rate": 20.0,
                "fuel_efficiency": 5.1,
                "model": "Eicher Pro 3015",
                "year": 2019,
                "maintenance_schedule_km": 90000,
                "last_maintenance_km": 88120,
            },
            {
                "vehicle_id": "VH-0004",
                "vehicle_type": "Refrigerated Van",
                "registration_number": "KHL-2210",
                "capacity": 1.5,
                "vendor": "Cool Chain Ltd.",
                "status": "Active",
                "is_active": True,
                "fuel_type": "Diesel",
                "fuel_rate": 16.0,
                "fuel_efficiency": 7.8,
                "model": "Hyundai HD65",
                "year": 2023,
                "maintenance_schedule_km": 50000,
                "last_maintenance_km": 22140,
            },
            {
                "vehicle_id": "VH-0005",
                "vehicle_type": "Box Truck",
                "registration_number": "SYL-7744",
                "capacity": 4.0,
                "vendor": "Fast Transport Co",
                "status": "Active",
                "is_active": True,
                "fuel_type": "Diesel",
                "fuel_rate": 17.5,
                "fuel_efficiency": 6.8,
                "model": "Foton Aumark",
                "year": 2020,
                "maintenance_schedule_km": 75000,
                "last_maintenance_km": 59005,
            },
            {
                "vehicle_id": "VH-0006",
                "vehicle_type": "Standard Truck",
                "registration_number": "BAR-3301",
                "capacity": 6.0,
                "vendor": "Heavy Transport Inc",
                "status": "Active",
                "is_active": True,
                "fuel_type": "Diesel",
                "fuel_rate": 22.0,
                "fuel_efficiency": 4.9,
                "model": "Ashok Leyland 1616",
                "year": 2018,
                "maintenance_schedule_km": 100000,
                "last_maintenance_km": 97450,
            },
            {
                "vehicle_id": "VH-0007",
                "vehicle_type": "Mini Truck",
                "registration_number": "KUS-1188",
                "capacity": 1.5,
                "vendor": "City Delivery Services",
                "status": "Active",
                "is_active": True,
                "fuel_type": "Petrol",
                "fuel_rate": 12.5,
                "fuel_efficiency": 10.1,
                "model": "Mahindra Bolero Pickup",
                "year": 2024,
                "maintenance_schedule_km": 40000,
                "last_maintenance_km": 12800,
            },
            {
                "vehicle_id": "VH-0008",
                "vehicle_type": "Refrigerated Truck",
                "registration_number": "RNG-6622",
                "capacity": 3.0,
                "vendor": "Cool Chain Ltd.",
                "status": "Inactive",
                "is_active": False,
                "fuel_type": "Diesel",
                "fuel_rate": 19.0,
                "fuel_efficiency": 5.8,
                "model": "Tata Ultra 1418",
                "year": 2017,
                "maintenance_schedule_km": 85000,
                "last_maintenance_km": 84990,
            },
        ]

        created = 0
        updated = 0
        for index, sample in enumerate(samples):
            depot = depots[index % len(depots)]
            existing = db.query(Vehicle).filter(Vehicle.vehicle_id == sample["vehicle_id"]).first()
            if existing:
                for key, value in sample.items():
                    setattr(existing, key, value)
                existing.depot_id = depot.id
                updated += 1
                continue
            db.add(Vehicle(depot_id=depot.id, **sample))
            created += 1

        db.commit()
        total = db.query(Vehicle).count()
        print(f"Seeded {created} vehicles, updated {updated}. Total in database: {total}")
        return created
    except Exception as e:
        db.rollback()
        print(f"Error seeding vehicles: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_vehicles()
