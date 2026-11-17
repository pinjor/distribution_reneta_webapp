"""Seed pending and approved stock adjustments using real depot/product/batch stock."""

import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app import models
from db.seed_demo_modules import sync_stock_ledger


def seed_stock_adjustments_test(db) -> int:
    depots = db.query(models.Depot).order_by(models.Depot.id).all()
    employees = db.query(models.Employee).order_by(models.Employee.id).all()
    ledger = (
        db.query(models.StockLedger)
        .filter(models.StockLedger.product_id.isnot(None), models.StockLedger.depot_id.isnot(None))
        .order_by(models.StockLedger.id)
        .all()
    )
    if not ledger:
        synced = sync_stock_ledger(db)
        db.flush()
        print(f"   Synced {synced} stock ledger rows from product stock details")
        ledger = (
            db.query(models.StockLedger)
            .filter(models.StockLedger.product_id.isnot(None), models.StockLedger.depot_id.isnot(None))
            .order_by(models.StockLedger.id)
            .all()
        )
    if not depots or not employees or not ledger:
        print("Need depots, employees, and stock ledger rows before seeding adjustments.")
        return 0

    samples = [
        ("ADJ-TEST-001", "Pending", "Damaged goods write-off", "Write off", -5, 0),
        ("ADJ-TEST-002", "Pending", "Cycle count correction", "Correction", -3, 1),
        ("ADJ-TEST-003", "Pending", "Expired batch removal", "Expired", -8, 2),
        ("ADJ-TEST-004", "Pending", "Stock found during audit", "Found", 12, 3),
        ("ADJ-TEST-005", "Approved", "Temperature excursion write-off", "Damaged", -4, 4),
        ("ADJ-TEST-006", "Approved", "Found extra units", "Found", 6, 5),
        ("ADJ-TEST-007", "Pending", "Missing units after count", "Correction", -2, 6),
    ]

    created = 0
    submitter_id = employees[0].id
    approver_id = employees[1].id if len(employees) > 1 else employees[0].id

    for index, (adj_no, status, reason, adj_type, qty_change, ledger_offset) in enumerate(samples):
        if db.query(models.StockAdjustment).filter(models.StockAdjustment.adjustment_number == adj_no).first():
            print(f"   Skip existing {adj_no}")
            continue

        row = ledger[ledger_offset % len(ledger)]
        second = ledger[(ledger_offset + 1) % len(ledger)]
        adj = models.StockAdjustment(
            adjustment_number=adj_no,
            adjustment_date=date.today() - timedelta(days=index),
            depot_id=row.depot_id,
            adjustment_type=adj_type,
            reason=reason,
            status=status,
            submitted_by=submitter_id,
            approved_by=approver_id if status == "Approved" else None,
        )
        db.add(adj)
        db.flush()
        db.add(
            models.StockAdjustmentItem(
                adjustment_id=adj.id,
                product_id=row.product_id,
                batch=str(row.batch or "2024001"),
                quantity_change=Decimal(str(qty_change)),
            )
        )
        db.add(
            models.StockAdjustmentItem(
                adjustment_id=adj.id,
                product_id=second.product_id,
                batch=str(second.batch or "2024002"),
                quantity_change=Decimal(str(qty_change // 2 or qty_change)),
            )
        )
        created += 1
        print(f"   Created {adj_no} ({status}) depot={row.depot_id} batch={row.batch}")

    return created


def main():
    db = SessionLocal()
    try:
        created = seed_stock_adjustments_test(db)
        db.commit()
        print(f"Seeded {created} stock adjustment(s).")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
