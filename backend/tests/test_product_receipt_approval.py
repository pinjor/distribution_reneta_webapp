"""Product receipt approval endpoint tests. SQLite session only."""
from decimal import Decimal

from app.models import Depot, Product, ProductItemStock, ProductItemStockDetail, ProductReceipt, StockLedger


def _masters(db):
    depot = Depot(name="Khulna", code="107")
    product = Product(name="Omeprazole", code="M04000123", sku="SKU-M04000123", old_code="OLD-123")
    other = Product(name="Second", code="M04000999", sku="SKU-M04000999")
    db.add_all([depot, product, other])
    db.commit()
    return depot, product, other


def _item(code, batch, qty, name="Omeprazole"):
    return {
        "item_code": code,
        "item_name": name,
        "batch_number": batch,
        "depot_quantity": qty,
        "expiry_date": "2027-01-31",
    }


def _create(client, headers, depot_id, items, source="FACTORY", number="RCV-1"):
    response = client.post(
        "/api/product-receipts",
        headers=headers,
        json={
            "receipt_number": number,
            "source_type": source,
            "target_depot_id": depot_id,
            "remarks": "test",
            "items": items,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _balances(db, product_id, depot_id, batch):
    detail = (
        db.query(ProductItemStockDetail)
        .join(ProductItemStock, ProductItemStockDetail.item_code == ProductItemStock.id)
        .filter(
            ProductItemStock.product_id == product_id,
            ProductItemStock.depot_id == depot_id,
            ProductItemStockDetail.batch_no == batch,
        )
        .one()
    )
    header = db.query(ProductItemStock).filter(
        ProductItemStock.product_id == product_id,
        ProductItemStock.depot_id == depot_id,
    ).one()
    ledger = db.query(StockLedger).filter(
        StockLedger.product_id == product_id,
        StockLedger.depot_id == depot_id,
        StockLedger.batch == batch,
    ).one()
    return detail, header, ledger


def test_approve_single_item_updates_all_stock_tables(client, db_session, auth_headers):
    depot, product, _other = _masters(db_session)
    created = _create(client, auth_headers, depot.id, [_item(product.code, "2024001", "10")])
    approved = client.post(f"/api/product-receipts/{created['id']}/approve", headers=auth_headers)
    assert approved.status_code == 200, approved.text
    body = approved.json()
    assert body["receipt_number"] == "RCV-1"
    assert body["status"] == "Approved"
    assert body["id"] == created["id"]
    assert "approved_at" in body

    detail, header, ledger = _balances(db_session, product.id, depot.id, "2024001")
    assert Decimal(str(detail.quantity)) == Decimal("10")
    assert Decimal(str(detail.available_quantity)) == Decimal("10")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("0")
    assert Decimal(str(header.stock_qty)) == Decimal("10")
    assert Decimal(str(header.gross_stock_receive)) == Decimal("10")
    assert Decimal(str(ledger.quantity)) == Decimal("10")
    assert Decimal(str(ledger.available_quantity)) == Decimal("10")


def test_approve_multiple_items(client, db_session, auth_headers):
    depot, product, other = _masters(db_session)
    created = _create(
        client,
        auth_headers,
        depot.id,
        [_item(product.code, "2024001", "4"), _item(other.code, "2024002", "6", "Second")],
        number="RCV-MULTI",
    )
    approved = client.post(f"/api/product-receipts/{created['id']}/approve", headers=auth_headers)
    assert approved.status_code == 200, approved.text
    first, header, _ledger = _balances(db_session, product.id, depot.id, "2024001")
    second, _header2, ledger2 = _balances(db_session, other.id, depot.id, "2024002")
    assert Decimal(str(first.quantity)) == Decimal("4")
    assert Decimal(str(second.available_quantity)) == Decimal("6")
    assert Decimal(str(header.stock_qty)) == Decimal("4")
    assert Decimal(str(ledger2.quantity)) == Decimal("6")


def test_repeat_approval_does_not_change_stock(client, db_session, auth_headers):
    depot, product, _other = _masters(db_session)
    created = _create(client, auth_headers, depot.id, [_item(product.code, "2024001", "10")], number="RCV-REPEAT")
    assert client.post(f"/api/product-receipts/{created['id']}/approve", headers=auth_headers).status_code == 200
    again = client.post(f"/api/product-receipts/{created['id']}/approve", headers=auth_headers)
    assert again.status_code == 400
    assert again.json()["detail"] == "Receipt already approved"
    detail, header, ledger = _balances(db_session, product.id, depot.id, "2024001")
    assert Decimal(str(detail.quantity)) == Decimal("10")
    assert Decimal(str(header.stock_qty)) == Decimal("10")
    assert Decimal(str(ledger.quantity)) == Decimal("10")


def test_unknown_product_does_not_approve(client, db_session, auth_headers):
    depot, _product, _other = _masters(db_session)
    created = _create(client, auth_headers, depot.id, [_item("MISSING", "2024001", "10")], number="RCV-BAD-PRODUCT")
    response = client.post(f"/api/product-receipts/{created['id']}/approve", headers=auth_headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown product"
    receipt = db_session.query(ProductReceipt).filter(ProductReceipt.id == created["id"]).one()
    assert receipt.status.value == "Draft"
    assert db_session.query(ProductItemStockDetail).count() == 0


def test_invalid_depot_quantity_and_batch(client, db_session, auth_headers):
    depot, product, _other = _masters(db_session)
    missing_depot = _create(
        client,
        auth_headers,
        None,
        [_item(product.code, "2024001", "10")],
        number="RCV-NO-DEPOT",
    )
    # Create allows a null depot. Point the saved row at a missing id.
    receipt = db_session.query(ProductReceipt).filter(ProductReceipt.id == missing_depot["id"]).one()
    receipt.target_depot_id = depot.id + 99
    db_session.commit()
    response = client.post(f"/api/product-receipts/{receipt.id}/approve", headers=auth_headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid depot"

    zero = _create(client, auth_headers, depot.id, [_item(product.code, "2024001", "0")], number="RCV-ZERO")
    response = client.post(f"/api/product-receipts/{zero['id']}/approve", headers=auth_headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid quantity"

    negative = _create(client, auth_headers, depot.id, [_item(product.code, "2024001", "-2")], number="RCV-NEG")
    response = client.post(f"/api/product-receipts/{negative['id']}/approve", headers=auth_headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid quantity"

    blank = client.post(
        "/api/product-receipts",
        headers=auth_headers,
        json={
            "receipt_number": "RCV-BLANK",
            "source_type": "FACTORY",
            "target_depot_id": depot.id,
            "items": [{"item_code": product.code, "item_name": "Omeprazole", "batch_number": "", "depot_quantity": "5"}],
        },
    )
    assert blank.status_code == 201
    response = client.post(f"/api/product-receipts/{blank.json()['id']}/approve", headers=auth_headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid batch"
    assert db_session.query(StockLedger).count() == 0


def test_invalid_item_rolls_back_entire_receipt(client, db_session, auth_headers):
    depot, product, _other = _masters(db_session)
    created = _create(
        client,
        auth_headers,
        depot.id,
        [_item(product.code, "2024001", "8"), _item("MISSING", "2024002", "3", "Missing")],
        number="RCV-PARTIAL",
    )
    response = client.post(f"/api/product-receipts/{created['id']}/approve", headers=auth_headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown product"
    receipt = db_session.query(ProductReceipt).filter(ProductReceipt.id == created["id"]).one()
    assert receipt.status.value == "Draft"
    assert db_session.query(ProductItemStock).count() == 0
    assert db_session.query(StockLedger).count() == 0


def test_duplicate_ledger_rolls_back_earlier_item(client, db_session, auth_headers):
    depot, product, other = _masters(db_session)
    db_session.add_all([
        StockLedger(product_id=other.id, depot_id=depot.id, batch="2024002", quantity=1, available_quantity=1, reserved_quantity=0),
        StockLedger(product_id=other.id, depot_id=depot.id, batch="2024002", quantity=1, available_quantity=1, reserved_quantity=0),
    ])
    db_session.commit()
    created = _create(
        client,
        auth_headers,
        depot.id,
        [_item(product.code, "2024001", "8"), _item(other.code, "2024002", "3", "Second")],
        number="RCV-DUP",
    )
    response = client.post(f"/api/product-receipts/{created['id']}/approve", headers=auth_headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "Duplicate stock records"
    receipt = db_session.query(ProductReceipt).filter(ProductReceipt.id == created["id"]).one()
    assert receipt.status.value == "Draft"
    assert db_session.query(ProductItemStockDetail).count() == 0


def test_factory_depot_and_return_sources(client, db_session, auth_headers):
    depot, product, _other = _masters(db_session)
    for index, source in enumerate(("FACTORY", "DEPOT", "RETURN"), start=1):
        created = _create(
            client,
            auth_headers,
            depot.id,
            [_item(product.old_code if source == "RETURN" else product.code, f"202400{index}", "2")],
            source=source,
            number=f"RCV-{source}",
        )
        assert created["source_type"] == source
        approved = client.post(f"/api/product-receipts/{created['id']}/approve", headers=auth_headers)
        assert approved.status_code == 200, approved.text
        assert approved.json()["status"] == "Approved"
    detail, header, _ledger = _balances(db_session, product.id, depot.id, "2024001")
    assert Decimal(str(detail.quantity)) == Decimal("2")
    assert Decimal(str(header.stock_qty)) == Decimal("6")
    listed = client.get("/api/product-receipts", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["total"] == 3


def test_receipt_not_found(client, auth_headers):
    response = client.post("/api/product-receipts/99999/approve", headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Receipt not found"
