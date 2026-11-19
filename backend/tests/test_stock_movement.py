"""Isolated tests for StockMovementService. SQLite only."""
from datetime import date
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.models import Depot, Order, OrderItem, OrderStatusEnum, Product, ProductItemStock, ProductItemStockDetail, StockLedger
from app.models_platform import OrderBatchAllocation
from app.services.stock_movement_service import StockMovementService


def _seed(db, *, quantity="100", available="100", reserved="0"):
    depot = Depot(name="Depot", code="D1")
    product = Product(name="Med", code="P1", sku="S1")
    db.add_all([depot, product])
    db.flush()
    header = ProductItemStock(
        product_id=product.id,
        product_code=product.code,
        sku_code=product.sku,
        depot_id=depot.id,
        stock_qty=Decimal(quantity),
        gross_stock_receive=Decimal(quantity),
        issue=Decimal("0"),
        adjusted_stock_in_qty=Decimal("0"),
        adjusted_stock_out_qty=Decimal("0"),
    )
    db.add(header)
    db.flush()
    detail = ProductItemStockDetail(
        item_code=header.id,
        batch_no="B1",
        quantity=Decimal(quantity),
        available_quantity=Decimal(available),
        reserved_quantity=Decimal(reserved),
        status="Unrestricted",
    )
    ledger = StockLedger(
        product_id=product.id,
        depot_id=depot.id,
        batch="B1",
        quantity=Decimal(quantity),
        available_quantity=Decimal(available),
        reserved_quantity=Decimal("0"),
        status="Unrestricted",
    )
    db.add_all([detail, ledger])
    db.commit()
    return depot, product, header, detail, ledger


def _order_with_allocation(db, detail, product, *, qty="10", alloc_status="RESERVED"):
    order = Order(
        order_number="MOV-1",
        customer_id="C1",
        customer_name="Chemist",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
    )
    db.add(order)
    db.flush()
    item = OrderItem(
        order_id=order.id,
        product_code=product.code,
        product_name=product.name,
        quantity=Decimal(qty),
        total_quantity=Decimal(qty),
        trade_price=Decimal("10"),
        delivery_date=date.today(),
        selected=True,
    )
    db.add(item)
    db.flush()
    allocation = OrderBatchAllocation(
        order_id=order.id,
        order_item_id=item.id,
        product_id=product.id,
        batch_no=detail.batch_no,
        allocated_qty=Decimal(qty),
        stock_source_id=detail.id,
        allocation_status=alloc_status,
    )
    db.add(allocation)
    db.commit()
    return order, allocation


def _assert_balanced(db, header, detail, ledger):
    db.refresh(header)
    db.refresh(detail)
    db.refresh(ledger)
    assert Decimal(str(detail.quantity)) == Decimal(str(detail.available_quantity)) + Decimal(str(detail.reserved_quantity))
    assert Decimal(str(header.stock_qty)) == Decimal(str(detail.quantity))


def test_receive_increases_batch_header_and_ledger(db_session):
    depot, product, header, detail, ledger = _seed(db_session)
    StockMovementService.receive(
        db_session, product_id=product.id, depot_id=depot.id, batch_no="B1", quantity=Decimal("5")
    )
    db_session.commit()
    _assert_balanced(db_session, header, detail, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("105")
    assert Decimal(str(detail.available_quantity)) == Decimal("105")
    assert Decimal(str(ledger.quantity)) == Decimal("105")
    assert Decimal(str(header.gross_stock_receive)) == Decimal("105")


def test_receive_rejects_invalid_quantity(db_session):
    depot, product, header, detail, ledger = _seed(db_session)
    with pytest.raises(HTTPException) as exc:
        StockMovementService.receive(
            db_session, product_id=product.id, depot_id=depot.id, batch_no="B1", quantity=0
        )
    assert exc.value.detail == "Invalid quantity"
    db_session.rollback()
    db_session.refresh(detail)
    assert Decimal(str(detail.quantity)) == Decimal("100")


def test_receive_rejects_unknown_product(db_session):
    depot, product, *_ = _seed(db_session)
    with pytest.raises(HTTPException) as exc:
        StockMovementService.receive(
            db_session, product_id=product.id + 99, depot_id=depot.id, batch_no="B1", quantity=1
        )
    assert exc.value.detail == "Product not found"


def test_receive_rejects_blank_batch(db_session):
    depot, product, *_ = _seed(db_session)
    with pytest.raises(HTTPException) as exc:
        StockMovementService.receive(
            db_session, product_id=product.id, depot_id=depot.id, batch_no="  ", quantity=1
        )
    assert exc.value.detail == "Batch not found"


def test_positive_and_negative_adjustment(db_session):
    depot, product, header, detail, ledger = _seed(db_session)
    StockMovementService.adjust(
        db_session, product_id=product.id, depot_id=depot.id, batch_no="B1", quantity_change=Decimal("4")
    )
    db_session.commit()
    assert Decimal(str(detail.quantity)) == Decimal("104")
    assert Decimal(str(header.adjusted_stock_in_qty)) == Decimal("4")
    StockMovementService.adjust(
        db_session, product_id=product.id, depot_id=depot.id, batch_no="B1", quantity_change=Decimal("-3")
    )
    db_session.commit()
    _assert_balanced(db_session, header, detail, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("101")
    assert Decimal(str(header.adjusted_stock_out_qty)) == Decimal("3")
    assert Decimal(str(ledger.quantity)) == Decimal("101")


def test_negative_adjustment_rejects_insufficient_available(db_session):
    depot, product, header, detail, ledger = _seed(db_session, quantity="100", available="90", reserved="10")
    with pytest.raises(HTTPException) as exc:
        StockMovementService.adjust(
            db_session, product_id=product.id, depot_id=depot.id, batch_no="B1", quantity_change=Decimal("-91")
        )
    assert exc.value.detail == "Insufficient available stock"
    db_session.rollback()
    db_session.refresh(detail)
    assert Decimal(str(detail.available_quantity)) == Decimal("90")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("10")


def test_issue_reserved_allocation_once(db_session):
    depot, product, header, detail, ledger = _seed(db_session, quantity="100", available="90", reserved="10")
    order, allocation = _order_with_allocation(db_session, detail, product, qty="10")
    issued = StockMovementService.issue_reserved_allocations(db_session, order.id)
    db_session.commit()
    assert issued == 1
    _assert_balanced(db_session, header, detail, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("90")
    assert Decimal(str(detail.available_quantity)) == Decimal("90")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("0")
    assert Decimal(str(ledger.quantity)) == Decimal("90")
    assert Decimal(str(header.issue)) == Decimal("10")
    db_session.refresh(allocation)
    assert allocation.allocation_status == "ISSUED"

    again = StockMovementService.issue_reserved_allocations(db_session, order.id)
    db_session.commit()
    assert again == 0
    db_session.refresh(detail)
    assert Decimal(str(detail.quantity)) == Decimal("90")


def test_issue_missing_and_invalid_allocation(db_session):
    depot, product, header, detail, ledger = _seed(db_session)
    order = Order(
        order_number="MOV-NONE",
        customer_id="C1",
        customer_name="Chemist",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
    )
    db_session.add(order)
    db_session.commit()
    with pytest.raises(HTTPException) as missing:
        StockMovementService.issue_reserved_allocations(db_session, order.id)
    assert missing.value.detail == "Missing allocation"

    _order_with_allocation(db_session, detail, product, alloc_status="ALLOCATED")
    # The helper always uses order_number MOV-1. Use a second order directly.
    other = Order(
        order_number="MOV-ALLOCATED",
        customer_id="C1",
        customer_name="Chemist",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
    )
    db_session.add(other)
    db_session.flush()
    item = OrderItem(
        order_id=other.id,
        product_code=product.code,
        product_name=product.name,
        quantity=10,
        trade_price=1,
        delivery_date=date.today(),
        selected=True,
    )
    db_session.add(item)
    db_session.flush()
    db_session.add(OrderBatchAllocation(
        order_id=other.id,
        order_item_id=item.id,
        product_id=product.id,
        batch_no="B1",
        allocated_qty=10,
        stock_source_id=detail.id,
        allocation_status="ALLOCATED",
    ))
    db_session.commit()
    with pytest.raises(HTTPException) as invalid:
        StockMovementService.issue_reserved_allocations(db_session, other.id)
    assert invalid.value.detail == "Invalid allocation status"


def test_issue_insufficient_reserved(db_session):
    depot, product, header, detail, ledger = _seed(db_session, quantity="100", available="95", reserved="5")
    order, _allocation = _order_with_allocation(db_session, detail, product, qty="10")
    with pytest.raises(HTTPException) as exc:
        StockMovementService.issue_reserved_allocations(db_session, order.id)
    assert exc.value.detail == "Insufficient reserved stock"
    db_session.rollback()
    db_session.refresh(detail)
    assert Decimal(str(detail.quantity)) == Decimal("100")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("5")


def test_transfer_out_and_in(db_session):
    depot, product, header, detail, ledger = _seed(db_session)
    destination = Depot(name="Other", code="D2")
    db_session.add(destination)
    db_session.commit()
    StockMovementService.transfer_out(
        db_session, product_id=product.id, depot_id=depot.id, batch_no="B1", quantity=Decimal("20")
    )
    db_session.commit()
    _assert_balanced(db_session, header, detail, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("80")
    assert Decimal(str(ledger.quantity)) == Decimal("80")

    arrived = StockMovementService.transfer_in(
        db_session, product_id=product.id, depot_id=destination.id, batch_no="B1", quantity=Decimal("20")
    )
    db_session.commit()
    dest_header = db_session.query(ProductItemStock).filter(ProductItemStock.depot_id == destination.id).one()
    dest_ledger = db_session.query(StockLedger).filter(StockLedger.depot_id == destination.id).one()
    assert Decimal(str(arrived.quantity)) == Decimal("20")
    assert Decimal(str(arrived.available_quantity)) == Decimal("20")
    assert Decimal(str(dest_header.stock_qty)) == Decimal("20")
    assert Decimal(str(dest_ledger.quantity)) == Decimal("20")


def test_transfer_out_protects_reserved_stock(db_session):
    depot, product, header, detail, ledger = _seed(db_session, quantity="100", available="90", reserved="10")
    with pytest.raises(HTTPException) as exc:
        StockMovementService.transfer_out(
            db_session, product_id=product.id, depot_id=depot.id, batch_no="B1", quantity=Decimal("91")
        )
    assert exc.value.detail == "Insufficient available stock"
    db_session.rollback()
    db_session.refresh(detail)
    assert Decimal(str(detail.quantity)) == Decimal("100")


def test_duplicate_ledger_rolls_back_batch_change(db_session):
    depot, product, header, detail, ledger = _seed(db_session)
    db_session.add(StockLedger(
        product_id=product.id,
        depot_id=depot.id,
        batch="B1",
        quantity=Decimal("100"),
        available_quantity=Decimal("100"),
        reserved_quantity=Decimal("0"),
    ))
    db_session.commit()
    with pytest.raises(HTTPException) as exc:
        StockMovementService.receive(
            db_session, product_id=product.id, depot_id=depot.id, batch_no="B1", quantity=Decimal("5")
        )
    assert exc.value.detail == "Duplicate stock records"
    db_session.rollback()
    db_session.refresh(detail)
    db_session.refresh(ledger)
    assert Decimal(str(detail.quantity)) == Decimal("100")
    assert Decimal(str(ledger.quantity)) == Decimal("100")
