"""Read-only inventory checks for a demo database session."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models import ProductItemStock, ProductItemStockDetail, StockLedger
from app.models_platform import OrderBatchAllocation
from db.inventory_rules import D, assert_balance


def validate(db: Session) -> list[str]:
    problems: list[str] = []
    reserved_by_detail: dict[int, Decimal] = defaultdict(lambda: Decimal("0"))
    allocations = db.query(OrderBatchAllocation).all()
    for alloc in allocations:
        if alloc.allocation_status == "RESERVED":
            reserved_by_detail[alloc.stock_source_id] += D(alloc.allocated_qty)
        if alloc.stock_source_id is None:
            problems.append(f"allocation {alloc.id} has no stock_source_id")

    details = db.query(ProductItemStockDetail).all()
    for detail in details:
        try:
            assert_balance(detail.quantity, detail.available_quantity, detail.reserved_quantity)
        except ValueError as exc:
            problems.append(f"detail {detail.id} batch {detail.batch_no}: {exc}")
        expected = reserved_by_detail.get(detail.id, Decimal("0"))
        if D(detail.reserved_quantity) != expected:
            problems.append(
                f"detail {detail.id} reserved {detail.reserved_quantity} "
                f"!= sum of RESERVED allocations {expected}"
            )

    for stock in db.query(ProductItemStock).all():
        total = sum((D(d.quantity) for d in stock.details), Decimal("0"))
        if D(stock.stock_qty) != total:
            problems.append(
                f"product_item_stock {stock.id} stock_qty {stock.stock_qty} != sum of batches {total}"
            )

    details_by_key = {}
    for detail in details:
        header = detail.item_stock
        details_by_key[(header.product_id, header.depot_id, detail.batch_no)] = detail

    for ledger in db.query(StockLedger).all():
        try:
            assert_balance(ledger.quantity, ledger.available_quantity, ledger.reserved_quantity)
        except ValueError as exc:
            problems.append(f"ledger {ledger.id} batch {ledger.batch}: {exc}")
        detail = details_by_key.get((ledger.product_id, ledger.depot_id, ledger.batch))
        if detail is None:
            problems.append(
                f"ledger {ledger.id} batch {ledger.batch} has no matching product_item_stock_details row"
            )
            continue
        if D(detail.quantity) != D(ledger.quantity) or D(detail.reserved_quantity) != D(ledger.reserved_quantity):
            problems.append(
                f"ledger {ledger.id} batch {ledger.batch} qty {ledger.quantity}/reserved {ledger.reserved_quantity} "
                f"!= detail {detail.quantity}/{detail.reserved_quantity}"
            )

    current = db.execute(text("SELECT current_database()")).scalar()
    if current == "swift_distro_hub":
        problems.append("validation session is connected to swift_distro_hub")
    return problems


def main() -> None:
    from db.demo_safety import bind_process_to_demo_url, connect_verified_demo

    url = bind_process_to_demo_url()
    engine = connect_verified_demo(url)
    engine.dispose()
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        problems = validate(db)
    finally:
        db.close()
    if problems:
        for problem in problems:
            print(f"FAIL {problem}")
        raise SystemExit(1)
    print("Inventory checks passed.")


if __name__ == "__main__":
    main()
