"""Seed script to add sample collection deposit and transaction data"""
from app.database import SessionLocal, engine
from app.models import CollectionDeposit, CollectionTransaction, Employee, Order
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import text

def seed_collection_data():
    """Add sample collection deposits and transactions"""
    db = SessionLocal()
    
    try:
        # Get some employees to use as collection persons
        employees = db.query(Employee).limit(5).all()
        if not employees:
            print("No employees found. Please create employees first.")
            return
        
        collection_person = employees[0]
        print(f"Using employee: {collection_person.first_name} {collection_person.last_name or ''} (ID: {collection_person.id})")
        
        # Get some orders
        orders = db.query(Order).limit(10).all()
        if not orders:
            print("No orders found. Please create orders first.")
            return
        
        print(f"Found {len(orders)} orders to work with")
        
        # Generate deposit dates for the last 7 days + today
        today = date.today()
        deposits_created = 0
        transactions_created = 0
        
        # Create multiple deposits for TODAY with remaining amounts for testing
        today_deposits_data = [
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0001",
                "person_idx": 0,
                "method": "bKash",
                "total": Decimal("75000"),
                "deposited": Decimal("45000"),
                "remaining": Decimal("30000"),
                "txn": f"BKASH{today.strftime('%Y%m%d')}001",
                "approved": True
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0002",
                "person_idx": 1 if len(employees) > 1 else 0,
                "method": "Nagad",
                "total": Decimal("60000"),
                "deposited": Decimal("40000"),
                "remaining": Decimal("20000"),
                "txn": f"NAGAD{today.strftime('%Y%m%d')}002",
                "approved": True
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0003",
                "person_idx": 0,
                "method": "BRAC",
                "total": Decimal("85000"),
                "deposited": Decimal("50000"),
                "remaining": Decimal("35000"),
                "txn": f"BRAC{today.strftime('%Y%m%d')}003",
                "approved": True
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0004",
                "person_idx": 2 if len(employees) > 2 else 0,
                "method": "bKash",
                "total": Decimal("55000"),
                "deposited": Decimal("30000"),
                "remaining": Decimal("25000"),
                "txn": f"BKASH{today.strftime('%Y%m%d')}004",
                "approved": True
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0005",
                "person_idx": 1 if len(employees) > 1 else 0,
                "method": "Nagad",
                "total": Decimal("90000"),
                "deposited": Decimal("55000"),
                "remaining": Decimal("35000"),
                "txn": f"NAGAD{today.strftime('%Y%m%d')}005",
                "approved": True
            },
            # Pending deposits for approval (bKash)
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0006",
                "person_idx": 0,
                "method": "bKash",
                "total": Decimal("65000"),
                "deposited": Decimal("40000"),
                "remaining": Decimal("25000"),
                "txn": f"BKASH{today.strftime('%Y%m%d')}006",
                "approved": False
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0007",
                "person_idx": 1 if len(employees) > 1 else 0,
                "method": "bKash",
                "total": Decimal("72000"),
                "deposited": Decimal("45000"),
                "remaining": Decimal("27000"),
                "txn": f"BKASH{today.strftime('%Y%m%d')}007",
                "approved": False
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0008",
                "person_idx": 2 if len(employees) > 2 else 0,
                "method": "bKash",
                "total": Decimal("58000"),
                "deposited": Decimal("35000"),
                "remaining": Decimal("23000"),
                "txn": f"BKASH{today.strftime('%Y%m%d')}008",
                "approved": False
            },
            # Pending deposits for approval (Nagad)
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0009",
                "person_idx": 0,
                "method": "Nagad",
                "total": Decimal("68000"),
                "deposited": Decimal("42000"),
                "remaining": Decimal("26000"),
                "txn": f"NAGAD{today.strftime('%Y%m%d')}009",
                "approved": False
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0010",
                "person_idx": 1 if len(employees) > 1 else 0,
                "method": "Nagad",
                "total": Decimal("75000"),
                "deposited": Decimal("48000"),
                "remaining": Decimal("27000"),
                "txn": f"NAGAD{today.strftime('%Y%m%d')}010",
                "approved": False
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0011",
                "person_idx": 2 if len(employees) > 2 else 0,
                "method": "Nagad",
                "total": Decimal("62000"),
                "deposited": Decimal("38000"),
                "remaining": Decimal("24000"),
                "txn": f"NAGAD{today.strftime('%Y%m%d')}011",
                "approved": False
            },
            # Deposits with remaining cash already received (partially or fully)
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0012",
                "person_idx": 0,
                "method": "bKash",
                "total": Decimal("80000"),
                "deposited": Decimal("50000"),
                "remaining": Decimal("10000"),  # 20,000 already received
                "txn": f"BKASH{today.strftime('%Y%m%d')}012",
                "approved": True,
                "cash_received_note": "[Remaining Cash Received] 2025-11-30 10:30:00: 20000 BDT received by employee ID 1. Notes: Partial cash received."
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0013",
                "person_idx": 1 if len(employees) > 1 else 0,
                "method": "Nagad",
                "total": Decimal("70000"),
                "deposited": Decimal("45000"),
                "remaining": Decimal("0"),  # Fully received
                "txn": f"NAGAD{today.strftime('%Y%m%d')}013",
                "approved": True,
                "cash_received_note": "[Remaining Cash Received] 2025-11-30 11:15:00: 25000 BDT received by employee ID 1. Notes: Full remaining cash received at depot."
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0014",
                "person_idx": 2 if len(employees) > 2 else 0,
                "method": "bKash",
                "total": Decimal("65000"),
                "deposited": Decimal("40000"),
                "remaining": Decimal("5000"),  # 20,000 already received
                "txn": f"BKASH{today.strftime('%Y%m%d')}014",
                "approved": True,
                "cash_received_note": "[Remaining Cash Received] 2025-11-30 09:45:00: 20000 BDT received by employee ID 1. Notes: Cash collected from collection person."
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0015",
                "person_idx": 0,
                "method": "Nagad",
                "total": Decimal("90000"),
                "deposited": Decimal("55000"),
                "remaining": Decimal("0"),  # Fully received
                "txn": f"NAGAD{today.strftime('%Y%m%d')}015",
                "approved": True,
                "cash_received_note": "[Remaining Cash Received] 2025-11-30 12:00:00: 35000 BDT received by employee ID 1. Notes: Complete remaining amount received."
            },
            {
                "number": f"DEP-{today.strftime('%Y%m%d')}-0016",
                "person_idx": 1 if len(employees) > 1 else 0,
                "method": "bKash",
                "total": Decimal("75000"),
                "deposited": Decimal("48000"),
                "remaining": Decimal("12000"),  # 15,000 already received
                "txn": f"BKASH{today.strftime('%Y%m%d')}016",
                "approved": True,
                "cash_received_note": "[Remaining Cash Received] 2025-11-30 10:00:00: 15000 BDT received by employee ID 1."
            },
        ]
        
        for deposit_data in today_deposits_data:
            existing = db.query(CollectionDeposit).filter(
                CollectionDeposit.deposit_number == deposit_data["number"]
            ).first()
            
            if existing:
                print(f"Deposit {deposit_data['number']} already exists, skipping...")
                continue
            
            person = employees[deposit_data["person_idx"]]
            
            # Build notes with cash received info if available
            base_notes = f"Collection deposit - {deposit_data['deposited']} BDT deposited via {deposit_data['method']}"
            if deposit_data["remaining"] > 0:
                base_notes += f", {deposit_data['remaining']} BDT remaining to be collected at depot"
            else:
                base_notes += ", remaining cash fully received at depot"
            
            if deposit_data.get("cash_received_note"):
                base_notes += f"\n{deposit_data['cash_received_note']}"
            
            today_deposit = CollectionDeposit(
                deposit_number=deposit_data["number"],
                deposit_date=today,
                collection_person_id=person.id,
                deposit_method=deposit_data["method"],
                deposit_amount=deposit_data["deposited"],
                transaction_number=deposit_data["txn"],
                attachment_url=f"/attachments/deposit_{deposit_data['number']}.jpg",
                remaining_amount=deposit_data["remaining"],
                total_collection_amount=deposit_data["total"],
                notes=base_notes,
                approved=deposit_data.get("approved", True),
                approved_by=person.id if deposit_data.get("approved", True) else None,
                approved_at=datetime.utcnow() if deposit_data.get("approved", True) else None
            )
            
            db.add(today_deposit)
            db.flush()
            deposits_created += 1
            print(f"Created deposit: {deposit_data['number']} - Person: {person.first_name} {person.last_name or ''} - Remaining: {deposit_data['remaining']} BDT")
        
        for day_offset in range(7, 0, -1):  # Last 7 days
            deposit_date = today - timedelta(days=day_offset)
            
            # Create a deposit for this day
            deposit_number = f"DEP-{deposit_date.strftime('%Y%m%d')}-{day_offset:04d}"
            
            # Check if deposit already exists
            existing = db.query(CollectionDeposit).filter(
                CollectionDeposit.deposit_number == deposit_number
            ).first()
            
            if existing:
                print(f"Deposit {deposit_number} already exists, skipping...")
                continue
            
            # Calculate amounts
            total_collection = Decimal("50000") + (Decimal(str(day_offset)) * Decimal("5000"))
            deposit_amount = Decimal("30000") + (Decimal(str(day_offset)) * Decimal("2000"))
            remaining_amount = total_collection - deposit_amount
            
            # Choose deposit method
            methods = ["BRAC", "bKash", "Nagad"]
            deposit_method = methods[day_offset % 3]
            
            deposit = CollectionDeposit(
                deposit_number=deposit_number,
                deposit_date=deposit_date,
                collection_person_id=collection_person.id,
                deposit_method=deposit_method,
                deposit_amount=deposit_amount,
                transaction_number=f"TXN{day_offset:04d}{deposit_date.strftime('%Y%m%d')}",
                attachment_url=f"/attachments/deposit_{deposit_number}.pdf",
                remaining_amount=remaining_amount,
                total_collection_amount=total_collection,
                notes=f"Daily collection deposit for {deposit_date.strftime('%B %d, %Y')}",
                approved=(day_offset <= 3),  # Approve deposits from last 3 days
                approved_by=collection_person.id if day_offset <= 3 else None,
                approved_at=datetime.utcnow() if day_offset <= 3 else None
            )
            
            db.add(deposit)
            db.flush()  # Get the deposit ID
            
            deposits_created += 1
            
            # Create transactions for some orders on this day
            orders_for_day = orders[:min(3, len(orders))]  # 3 orders per day
            
            for idx, order in enumerate(orders_for_day):
                # Check if transaction already exists
                existing_trans = db.query(CollectionTransaction).filter(
                    CollectionTransaction.order_id == order.id,
                    CollectionTransaction.collection_date == deposit_date
                ).first()
                
                if existing_trans:
                    continue
                
                # Calculate collection amounts
                total_amount = Decimal("10000") + (Decimal(str(idx)) * Decimal("2000"))
                
                # Alternate collection types
                if idx == 0:
                    collection_type = "Fully Collected"
                    collected_amount = total_amount
                    pending_amount = Decimal("0")
                elif idx == 1:
                    collection_type = "Partial Collection"
                    collected_amount = total_amount * Decimal("0.6")
                    pending_amount = total_amount * Decimal("0.4")
                else:
                    collection_type = "Postponed"
                    collected_amount = Decimal("0")
                    pending_amount = total_amount
                
                transaction = CollectionTransaction(
                    order_id=order.id,
                    collection_person_id=collection_person.id,
                    collection_date=deposit_date,
                    collection_type=collection_type,
                    collected_amount=collected_amount,
                    pending_amount=pending_amount,
                    total_amount=total_amount,
                    deposit_id=deposit.id if collected_amount > 0 else None,
                    remarks=f"Collection {collection_type.lower()} for order {order.memo_number or order.order_number}"
                )
                
                db.add(transaction)
                transactions_created += 1
        
        db.commit()
        print(f"\n✓ Successfully created {deposits_created} collection deposits")
        print(f"✓ Successfully created {transactions_created} collection transactions")
        print(f"\nSample data includes:")
        print(f"  - Deposits from last 7 days")
        print(f"  - Various collection types (Fully Collected, Partial, Postponed)")
        print(f"  - Different deposit methods (BRAC, bKash, Nagad)")
        print(f"  - Approved and pending deposits")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding collection data: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_collection_data()

