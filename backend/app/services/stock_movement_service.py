"""Physical stock movements for batch, depot summary, and ledger rows.

Callers own the transaction. This service never commits or rolls back.
"""
from decimal import Decimal, InvalidOperation
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Depot, Product, ProductItemStock, ProductItemStockDetail, StockLedger
from app.models_platform import OrderBatchAllocation


class StockMovementService:
    """Apply one physical stock delta to the batch, the product/depot header, and the ledger."""

    @staticmethod
    def receive(
        db: Session,
        *,
        product_id: int,
        depot_id: int,
        batch_no: str,
        quantity,
        expiry_date=None,
    ) -> ProductItemStockDetail:
        """Increase on-hand and available stock. Reserved quantity is unchanged."""
        qty = _positive_quantity(quantity)
        product = _lock_product(db, product_id)
        _lock_depot(db, depot_id)
        batch = _clean_batch(batch_no)
        header = _lock_or_create_header(db, product, depot_id)
        detail = _lock_or_create_detail(db, header, batch, expiry_date)
        _require_consistent(detail)
        _add_available(detail, qty)
        if expiry_date and not detail.expiry_date:
            detail.expiry_date = expiry_date
        header.stock_qty = _dec(header.stock_qty) + qty
        header.gross_stock_receive = _dec(header.gross_stock_receive) + qty
        _apply_ledger(db, product_id, depot_id, batch, qty, expiry_date or detail.expiry_date)
        db.flush()
        return detail

    @staticmethod
    def adjust(
        db: Session,
        *,
        product_id: int,
        depot_id: int,
        batch_no: str,
        quantity_change,
    ) -> ProductItemStockDetail:
        """Apply a signed adjustment. Negative changes cannot consume reserved stock."""
        change = _signed_quantity(quantity_change)
        _lock_product(db, product_id)
        _lock_depot(db, depot_id)
        batch = _clean_batch(batch_no)
        header = _lock_header(db, product_id, depot_id)
        if header is None:
            raise _error(status.HTTP_404_NOT_FOUND, "Batch not found")
        detail = _lock_detail(db, header.id, batch)
        _require_consistent(detail)
        if change > 0:
            _add_available(detail, change)
            header.stock_qty = _dec(header.stock_qty) + change
            header.adjusted_stock_in_qty = _dec(header.adjusted_stock_in_qty) + change
        else:
            _consume_available(detail, -change)
            header.stock_qty = _dec(header.stock_qty) + change
            header.adjusted_stock_out_qty = _dec(header.adjusted_stock_out_qty) + (-change)
            if _dec(header.stock_qty) < 0:
                raise _error(status.HTTP_400_BAD_REQUEST, "Insufficient stock")
        _apply_ledger(db, product_id, depot_id, batch, change, detail.expiry_date)
        db.flush()
        return detail

    @staticmethod
    def issue_reserved_allocations(db: Session, order_id: int) -> int:
        """Deduct physical stock once for RESERVED allocations. A repeat call issues nothing."""
        allocations = (
            db.query(OrderBatchAllocation)
            .filter(OrderBatchAllocation.order_id == order_id)
            .order_by(OrderBatchAllocation.id)
            .with_for_update()
            .all()
        )
        reserved = [row for row in allocations if row.allocation_status == "RESERVED"]
        if not reserved:
            if any(row.allocation_status == "ISSUED" for row in allocations):
                return 0
            if not allocations:
                raise _error(status.HTTP_400_BAD_REQUEST, "Missing allocation")
            raise _error(status.HTTP_400_BAD_REQUEST, "Invalid allocation status")

        by_source: dict[int, list[OrderBatchAllocation]] = {}
        for row in reserved:
            if not row.stock_source_id:
                raise _error(status.HTTP_400_BAD_REQUEST, "Missing allocation")
            qty = _dec(row.allocated_qty)
            if qty <= 0:
                raise _error(status.HTTP_400_BAD_REQUEST, "Invalid quantity")
            by_source.setdefault(row.stock_source_id, []).append(row)

        source_ids = sorted(by_source)
        preview = (
            db.query(ProductItemStockDetail)
            .filter(ProductItemStockDetail.id.in_(source_ids))
            .order_by(ProductItemStockDetail.id)
            .all()
        )
        if len(preview) != len(source_ids):
            raise _error(status.HTTP_404_NOT_FOUND, "Batch not found")
        for header_id in sorted({row.item_code for row in preview}):
            header = _lock_header_by_id(db, header_id)
            if header is None or header.depot_id is None:
                raise _error(status.HTTP_404_NOT_FOUND, "Depot not found")
        details = (
            db.query(ProductItemStockDetail)
            .filter(ProductItemStockDetail.id.in_(source_ids))
            .order_by(ProductItemStockDetail.id)
            .with_for_update()
            .all()
        )

        issued = 0
        for detail in details:
            rows = by_source[detail.id]
            qty = sum((_dec(row.allocated_qty) for row in rows), Decimal("0"))
            header = _lock_header_by_id(db, detail.item_code)
            if header is None or header.depot_id is None:
                raise _error(status.HTTP_404_NOT_FOUND, "Depot not found")
            _require_consistent(detail)
            if _dec(detail.reserved_quantity) < qty:
                raise _error(status.HTTP_400_BAD_REQUEST, "Insufficient reserved stock")
            if _dec(detail.quantity) < qty:
                raise _error(status.HTTP_400_BAD_REQUEST, "Insufficient stock")
            detail.quantity = _dec(detail.quantity) - qty
            detail.reserved_quantity = _dec(detail.reserved_quantity) - qty
            _require_consistent(detail)
            header.stock_qty = _dec(header.stock_qty) - qty
            header.issue = _dec(header.issue) + qty
            if _dec(header.stock_qty) < 0:
                raise _error(status.HTTP_400_BAD_REQUEST, "Insufficient stock")
            _apply_ledger(db, header.product_id, header.depot_id, detail.batch_no, -qty, detail.expiry_date)
            for row in rows:
                row.allocation_status = "ISSUED"
                issued += 1
        db.flush()
        return issued

    @staticmethod
    def transfer_out(
        db: Session,
        *,
        product_id: int,
        depot_id: int,
        batch_no: str,
        quantity,
    ) -> ProductItemStockDetail:
        """Remove available stock from the source depot. Does not change transfer status."""
        qty = _positive_quantity(quantity)
        _lock_product(db, product_id)
        _lock_depot(db, depot_id)
        batch = _clean_batch(batch_no)
        header = _lock_header(db, product_id, depot_id)
        if header is None:
            raise _error(status.HTTP_404_NOT_FOUND, "Batch not found")
        detail = _lock_detail(db, header.id, batch)
        _require_consistent(detail)
        _consume_available(detail, qty)
        header.stock_qty = _dec(header.stock_qty) - qty
        header.issue = _dec(header.issue) + qty
        if _dec(header.stock_qty) < 0:
            raise _error(status.HTTP_400_BAD_REQUEST, "Insufficient stock")
        _apply_ledger(db, product_id, depot_id, batch, -qty, detail.expiry_date)
        db.flush()
        return detail

    @staticmethod
    def transfer_in(
        db: Session,
        *,
        product_id: int,
        depot_id: int,
        batch_no: str,
        quantity,
        expiry_date=None,
    ) -> ProductItemStockDetail:
        """Add available stock at the destination depot. Does not change transfer status."""
        qty = _positive_quantity(quantity)
        product = _lock_product(db, product_id)
        _lock_depot(db, depot_id)
        batch = _clean_batch(batch_no)
        header = _lock_or_create_header(db, product, depot_id)
        detail = _lock_or_create_detail(db, header, batch, expiry_date)
        _require_consistent(detail)
        _add_available(detail, qty)
        if expiry_date and not detail.expiry_date:
            detail.expiry_date = expiry_date
        header.stock_qty = _dec(header.stock_qty) + qty
        header.gross_stock_receive = _dec(header.gross_stock_receive) + qty
        _apply_ledger(db, product_id, depot_id, batch, qty, expiry_date or detail.expiry_date)
        db.flush()
        return detail


def _dec(value) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise _error(status.HTTP_400_BAD_REQUEST, "Invalid quantity")


def _positive_quantity(value) -> Decimal:
    qty = _dec(value)
    if qty <= 0:
        raise _error(status.HTTP_400_BAD_REQUEST, "Invalid quantity")
    return qty


def _signed_quantity(value) -> Decimal:
    qty = _dec(value)
    if qty == 0:
        raise _error(status.HTTP_400_BAD_REQUEST, "Invalid quantity")
    return qty


def _clean_batch(batch_no: Optional[str]) -> str:
    batch = (batch_no or "").strip()
    if not batch:
        raise _error(status.HTTP_400_BAD_REQUEST, "Batch not found")
    return batch


def _error(code: int, detail: str) -> HTTPException:
    return HTTPException(status_code=code, detail=detail)


def _lock_product(db: Session, product_id: int) -> Product:
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .order_by(Product.id)
        .with_for_update()
        .first()
    )
    if product is None:
        raise _error(status.HTTP_404_NOT_FOUND, "Product not found")
    return product


def _lock_depot(db: Session, depot_id: int) -> Depot:
    depot = (
        db.query(Depot)
        .filter(Depot.id == depot_id)
        .order_by(Depot.id)
        .with_for_update()
        .first()
    )
    if depot is None:
        raise _error(status.HTTP_404_NOT_FOUND, "Depot not found")
    return depot


def _header_query(db: Session, product_id: int, depot_id: int):
    return (
        db.query(ProductItemStock)
        .filter(
            ProductItemStock.product_id == product_id,
            ProductItemStock.depot_id == depot_id,
        )
        .order_by(ProductItemStock.id)
        .with_for_update()
    )


def _lock_header(db: Session, product_id: int, depot_id: int) -> Optional[ProductItemStock]:
    rows = _header_query(db, product_id, depot_id).all()
    if len(rows) > 1:
        raise _error(status.HTTP_409_CONFLICT, "Duplicate stock records")
    return rows[0] if rows else None


def _lock_header_by_id(db: Session, header_id: int) -> Optional[ProductItemStock]:
    return (
        db.query(ProductItemStock)
        .filter(ProductItemStock.id == header_id)
        .order_by(ProductItemStock.id)
        .with_for_update()
        .first()
    )


def _lock_or_create_header(db: Session, product: Product, depot_id: int) -> ProductItemStock:
    header = _lock_header(db, product.id, depot_id)
    if header is not None:
        return header
    header = ProductItemStock(
        product_id=product.id,
        product_code=product.code,
        sku_code=product.sku,
        depot_id=depot_id,
        gross_stock_receive=Decimal("0"),
        issue=Decimal("0"),
        stock_qty=Decimal("0"),
        adjusted_stock_in_qty=Decimal("0"),
        adjusted_stock_out_qty=Decimal("0"),
    )
    db.add(header)
    db.flush()
    return header


def _detail_query(db: Session, header_id: int, batch: str):
    return (
        db.query(ProductItemStockDetail)
        .filter(
            ProductItemStockDetail.item_code == header_id,
            func.trim(ProductItemStockDetail.batch_no) == batch,
        )
        .order_by(ProductItemStockDetail.id)
        .with_for_update()
    )


def _lock_detail(db: Session, header_id: int, batch: str) -> ProductItemStockDetail:
    rows = _detail_query(db, header_id, batch).all()
    if len(rows) > 1:
        raise _error(status.HTTP_409_CONFLICT, "Duplicate stock records")
    if not rows:
        raise _error(status.HTTP_404_NOT_FOUND, "Batch not found")
    return rows[0]


def _lock_or_create_detail(
    db: Session,
    header: ProductItemStock,
    batch: str,
    expiry_date,
) -> ProductItemStockDetail:
    rows = _detail_query(db, header.id, batch).all()
    if len(rows) > 1:
        raise _error(status.HTTP_409_CONFLICT, "Duplicate stock records")
    if rows:
        return rows[0]
    detail = ProductItemStockDetail(
        item_code=header.id,
        batch_no=batch,
        expiry_date=expiry_date,
        quantity=Decimal("0"),
        available_quantity=Decimal("0"),
        reserved_quantity=Decimal("0"),
        status="Unrestricted",
    )
    db.add(detail)
    db.flush()
    return detail


def _require_consistent(detail: ProductItemStockDetail) -> None:
    on_hand = _dec(detail.quantity)
    available = _dec(detail.available_quantity)
    reserved = _dec(detail.reserved_quantity)
    if on_hand != available + reserved or on_hand < 0 or available < 0 or reserved < 0:
        raise _error(status.HTTP_400_BAD_REQUEST, "Inconsistent inventory balances")


def _add_available(detail: ProductItemStockDetail, qty: Decimal) -> None:
    detail.quantity = _dec(detail.quantity) + qty
    detail.available_quantity = _dec(detail.available_quantity) + qty
    _require_consistent(detail)


def _consume_available(detail: ProductItemStockDetail, qty: Decimal) -> None:
    if _dec(detail.available_quantity) < qty:
        raise _error(status.HTTP_400_BAD_REQUEST, "Insufficient available stock")
    if _dec(detail.quantity) < qty:
        raise _error(status.HTTP_400_BAD_REQUEST, "Insufficient stock")
    detail.quantity = _dec(detail.quantity) - qty
    detail.available_quantity = _dec(detail.available_quantity) - qty
    _require_consistent(detail)


def _apply_ledger(
    db: Session,
    product_id: int,
    depot_id: int,
    batch: str,
    delta: Decimal,
    expiry_date,
) -> None:
    rows = (
        db.query(StockLedger)
        .filter(
            StockLedger.product_id == product_id,
            StockLedger.depot_id == depot_id,
            func.trim(StockLedger.batch) == batch,
        )
        .order_by(StockLedger.id)
        .with_for_update()
        .all()
    )
    if len(rows) > 1:
        raise _error(status.HTTP_409_CONFLICT, "Duplicate stock records")
    if not rows:
        if delta < 0:
            raise _error(status.HTTP_400_BAD_REQUEST, "Insufficient stock")
        db.add(
            StockLedger(
                product_id=product_id,
                depot_id=depot_id,
                batch=batch,
                quantity=delta,
                reserved_quantity=Decimal("0"),
                available_quantity=delta,
                expiry_date=expiry_date,
                status="Unrestricted",
            )
        )
        return
    ledger = rows[0]
    next_qty = _dec(ledger.quantity) + delta
    next_available = _dec(ledger.available_quantity) + delta
    if next_qty < 0 or next_available < 0:
        raise _error(status.HTTP_400_BAD_REQUEST, "Insufficient stock")
    ledger.quantity = next_qty
    ledger.available_quantity = next_available
    if expiry_date and not ledger.expiry_date:
        ledger.expiry_date = expiry_date
