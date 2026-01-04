"""Seed transport data: trips and expenses"""

from app.database import SessionLocal
from app import models
from datetime import date, datetime, timedelta
from decimal import Decimal
import random

def seed_transport_data():
    """Create sample trips and expenses for transport management"""
    db = SessionLocal()
    
    try:
        print("🌱 Seeding transport data (trips and expenses)...")
        
        # Get existing data
        vehicles = db.query(models.Vehicle).filter(models.Vehicle.status == "Active").limit(5).all()
        if not vehicles:
            vehicles = db.query(models.Vehicle).limit(5).all()
        
        # Check for drivers - they might be in transport_drivers table
        drivers = db.query(models.Driver).limit(5).all()
        if not drivers and hasattr(models, 'TransportDriver'):
            drivers = db.query(models.TransportDriver).limit(5).all()
        
        routes = db.query(models.Route).filter(models.Route.status == "Active").limit(5).all()
        if not routes:
            routes = db.query(models.Route).limit(5).all()
        
        orders = db.query(models.Order).filter(models.Order.validated == True).limit(10).all()
        
        print(f"   Found: {len(vehicles)} vehicles, {len(drivers)} drivers, {len(routes)} routes")
        
        if not vehicles or not drivers or not routes:
            print("⚠️  Missing required data:")
            print(f"   Vehicles: {len(vehicles) if vehicles else 0}")
            print(f"   Drivers: {len(drivers) if drivers else 0}")
            print(f"   Routes: {len(routes) if routes else 0}")
            print("   Please run seed_master_data, seed_vehicles, and seed_simple_routes first")
            return
        
        # Use Trip model
        trip_model = models.Trip
        
        trips_created = 0
        expenses_created = 0
        
        # Create trips for the last 30 days
        today = date.today()
        trip_number_counter = 1
        
        for day_offset in range(30):
            trip_date = today - timedelta(days=day_offset)
            
            # Create 1-3 trips per day
            trips_per_day = random.randint(1, 3)
            
            for _ in range(trips_per_day):
                vehicle = random.choice(vehicles)
                driver = random.choice(drivers)
                route = random.choice(routes)
                order = random.choice(orders) if orders else None
                
                # Generate trip number
                trip_number = f"TRIP-{trip_date.strftime('%Y%m%d')}-{str(trip_number_counter).zfill(3)}"
                trip_number_counter += 1
                
                # Check if trip already exists
                existing = db.query(trip_model).filter(
                    trip_model.trip_number == trip_number
                ).first()
                
                if existing:
                    continue
                
                # Create trip
                trip = trip_model(
                    trip_number=trip_number,
                    vehicle_id=vehicle.id,
                    driver_id=driver.id,
                    route_id=route.id,
                    trip_date=trip_date,
                    delivery_id=order.id if order else None,
                    distance_km=Decimal(str(random.randint(20, 150))),
                    estimated_fuel_cost=Decimal(str(random.randint(500, 3000))),
                    actual_fuel_cost=Decimal(str(random.randint(500, 3000))),
                    status=random.choice(["Completed", "In Progress", "Scheduled"]),
                    start_time=datetime.combine(trip_date, datetime.min.time().replace(hour=8)),
                    end_time=datetime.combine(trip_date, datetime.min.time().replace(hour=17)),
                    notes=f"Trip on route {route.route_id}"
                )
                db.add(trip)
                db.flush()
                
                trips_created += 1
                
                # Create expenses for this trip (1-5 expenses per trip)
                num_expenses = random.randint(1, 5)
                expense_types = ["Fuel", "Toll", "Parking", "Maintenance", "Other"]
                
                for _ in range(num_expenses):
                    expense = models.TransportExpense(
                        trip_id=trip.id,
                        trip_number=trip_number,
                        route_id=route.id,
                        expense_type=random.choice(expense_types),
                        amount=Decimal(str(random.randint(100, 2000))),
                        expense_date=trip_date,
                        description=f"{random.choice(expense_types)} expense for trip {trip_number}"
                    )
                    db.add(expense)
                    expenses_created += 1
        
        db.commit()
        print(f"✅ Created {trips_created} trips")
        print(f"✅ Created {expenses_created} expenses")
        print(f"   Transport data seeded successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding transport data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_transport_data()

