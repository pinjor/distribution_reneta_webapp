"""Seed only a confirmed demo database.

Usage (from backend/):

    DEMO_DATABASE_URL=postgresql://swift_user:swift_password@localhost:55432/swift_distro_demo \\
    DEMO_DATABASE_CONFIRM=swift_distro_demo \\
    python -m db.seed_demo_environment

Does not read or write swift_distro_hub. Refuses to start unless both
environment variables agree on a database name that contains "demo".
"""

from __future__ import annotations

import random
import sys
import traceback

from db.demo_safety import bind_process_to_demo_url, connect_verified_demo


def seed_demo_environment() -> None:
    url = bind_process_to_demo_url()
    engine = connect_verified_demo(url)
    engine.dispose()
    random.seed(20261122)

    from app.database import SessionLocal
    from app.models import ProductItemStock
    from db.seed_consistent_workflows import seed_consistent_workflows
    from db.seed_drivers import seed_drivers
    from db.seed_master_data import main as seed_master
    from db.seed_product_stock_data import seed_product_stock
    from db.seed_settings_master import main as seed_settings
    from db.seed_simple_routes import seed_simple_routes
    from db.seed_test_users import main as seed_users
    from db.seed_transport_data import seed_transport_data
    from db.seed_vehicles import seed_vehicles
    from db.validate_demo_inventory import validate

    print("Seeding master data")
    seed_master()
    print("Seeding vehicles, drivers, routes, settings")
    seed_vehicles()
    seed_drivers()
    seed_simple_routes()
    seed_settings()

    db = SessionLocal()
    try:
        if db.query(ProductItemStock).count() == 0:
            print("Seeding opening product stock")
            seed_product_stock(db)
        else:
            print("Opening product stock already present; not resetting quantities")
    finally:
        db.close()

    print("Seeding consistent workflows")
    db = SessionLocal()
    try:
        seed_consistent_workflows(db)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print("Seeding transport trips and login users")
    seed_transport_data()
    seed_users()

    db = SessionLocal()
    try:
        problems = validate(db)
    finally:
        db.close()
    if problems:
        print("Inventory validation failed:")
        for problem in problems:
            print(f"  - {problem}")
        raise SystemExit(1)
    print("Demo seed finished and inventory checks passed.")
    print("Login: admin@swiftdistro.com / admin123")


if __name__ == "__main__":
    try:
        seed_demo_environment()
    except KeyboardInterrupt:
        print("Interrupted")
        sys.exit(1)
    except SystemExit:
        raise
    except Exception as exc:
        print(f"Demo seed failed: {exc}")
        traceback.print_exc()
        sys.exit(1)
