"""Seed script for depot transfer sample data"""
from app.database import SessionLocal
from app.models import DepotTransfer, DepotTransferItem, Depot, Product, Driver, Vehicle, DepotTransferStatusEnum
from datetime import date, datetime, timedelta
from decimal import Decimal

def seed_depot_transfers():
    db = SessionLocal()
    try:
        # Get existing data
        depots = db.query(Depot).all()
        products = db.query(Product).limit(5).all()
        drivers = db.query(Driver).limit(2).all()
        vehicles = db.query(Vehicle).limit(2).all()
        
        if not depots or len(depots) < 2:
            print("Need at least 2 depots to create transfers")
            return
        
        if not products:
            print("Need at least 1 product to create transfers")
            return
        
        # Delete all existing transfers to start fresh
        print("Deleting existing transfers...")
        db.query(DepotTransferItem).delete()
        db.query(DepotTransfer).delete()
        db.commit()
        existing_numbers = set()
        
        print("Creating fresh sample data...")
        
        # Create sample transfers
        transfers_data = [
            {
                "transfer_number": "DT-2024-001",
                "transfer_date": date.today() - timedelta(days=5),
                "from_depot": depots[0],
                "to_depot": depots[1] if len(depots) > 1 else depots[0],
                "vehicle": vehicles[0] if vehicles else None,
                "driver_name": f"{drivers[0].first_name} {drivers[0].last_name}".strip() if drivers else "Rajesh Kumar",
                "status": DepotTransferStatusEnum.RECEIVED,
                "transfer_note": "Urgent stock replenishment for Chennai depot",
                "remarks": "Delivered successfully",
                "items": [
                    {"product": products[0], "quantity": 100, "batch": "BATCH-001", "expiry": date.today() + timedelta(days=365), "price": 25.50},
                    {"product": products[1] if len(products) > 1 else products[0], "quantity": 50, "batch": "BATCH-002", "expiry": date.today() + timedelta(days=300), "price": 45.00},
                ]
            },
            {
                "transfer_number": "DT-2024-002",
                "transfer_date": date.today() - timedelta(days=3),
                "from_depot": depots[0],
                "to_depot": depots[2] if len(depots) > 2 else depots[1] if len(depots) > 1 else depots[0],
                "vehicle": vehicles[1] if len(vehicles) > 1 else (vehicles[0] if vehicles else None),
                "driver_name": f"{drivers[1].first_name} {drivers[1].last_name}".strip() if len(drivers) > 1 else (f"{drivers[0].first_name} {drivers[0].last_name}".strip() if drivers else "Suresh Reddy"),
                "status": DepotTransferStatusEnum.IN_TRANSIT,
                "transfer_note": "Regular stock transfer to Mumbai depot",
                "remarks": "In transit - ready to receive",
                "items": [
                    {"product": products[0], "quantity": 200, "batch": "BATCH-003", "expiry": date.today() + timedelta(days=400), "price": 25.50},
                    {"product": products[2] if len(products) > 2 else products[0], "quantity": 75, "batch": "BATCH-004", "expiry": date.today() + timedelta(days=350), "price": 35.75},
                ]
            },
            {
                "transfer_number": "DT-2024-003",
                "transfer_date": date.today() - timedelta(days=1),
                "from_depot": depots[1] if len(depots) > 1 else depots[0],
                "to_depot": depots[0],
                "vehicle": vehicles[0] if vehicles else None,
                "driver_name": f"{drivers[0].first_name} {drivers[0].last_name}".strip() if drivers else "Rajesh Kumar",
                "status": DepotTransferStatusEnum.PENDING,
                "transfer_note": "Return transfer from Chennai to Bangalore",
                "remarks": "Pending approval",
                "items": [
                    {"product": products[0], "quantity": 50, "batch": "BATCH-005", "expiry": date.today() + timedelta(days=200), "price": 25.50},
                ]
            },
            {
                "transfer_number": "DT-2024-004",
                "transfer_date": date.today(),
                "from_depot": depots[0],
                "to_depot": depots[1] if len(depots) > 1 else depots[0],
                "vehicle": None,
                "driver_name": None,
                "status": DepotTransferStatusEnum.PENDING,
                "transfer_note": "New transfer request - Ready for approval",
                "remarks": "Click Approve button to process",
                "items": [
                    {"product": products[0], "quantity": 150, "batch": "BATCH-016", "expiry": date.today() + timedelta(days=250), "price": 25.50},
                    {"product": products[1] if len(products) > 1 else products[0], "quantity": 80, "batch": "BATCH-017", "expiry": date.today() + timedelta(days=300), "price": 45.00},
                ]
            },
            {
                "transfer_number": "DT-2024-008",
                "transfer_date": date.today(),
                "from_depot": depots[0],
                "to_depot": depots[1] if len(depots) > 1 else depots[0],
                "vehicle": vehicles[0] if vehicles else None,
                "driver_name": f"{drivers[0].first_name} {drivers[0].last_name}".strip() if drivers else "Rajesh Kumar",
                "status": DepotTransferStatusEnum.PENDING,
                "transfer_note": "New transfer request - Ready for approval",
                "remarks": "Awaiting approval - Click Approve",
                "items": [
                    {"product": products[0], "quantity": 100, "batch": "BATCH-018", "expiry": date.today() + timedelta(days=200), "price": 25.50},
                ]
            },
            {
                "transfer_number": "DT-2024-009",
                "transfer_date": date.today() - timedelta(days=1),
                "from_depot": depots[1] if len(depots) > 1 else depots[0],
                "to_depot": depots[0],
                "vehicle": None,
                "driver_name": None,
                "status": DepotTransferStatusEnum.PENDING,
                "transfer_note": "Pending approval - Ready to approve",
                "remarks": "Pending review",
                "items": [
                    {"product": products[0], "quantity": 75, "batch": "BATCH-019", "expiry": date.today() + timedelta(days=180), "price": 25.50},
                    {"product": products[2] if len(products) > 2 else products[0], "quantity": 50, "batch": "BATCH-020", "expiry": date.today() + timedelta(days=220), "price": 35.75},
                ]
            },
            {
                "transfer_number": "DT-2024-005",
                "transfer_date": date.today() - timedelta(days=2),
                "from_depot": depots[0],
                "to_depot": depots[1] if len(depots) > 1 else depots[0],
                "vehicle": vehicles[0] if vehicles else None,
                "driver_name": f"{drivers[0].first_name} {drivers[0].last_name}".strip() if drivers else "Rajesh Kumar",
                "status": DepotTransferStatusEnum.IN_TRANSIT,
                "transfer_note": "Stock transfer in progress to Chennai depot",
                "remarks": "Vehicle dispatched, expected arrival in 2 hours",
                "items": [
                    {"product": products[0], "quantity": 120, "batch": "BATCH-007", "expiry": date.today() + timedelta(days=320), "price": 25.50},
                    {"product": products[1] if len(products) > 1 else products[0], "quantity": 90, "batch": "BATCH-008", "expiry": date.today() + timedelta(days=280), "price": 45.00},
                    {"product": products[2] if len(products) > 2 else products[0], "quantity": 65, "batch": "BATCH-009", "expiry": date.today() + timedelta(days=310), "price": 35.75},
                ]
            },
            {
                "transfer_number": "DT-2024-006",
                "transfer_date": date.today() - timedelta(days=1),
                "from_depot": depots[1] if len(depots) > 1 else depots[0],
                "to_depot": depots[2] if len(depots) > 2 else (depots[0] if len(depots) > 1 else depots[0]),
                "vehicle": vehicles[1] if len(vehicles) > 1 else (vehicles[0] if vehicles else None),
                "driver_name": f"{drivers[1].first_name} {drivers[1].last_name}".strip() if len(drivers) > 1 else (f"{drivers[0].first_name} {drivers[0].last_name}".strip() if drivers else "Suresh Reddy"),
                "status": DepotTransferStatusEnum.IN_TRANSIT,
                "transfer_note": "Inter-depot transfer from Chennai to Mumbai",
                "remarks": "In transit, ETA: 4 hours",
                "items": [
                    {"product": products[0], "quantity": 180, "batch": "BATCH-010", "expiry": date.today() + timedelta(days=380), "price": 25.50},
                    {"product": products[3] if len(products) > 3 else products[0], "quantity": 100, "batch": "BATCH-011", "expiry": date.today() + timedelta(days=290), "price": 15.25},
                ]
            },
            {
                "transfer_number": "DT-2024-007",
                "transfer_date": date.today(),
                "from_depot": depots[0],
                "to_depot": depots[2] if len(depots) > 2 else (depots[1] if len(depots) > 1 else depots[0]),
                "vehicle": vehicles[0] if vehicles else None,
                "driver_name": f"{drivers[0].first_name} {drivers[0].last_name}".strip() if drivers else "Rajesh Kumar",
                "status": DepotTransferStatusEnum.IN_TRANSIT,
                "transfer_note": "Express delivery to Mumbai Central",
                "remarks": "Priority shipment, tracking enabled",
                "items": [
                    {"product": products[0], "quantity": 250, "batch": "BATCH-012", "expiry": date.today() + timedelta(days=450), "price": 25.50},
                    {"product": products[1] if len(products) > 1 else products[0], "quantity": 150, "batch": "BATCH-013", "expiry": date.today() + timedelta(days=420), "price": 45.00},
                    {"product": products[2] if len(products) > 2 else products[0], "quantity": 95, "batch": "BATCH-014", "expiry": date.today() + timedelta(days=400), "price": 35.75},
                    {"product": products[4] if len(products) > 4 else products[0], "quantity": 70, "batch": "BATCH-015", "expiry": date.today() + timedelta(days=360), "price": 30.00},
                ]
            },
            {
                "transfer_number": "DT-2024-010",
                "transfer_date": date.today(),
                "from_depot": depots[0],
                "to_depot": depots[1] if len(depots) > 1 else depots[0],
                "vehicle": vehicles[0] if vehicles else None,
                "driver_name": f"{drivers[0].first_name} {drivers[0].last_name}".strip() if drivers else "Rajesh Kumar",
                "status": DepotTransferStatusEnum.IN_TRANSIT,
                "transfer_note": "In Transit transfer - Ready to receive",
                "remarks": "Click Receive button to complete",
                "items": [
                    {"product": products[0], "quantity": 200, "batch": "BATCH-021", "expiry": date.today() + timedelta(days=350), "price": 25.50},
                    {"product": products[1] if len(products) > 1 else products[0], "quantity": 120, "batch": "BATCH-022", "expiry": date.today() + timedelta(days=320), "price": 45.00},
                ]
            },
        ]
        
        created_count = 0
        for transfer_data in transfers_data:
            # Skip if transfer already exists
            if transfer_data["transfer_number"] in existing_numbers:
                print(f"Skipping {transfer_data['transfer_number']} - already exists")
                continue
                
            # Skip if depots are the same
            if transfer_data["from_depot"].id == transfer_data["to_depot"].id:
                print(f"Skipping {transfer_data['transfer_number']} - same source and destination depot")
                continue
                
            transfer = DepotTransfer(
                transfer_number=transfer_data["transfer_number"],
                transfer_date=transfer_data["transfer_date"],
                from_depot_id=transfer_data["from_depot"].id,
                to_depot_id=transfer_data["to_depot"].id,
                vehicle_id=transfer_data["vehicle"].id if transfer_data["vehicle"] else None,
                driver_name=transfer_data["driver_name"],
                transfer_note=transfer_data["transfer_note"],
                remarks=transfer_data["remarks"],
                status=transfer_data["status"]
            )
            
            if transfer_data["status"] == DepotTransferStatusEnum.RECEIVED:
                transfer.received_at = datetime.utcnow()
                transfer.received_by = 1  # Assuming employee ID 1 exists
            
            if transfer_data["status"] in [DepotTransferStatusEnum.IN_TRANSIT, DepotTransferStatusEnum.RECEIVED]:
                transfer.approved_at = datetime.utcnow() - timedelta(days=1)
                transfer.approved_by = 1  # Assuming employee ID 1 exists
            
            db.add(transfer)
            db.flush()
            
            # Add items
            for item_data in transfer_data["items"]:
                item = DepotTransferItem(
                    transfer_id=transfer.id,
                    product_id=item_data["product"].id,
                    batch_number=item_data["batch"],
                    expiry_date=item_data["expiry"],
                    quantity=Decimal(str(item_data["quantity"])),
                    unit_price=Decimal(str(item_data["price"]))
                )
                db.add(item)
            
            created_count += 1
        
        db.commit()
        print(f"Successfully created {created_count} new depot transfers with items")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding depot transfers: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_depot_transfers()

