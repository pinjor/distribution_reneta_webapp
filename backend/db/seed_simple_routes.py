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
        
        # Create routes if they don't exist
        route_codes = ["R-1", "R-2", "R-3", "R-4", "R-5"]
        created_count = 0
        
        for route_code in route_codes:
            existing = session.query(models.Route).filter(models.Route.route_id == route_code).first()
            if not existing:
                route = models.Route(
                    route_id=route_code,
                    name=f"Route {route_code}",
                    depot_id=depot.id,
                    stops=10,
                    distance="40 km",
                    avg_time="4h",
                    status="Active"
                )
                session.add(route)
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

