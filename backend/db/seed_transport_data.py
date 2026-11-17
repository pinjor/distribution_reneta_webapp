"""Seed transport data: trips and expenses"""

from datetime import date, datetime, timedelta, time
from decimal import Decimal

from app.database import SessionLocal
from app import models


TRIP_SPECS = [
    # offset_days (negative = past), status, vehicle_idx, driver_idx, route_idx, distance, expenses
    (-12, "Completed", 0, 0, 0, 48, [("fuel", 1450), ("toll", 180), ("other", 90)]),
    (-11, "Completed", 1, 2, 1, 62, [("fuel", 1680), ("maintenance", 420)]),
    (-9, "Completed", 3, 4, 2, 36, [("fuel", 980), ("toll", 120)]),
    (-8, "Completed", 4, 0, 3, 51, [("fuel", 1520), ("repair", 750), ("other", 60)]),
    (-7, "Completed", 5, 2, 4, 29, [("fuel", 870)]),
    (-5, "Completed", 0, 4, 0, 44, [("fuel", 1310), ("toll", 150), ("other", 80)]),
    (-4, "Completed", 1, 5, 1, 71, [("fuel", 1890), ("toll", 240), ("maintenance", 300)]),
    (-3, "Completed", 3, 0, 2, 33, [("fuel", 910), ("other", 55)]),
    (-2, "In Progress", 4, 1, 3, 46, [("fuel", 1240), ("toll", 160)]),
    (-1, "In Progress", 5, 5, 4, 38, [("fuel", 1020)]),
    (0, "Scheduled", 0, 2, 0, 41, []),
    (1, "Scheduled", 1, 4, 1, 55, []),
]


def seed_transport_data():
    """Create sample trips and expenses for transport management"""
    db = SessionLocal()

    try:
        print("🌱 Seeding transport data (trips and expenses)...")

        vehicles = db.query(models.Vehicle).order_by(models.Vehicle.id).all()
        drivers = db.query(models.Driver).order_by(models.Driver.id).all()
        routes = db.query(models.Route).order_by(models.Route.id).all()
        orders = db.query(models.Order).limit(10).all()

        print(f"   Found: {len(vehicles)} vehicles, {len(drivers)} drivers, {len(routes)} routes")

        if not vehicles or not drivers or not routes:
            print("⚠️  Missing required data. Run seed_vehicles, seed_drivers, and seed_simple_routes first")
            return

        trips_created = 0
        expenses_created = 0
        today = date.today()

        for index, (day_offset, status, vehicle_idx, driver_idx, route_idx, distance, expenses) in enumerate(TRIP_SPECS, start=1):
            trip_date = today + timedelta(days=day_offset)
            trip_number = f"TRIP-{trip_date.strftime('%Y%m%d')}-{str(index).zfill(3)}"
            existing = db.query(models.Trip).filter(models.Trip.trip_number == trip_number).first()
            if existing:
                continue

            vehicle = vehicles[vehicle_idx % len(vehicles)]
            driver = drivers[driver_idx % len(drivers)]
            route = routes[route_idx % len(routes)]
            order = orders[index % len(orders)] if orders else None

            start_dt = datetime.combine(trip_date, time(8, 0)) if status != "Scheduled" else None
            end_dt = datetime.combine(trip_date, time(16, 30)) if status == "Completed" else None
            fuel_cost = Decimal(str(round(distance * float(vehicle.fuel_rate or 18), 2)))

            trip = models.Trip(
                trip_number=trip_number,
                vehicle_id=vehicle.id,
                driver_id=driver.id,
                route_id=route.id,
                trip_date=trip_date,
                delivery_id=order.id if order else None,
                distance_km=Decimal(str(distance)),
                estimated_fuel_cost=fuel_cost,
                actual_fuel_cost=fuel_cost if status == "Completed" else None,
                status=status,
                start_time=start_dt,
                end_time=end_dt,
                notes=f"{status} run on {route.name or route.route_id}",
            )
            db.add(trip)
            db.flush()
            trips_created += 1

            for expense_type, amount in expenses:
                db.add(
                    models.TransportExpense(
                        trip_id=trip.id,
                        trip_number=trip_number,
                        route_id=route.id,
                        expense_type=expense_type,
                        amount=Decimal(str(amount)),
                        expense_date=trip_date,
                        description=f"{expense_type.capitalize()} for {trip_number}",
                        is_auto_calculated=expense_type == "fuel",
                    )
                )
                expenses_created += 1

        db.commit()
        print(f"✅ Created {trips_created} trips")
        print(f"✅ Created {expenses_created} expenses")
        print("   Transport data seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding transport data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed_transport_data()
