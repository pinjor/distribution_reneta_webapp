"""Simple route seeding script that creates basic routes without complex order data."""

from app.database import SessionLocal
from app import models

def seed_simple_routes():
    """Create basic routes for the system"""
    session = SessionLocal()
    
    try:
        print("🌱 Creating basic routes...")
        
        # Get depot
        depot = session.query(models.Depot).first()
        if not depot:
            print("⚠️  No depot found. Please run seed_master_data.py first")
            return
        
        routes = [
            ("R-1", "Dhaka North Loop", 12, "42 km", "4h"),
            ("R-2", "Chattogram Coastal", 9, "58 km", "5h"),
            ("R-3", "Rajshahi West", 8, "36 km", "3.5h"),
            ("R-4", "Khulna South", 11, "47 km", "4.5h"),
            ("R-5", "Sylhet Hill Route", 7, "31 km", "3h"),
        ]
        created_count = 0

        for route_code, name, stops, distance, avg_time in routes:
            existing = session.query(models.Route).filter(models.Route.route_id == route_code).first()
            if existing:
                existing.name = name
                existing.stops = stops
                existing.distance = distance
                existing.avg_time = avg_time
                existing.status = "Active"
                existing.depot_id = depot.id
                continue
            session.add(
                models.Route(
                    route_id=route_code,
                    name=name,
                    depot_id=depot.id,
                    stops=stops,
                    distance=distance,
                    avg_time=avg_time,
                    status="Active",
                )
            )
            created_count += 1
        
        session.commit()
        print(f"✅ Created {created_count} routes")
        print(f"   Total routes in database: {session.query(models.Route).count()}")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error creating routes: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    seed_simple_routes()

