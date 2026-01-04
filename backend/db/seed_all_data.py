"""Master seed script to populate all data for the Swift Distribution Hub.

This script runs all seed scripts in the correct order:
1. Master data (companies, depots, products, customers, employees)
2. Vehicles and drivers
3. Routes
4. Product stock
5. Complete orders
6. Delivery orders
7. Collection/billing data

Run with:
    cd backend
    python -m db.seed_all_data

Or via Docker:
    docker exec -it swift_distro_api python -m db.seed_all_data
"""

import sys
import traceback
import importlib

def run_seed_script(module_name, description):
    """Run a seed script module and handle errors"""
    print(f"\n{'='*60}")
    print(f"🌱 {description}")
    print(f"{'='*60}")
    try:
        # Import the module
        module = importlib.import_module(f"db.{module_name}")
        
        # Try to find and call the seed function
        # Most seed scripts have a main() function
        if hasattr(module, "main"):
            module.main()
            print(f"✅ {description} - Completed")
            return True
        # seed_product_stock_data has seed_product_stock function
        elif module_name == "seed_product_stock_data" and hasattr(module, "seed_product_stock"):
            from app.database import SessionLocal
            db = SessionLocal()
            try:
                module.seed_product_stock(db)
                print(f"✅ {description} - Completed")
                return True
            except Exception as e:
                db.rollback()
                raise e
            finally:
                db.close()
        # Some have a seed function with the module name
        elif hasattr(module, f"seed_{module_name.replace('seed_', '')}"):
            func_name = f"seed_{module_name.replace('seed_', '')}"
            getattr(module, func_name)()
            print(f"✅ {description} - Completed")
            return True
        else:
            print(f"⚠️  Module {module_name} doesn't have a main() function")
            print(f"   Available functions: {[x for x in dir(module) if not x.startswith('_') and callable(getattr(module, x))]}")
            return False
    except Exception as e:
        print(f"❌ Error in {description}: {e}")
        traceback.print_exc()
        return False

def seed_all_data():
    """Run all seed scripts in order"""
    print("\n" + "="*60)
    print("🚀 Starting Complete Database Seeding")
    print("="*60)
    
    seed_scripts = [
        ("seed_master_data", "Seeding Master Data (Companies, Depots, Products, Customers, Employees)"),
        ("seed_vehicles", "Seeding Vehicles"),
        ("seed_drivers", "Seeding Drivers"),
        ("seed_simple_routes", "Creating Basic Routes"),
        ("seed_product_stock_data", "Seeding Product Stock Data"),
        ("seed_complete_orders", "Seeding Complete Orders"),
        ("seed_delivery_orders", "Seeding Delivery Orders"),
        ("seed_collection_data", "Seeding Collection Orders"),
        ("seed_collection_deposits", "Seeding Collection Deposits (Billing)"),
        ("seed_transport_data", "Seeding Transport Trips and Expenses"),
    ]
    
    success_count = 0
    failed_scripts = []
    
    for module_name, description in seed_scripts:
        if run_seed_script(module_name, description):
            success_count += 1
        else:
            failed_scripts.append(description)
    
    print("\n" + "="*60)
    print("📊 Seeding Summary")
    print("="*60)
    print(f"✅ Successfully completed: {success_count}/{len(seed_scripts)}")
    
    if failed_scripts:
        print(f"❌ Failed scripts:")
        for script in failed_scripts:
            print(f"   - {script}")
    
    if success_count == len(seed_scripts):
        print("\n🎉 All data seeded successfully!")
        print("\nYou can now access:")
        print("  - Order Management: Orders, Route Wise Orders, Delivery Orders")
        print("  - Delivery Management: Delivery orders and tracking")
        print("  - Billing: Collection deposits and reports")
        print("  - Transport Management: Vehicles, drivers, trips, expenses")
    else:
        print("\n⚠️  Some scripts failed. Check the errors above.")
    
    return success_count == len(seed_scripts)

if __name__ == "__main__":
    try:
        seed_all_data()
    except KeyboardInterrupt:
        print("\n\n⚠️  Seeding interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        traceback.print_exc()
        sys.exit(1)

