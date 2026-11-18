"""Seed post-delivery reconciliation runs for UI testing."""
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import func

from app.database import SessionLocal
from app.models import Depot, Employee, Order
from app.models_platform import (
    ReconciliationLine,
    ReconciliationRun,
    ReconciliationStatusEnum,
    ReconciliationVariance,
)


def _money(value) -> Decimal:
    return Decimal(str(value or 0))


def _ensure_loading_numbers(db, orders, count=10):
    """Give demo loading numbers to orders that do not have one."""
    existing = [order.loading_number for order in orders if order.loading_number]
    unique = list(dict.fromkeys(existing))
    if len(unique) >= count:
        return unique

    today = datetime.utcnow().strftime("%Y%m%d")
    seq = 1
    assigned = list(unique)
    for order in orders:
        if order.loading_number:
            continue
        loading_number = f"{today}-{seq:04d}"
        while loading_number in assigned:
            seq += 1
            loading_number = f"{today}-{seq:04d}"
        order.loading_number = loading_number
        assigned.append(loading_number)
        seq += 1
        if len(assigned) >= count:
            break
    db.flush()
    return assigned


def seed_reconciliation():
    db = SessionLocal()
    try:
        existing = db.query(func.count(ReconciliationRun.id)).scalar() or 0
        if existing >= 8:
            print(f"Reconciliation seed skipped ({existing} runs already exist).")
            return

        orders = db.query(Order).order_by(Order.id.desc()).limit(40).all()
        if not orders:
            print("No orders found. Seed orders before reconciliation data.")
            return

        employees = db.query(Employee).limit(5).all()
        depots = db.query(Depot).limit(2).all()
        prepared_by = employees[0].id if employees else None
        depot_id = depots[0].id if depots else None

        loading_numbers = _ensure_loading_numbers(db, orders, count=10)
        already = {
            row.loading_number
            for row in db.query(ReconciliationRun.loading_number).filter(
                ReconciliationRun.loading_number.in_(loading_numbers)
            )
        }

        grouped = {}
        for order in orders:
            if not order.loading_number:
                continue
            grouped.setdefault(order.loading_number, []).append(order)

        created = 0
        unused_for_create = []
        today = datetime.utcnow().strftime("%Y%m%d")

        for index, loading_number in enumerate(loading_numbers):
            group = grouped.get(loading_number) or []
            if not group:
                continue
            if loading_number in already:
                continue
            # Leave two loading numbers free so Create Reconciliation can be tested.
            if index >= 8:
                unused_for_create.append(loading_number)
                continue

            delivered = Decimal("0")
            collected = Decimal("0")
            returned = Decimal("0")
            for order in group:
                collected += _money(order.collected_amount)
                pending = _money(order.pending_amount)
                if (order.collection_status or "") in ("Postponed", "Partially Collected"):
                    returned += pending
                for item in order.items or []:
                    unit_price = item.unit_price or item.trade_price or Decimal("0")
                    discount = item.discount_percent or Decimal("0")
                    qty = item.total_quantity or ((item.quantity or 0) + (item.free_goods or 0))
                    delivered += _money(unit_price) * (1 - _money(discount) / 100) * _money(qty)

            if delivered == 0:
                delivered = Decimal("25000.00") + Decimal(index) * Decimal("1500")
            if collected == 0:
                collected = delivered if index % 3 != 1 else delivered - Decimal("2500.00")

            variance = delivered - collected - returned
            if index % 3 == 0:
                status = ReconciliationStatusEnum.DRAFT
                collected = delivered - returned
                variance = Decimal("0")
            elif index % 3 == 1:
                status = ReconciliationStatusEnum.PENDING_VERIFICATION
            else:
                status = ReconciliationStatusEnum.PENDING_APPROVAL
                collected = delivered - returned
                variance = Decimal("0")

            recon_no = f"REC-{today}-{index + 1:04d}"
            if db.query(ReconciliationRun).filter(ReconciliationRun.reconciliation_no == recon_no).first():
                continue

            first = group[0]
            created_at = datetime.utcnow() - timedelta(days=index)
            run = ReconciliationRun(
                reconciliation_no=recon_no,
                depot_id=first.depot_id if getattr(first, "depot_id", None) else depot_id,
                loading_number=loading_number,
                delivery_man_id=first.assigned_to,
                vehicle_id=first.assigned_vehicle,
                total_delivered_value=delivered,
                total_collection_value=collected,
                total_return_value=returned,
                variance_amount=variance,
                cash_in_hand=collected,
                status=status,
                prepared_by=prepared_by,
                created_at=created_at,
            )
            db.add(run)
            db.flush()

            for order in group:
                line_collected = _money(order.collected_amount)
                line_returned = (
                    _money(order.pending_amount)
                    if (order.collection_status or "") in ("Postponed", "Partially Collected")
                    else Decimal("0")
                )
                line_delivered = Decimal("0")
                for item in order.items or []:
                    unit_price = item.unit_price or item.trade_price or Decimal("0")
                    discount = item.discount_percent or Decimal("0")
                    qty = item.total_quantity or ((item.quantity or 0) + (item.free_goods or 0))
                    line_delivered += _money(unit_price) * (1 - _money(discount) / 100) * _money(qty)
                if line_delivered == 0:
                    line_delivered = (delivered / Decimal(len(group))).quantize(Decimal("0.01"))
                db.add(
                    ReconciliationLine(
                        reconciliation_run_id=run.id,
                        order_id=order.id,
                        invoice_no=order.memo_number or order.order_number,
                        delivered_value=line_delivered,
                        collected_value=line_collected,
                        return_value=line_returned,
                        variance_amount=line_delivered - line_collected - line_returned,
                        collection_status=order.collection_status,
                        delivery_status=order.delivery_status,
                    )
                )

            if abs(variance) > Decimal("0.01"):
                db.add(
                    ReconciliationVariance(
                        reconciliation_run_id=run.id,
                        variance_type="BALANCE_MISMATCH",
                        variance_amount=variance,
                        reason="Delivered - Collected - Returns != 0",
                        resolution_status="OPEN",
                    )
                )

            created += 1

        db.commit()
        print(f"Created {created} reconciliation runs.")
        if unused_for_create:
            print("Loading numbers available for Create Reconciliation:")
            for number in unused_for_create:
                print(f"  - {number}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main():
    seed_reconciliation()


if __name__ == "__main__":
    main()
