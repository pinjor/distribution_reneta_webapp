"""Delivery approval inventory tests. SQLite session only."""
from datetime import date
from decimal import Decimal

from app.models import (
    Customer,
    Depot,
    Order,
    OrderItem,
    OrderStatusEnum,
    Product,
    ProductItemStock,
    ProductItemStockDetail,
    StockLedger,
)
from app.models_platform import OrderBatchAllocation
from app.services.order_validation_service import OrderValidationService


def _ready_order(db, *, qty="10", memo="10000001", loading="LD-1", batch="2024001", depot_code="107"):
    depot = Depot(name="Khulna", code=depot_code)
    product = Product(name="Omeprazole", code="M04000123", sku="SKU-M04000123", is_active=True, base_price=10)
    customer = Customer(name="Chemist", code="C1", is_active=True, credit_limit=100000)
    db.add_all([depot, product, customer])
    db.flush()
    header = ProductItemStock(
        product_id=product.id,
        product_code=product.code,
        sku_code=product.sku,
        depot_id=depot.id,
        stock_qty=Decimal("100"),
        gross_stock_receive=Decimal("100"),
        issue=Decimal("0"),
    )
    db.add(header)
    db.flush()
    detail = ProductItemStockDetail(
        item_code=header.id,
        batch_no=batch,
        quantity=Decimal("100"),
        available_quantity=Decimal("100") - Decimal(qty),
        reserved_quantity=Decimal(qty),
        status="Unrestricted",
    )
    ledger = StockLedger(
        product_id=product.id,
        depot_id=depot.id,
        batch=batch,
        quantity=Decimal("100"),
        available_quantity=Decimal("100"),
        reserved_quantity=Decimal("0"),
    )
    order = Order(
        order_number=f"ORD-{memo}",
        memo_number=memo,
        depot_code=depot.code,
        customer_id="C1",
        customer_name="Chemist",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date(2026, 11, 19),
        status=OrderStatusEnum.APPROVED,
        loaded=True,
        loading_number=loading,
        assigned_to=1,
        assigned_vehicle=1,
    )
    db.add_all([detail, ledger, order])
    db.flush()
    item = OrderItem(
        order_id=order.id,
        product_code=product.code,
        product_name=product.name,
        quantity=Decimal(qty),
        total_quantity=Decimal(qty),
        trade_price=10,
        delivery_date=date(2026, 11, 19),
        selected=True,
    )
    db.add(item)
    db.flush()
    allocation = OrderBatchAllocation(
        order_id=order.id,
        order_item_id=item.id,
        product_id=product.id,
        batch_no=batch,
        allocated_qty=Decimal(qty),
        stock_source_id=detail.id,
        allocation_status="RESERVED",
    )
    db.add(allocation)
    db.commit()
    return depot, product, header, detail, ledger, order, item, allocation


def _approve(client, headers, loading, memo, delivered, returned):
    return client.post(
        "/api/orders/assigned/approve-delivery",
        headers=headers,
        json={
            "loading_number": loading,
            "memos": [{
                "memo_number": memo,
                "delivered_quantity": delivered,
                "returned_quantity": returned,
            }],
        },
    )


def test_validation_reserves_without_physical_issue_and_loading_keeps_it(client, db_session, auth_headers, admin_user):
    depot = Depot(name="Khulna", code="107")
    product = Product(name="Omeprazole", code="M04000123", sku="SKU-M04000123", is_active=True, base_price=10)
    customer = Customer(name="Chemist", code="C1", is_active=True, credit_limit=100000)
    db_session.add_all([depot, product, customer])
    db_session.flush()
    header = ProductItemStock(
        product_id=product.id, product_code=product.code, sku_code=product.sku, depot_id=depot.id, stock_qty=Decimal("100")
    )
    db_session.add(header)
    db_session.flush()
    detail = ProductItemStockDetail(
        item_code=header.id,
        batch_no="2024001",
        quantity=Decimal("100"),
        available_quantity=Decimal("100"),
        reserved_quantity=Decimal("0"),
    )
    order = Order(
        order_number="ORD-VAL",
        memo_number="10000009",
        depot_code="107",
        customer_id="C1",
        customer_name="Chemist",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date(2026, 11, 19),
        status=OrderStatusEnum.DRAFT,
        order_type="COD",
        assigned_to=admin_user.id,
        assigned_vehicle=1,
    )
    db_session.add_all([detail, order])
    db_session.flush()
    db_session.add(OrderItem(
        order_id=order.id,
        product_code=product.code,
        product_name=product.name,
        quantity=Decimal("10"),
        total_quantity=Decimal("10"),
        trade_price=10,
        delivery_date=date(2026, 11, 19),
        selected=True,
    ))
    db_session.commit()
    OrderValidationService.validate_order(db_session, order, admin_user)
    db_session.refresh(detail)
    assert Decimal(str(detail.quantity)) == Decimal("100")
    assert Decimal(str(detail.available_quantity)) == Decimal("90")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("10")

    response = client.put(
        f"/api/orders/assigned/{order.id}/status",
        headers=auth_headers,
        json={"status": "Out for Delivery"},
    )
    assert response.status_code == 200, response.text
    db_session.refresh(detail)
    assert Decimal(str(detail.quantity)) == Decimal("100")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("10")


def test_full_delivery_issues_reserved_stock_once(client, db_session, auth_headers):
    _depot, _product, header, detail, ledger, order, _item, allocation = _ready_order(db_session)
    response = _approve(client, auth_headers, "LD-1", "10000001", 10, 0)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["loading_number"] == "LD-1"
    assert body["approved_count"] == 1
    assert body["orders_moved_to_collection"] == ["10000001"]
    db_session.expire_all()
    detail = db_session.get(ProductItemStockDetail, detail.id)
    header = db_session.get(ProductItemStock, header.id)
    ledger = db_session.get(StockLedger, ledger.id)
    allocation = db_session.get(OrderBatchAllocation, allocation.id)
    order = db_session.get(Order, order.id)
    assert Decimal(str(detail.quantity)) == Decimal("90")
    assert Decimal(str(detail.available_quantity)) == Decimal("90")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("0")
    assert Decimal(str(header.stock_qty)) == Decimal("90")
    assert Decimal(str(header.issue)) == Decimal("10")
    assert Decimal(str(ledger.quantity)) == Decimal("90")
    assert Decimal(str(ledger.available_quantity)) == Decimal("90")
    assert allocation.allocation_status == "ISSUED"
    assert order.collection_status == "Pending"
    assert order.collection_approved is False

    again = _approve(client, auth_headers, "LD-1", "10000001", 10, 0)
    assert again.status_code == 400
    assert again.json()["detail"] == "Delivery already approved"
    db_session.expire_all()
    assert Decimal(str(db_session.get(ProductItemStockDetail, detail.id).quantity)) == Decimal("90")


def test_invalid_delivery_cases_do_not_change_stock(client, db_session, auth_headers):
    _depot, product, _header, detail, _ledger, order, _item, allocation = _ready_order(db_session)
    missing = _approve(client, auth_headers, "MISSING", "10000001", 10, 0)
    assert missing.status_code == 404

    order.loaded = False
    db_session.commit()
    response = _approve(client, auth_headers, "LD-1", "10000001", 10, 0)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid delivery status"
    order.loaded = True

    allocation.order_id = order.id
    other = Product(name="Other", code="OTHER", sku="SKU-OTHER", is_active=True)
    db_session.add(other)
    db_session.flush()
    allocation.product_id = other.id
    db_session.commit()
    response = _approve(client, auth_headers, "LD-1", "10000001", 10, 0)
    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown product"
    allocation.product_id = product.id

    order.depot_code = "999"
    db_session.commit()
    response = _approve(client, auth_headers, "LD-1", "10000001", 10, 0)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid depot"
    order.depot_code = "107"

    allocation.batch_no = "999"
    db_session.commit()
    response = _approve(client, auth_headers, "LD-1", "10000001", 10, 0)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid batch"
    allocation.batch_no = "2024001"

    detail.reserved_quantity = Decimal("4")
    detail.available_quantity = Decimal("96")
    db_session.commit()
    response = _approve(client, auth_headers, "LD-1", "10000001", 10, 0)
    assert response.status_code == 400
    assert response.json()["detail"] == "Insufficient reserved stock"

    db_session.delete(allocation)
    db_session.commit()
    response = _approve(client, auth_headers, "LD-1", "10000001", 10, 0)
    assert response.status_code == 400
    assert response.json()["detail"] == "Missing allocation"
    db_session.expire_all()
    assert Decimal(str(db_session.get(ProductItemStockDetail, detail.id).quantity)) == Decimal("100")
    assert db_session.get(Order, order.id).collection_status is None


def test_second_order_failure_rolls_back_the_first_issue(client, db_session, auth_headers):
    _depot, product, header, detail, _ledger, order, item, _allocation = _ready_order(db_session)
    second = Order(
        order_number="ORD-2",
        memo_number="10000002",
        depot_code="107",
        customer_id="C1",
        customer_name="Chemist",
        pso_id="P1",
        pso_name="PSO",
        delivery_date=date(2026, 11, 19),
        status=OrderStatusEnum.APPROVED,
        loaded=True,
        loading_number="LD-1",
    )
    db_session.add(second)
    db_session.flush()
    db_session.add(OrderItem(
        order_id=second.id,
        product_code=product.code,
        product_name=product.name,
        quantity=Decimal("5"),
        total_quantity=Decimal("5"),
        trade_price=10,
        delivery_date=date(2026, 11, 19),
    ))
    db_session.commit()
    response = client.post(
        "/api/orders/assigned/approve-delivery",
        headers=auth_headers,
        json={
            "loading_number": "LD-1",
            "memos": [
                {"memo_number": "10000001", "delivered_quantity": 10, "returned_quantity": 0},
                {"memo_number": "10000002", "delivered_quantity": 5, "returned_quantity": 0},
            ],
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Missing allocation"
    db_session.expire_all()
    assert Decimal(str(db_session.get(ProductItemStockDetail, detail.id).quantity)) == Decimal("100")
    assert Decimal(str(db_session.get(ProductItemStock, header.id).stock_qty)) == Decimal("100")
    assert db_session.get(Order, order.id).collection_status is None
    assert item.id


def test_partial_and_postponed_do_not_move_stock(client, db_session, auth_headers):
    _depot, _product, _header, detail, _ledger, order, _item, _allocation = _ready_order(db_session, qty="100")
    partial = _approve(client, auth_headers, "LD-1", "10000001", 70, 30)
    assert partial.status_code == 400
    assert "Partial delivery" in partial.json()["detail"]
    postponed = _approve(client, auth_headers, "LD-1", "10000001", 0, 100)
    assert postponed.status_code == 400
    assert "verified depot return" in postponed.json()["detail"]
    db_session.expire_all()
    detail = db_session.get(ProductItemStockDetail, detail.id)
    assert Decimal(str(detail.quantity)) == Decimal("100")
    assert Decimal(str(detail.available_quantity)) == Decimal("0")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("100")
    assert db_session.get(Order, order.id).collection_status is None


def test_two_batches_issue_together(client, db_session, auth_headers):
    depot, product, header, first, _ledger, order, first_item, _allocation = _ready_order(db_session, qty="4")
    second = ProductItemStockDetail(
        item_code=header.id,
        batch_no="2024002",
        quantity=Decimal("6"),
        available_quantity=Decimal("0"),
        reserved_quantity=Decimal("6"),
    )
    db_session.add(second)
    db_session.flush()
    db_session.add(StockLedger(
        product_id=product.id,
        depot_id=depot.id,
        batch="2024002",
        quantity=Decimal("6"),
        available_quantity=Decimal("6"),
        reserved_quantity=Decimal("0"),
    ))
    second_item = OrderItem(
        order_id=order.id,
        product_code=product.code,
        product_name=product.name,
        quantity=Decimal("6"),
        total_quantity=Decimal("6"),
        trade_price=10,
        delivery_date=date(2026, 11, 19),
    )
    db_session.add(second_item)
    db_session.flush()
    db_session.add(OrderBatchAllocation(
        order_id=order.id,
        order_item_id=second_item.id,
        product_id=product.id,
        batch_no="2024002",
        allocated_qty=Decimal("6"),
        stock_source_id=second.id,
        allocation_status="RESERVED",
    ))
    header.stock_qty = Decimal("106")
    db_session.commit()
    response = _approve(client, auth_headers, "LD-1", "10000001", 10, 0)
    assert response.status_code == 200, response.text
    db_session.expire_all()
    assert Decimal(str(db_session.get(ProductItemStockDetail, first.id).quantity)) == Decimal("96")
    assert Decimal(str(db_session.get(ProductItemStockDetail, second.id).quantity)) == Decimal("0")
    assert Decimal(str(db_session.get(ProductItemStock, header.id).stock_qty)) == Decimal("96")
    assert first_item.id
