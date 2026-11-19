"""Stock adjustment approval endpoint tests. SQLite session only."""
from datetime import date
from decimal import Decimal

from app.models import (
    Depot,
    Product,
    ProductItemStock,
    ProductItemStockDetail,
    StockAdjustment,
    StockAdjustmentItem,
    StockLedger,
)


def _stock(db, *, batch="2024001", quantity="100", available="100", reserved="0", ledger=None, code="M04000123"):
    depot = Depot(name="Khulna", code="107")
    product = Product(name="Omeprazole", code=code, sku=f"SKU-{code}")
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
        batch_no=batch,
        quantity=Decimal(quantity),
        available_quantity=Decimal(available),
        reserved_quantity=Decimal(reserved),
    )
    ledger_qty = Decimal(ledger if ledger is not None else quantity)
    ledger_row = StockLedger(
        product_id=product.id,
        depot_id=depot.id,
        batch=batch,
        quantity=ledger_qty,
        available_quantity=ledger_qty,
        reserved_quantity=Decimal("0"),
    )
    db.add_all([detail, ledger_row])
    db.commit()
    return depot, product, header, detail, ledger_row


def _add_batch(db, header, product, depot, batch, quantity="40"):
    detail = ProductItemStockDetail(
        item_code=header.id,
        batch_no=batch,
        quantity=Decimal(quantity),
        available_quantity=Decimal(quantity),
        reserved_quantity=Decimal("0"),
    )
    ledger = StockLedger(
        product_id=product.id,
        depot_id=depot.id,
        batch=batch,
        quantity=Decimal(quantity),
        available_quantity=Decimal(quantity),
        reserved_quantity=Decimal("0"),
    )
    header.stock_qty = Decimal(str(header.stock_qty)) + Decimal(quantity)
    db.add_all([detail, ledger])
    db.commit()
    return detail, ledger


def _adjustment(db, depot, lines, *, status_value="Pending", number="ADJ-1", adjustment_type="Correction"):
    adjustment = StockAdjustment(
        adjustment_number=number,
        adjustment_date=date(2026, 11, 19),
        depot_id=depot.id if depot else None,
        adjustment_type=adjustment_type,
        reason="count",
        status=status_value,
    )
    db.add(adjustment)
    db.flush()
    for product_id, batch, change in lines:
        db.add(
            StockAdjustmentItem(
                adjustment_id=adjustment.id,
                product_id=product_id,
                batch=batch,
                quantity_change=Decimal(str(change)),
            )
        )
    db.commit()
    db.refresh(adjustment)
    return adjustment


def _approve(client, headers, adjustment_id):
    return client.post(f"/api/stock/adjustments/{adjustment_id}/approve", headers=headers, json={})


def _reload(db, detail, header, ledger):
    db.expire_all()
    return (
        db.get(ProductItemStockDetail, detail.id),
        db.get(ProductItemStock, header.id),
        db.get(StockLedger, ledger.id),
    )


def test_positive_adjustment_updates_all_tables(client, db_session, auth_headers):
    depot, product, header, detail, ledger = _stock(db_session)
    adjustment = _adjustment(db_session, depot, [(product.id, "2024001", "4")], number="ADJ-POS")
    response = _approve(client, auth_headers, adjustment.id)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "Approved"
    assert body["adjustment_number"] == "ADJ-POS"
    assert body["adjustment_type"] == "Correction"
    assert body["approved_by"] is not None
    assert body["items"][0]["quantity_change"] == "4.00" or Decimal(body["items"][0]["quantity_change"]) == Decimal("4")
    detail, header, ledger = _reload(db_session, detail, header, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("104")
    assert Decimal(str(detail.available_quantity)) == Decimal("104")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("0")
    assert Decimal(str(header.stock_qty)) == Decimal("104")
    assert Decimal(str(header.adjusted_stock_in_qty)) == Decimal("4")
    assert Decimal(str(ledger.quantity)) == Decimal("104")
    assert Decimal(str(ledger.available_quantity)) == Decimal("104")


def test_negative_adjustment_protects_reserved_stock(client, db_session, auth_headers):
    depot, product, header, detail, ledger = _stock(
        db_session, quantity="100", available="70", reserved="30", ledger="100"
    )
    ok = _adjustment(db_session, depot, [(product.id, "2024001", "-20")], number="ADJ-NEG")
    response = _approve(client, auth_headers, ok.id)
    assert response.status_code == 200, response.text
    detail, header, ledger = _reload(db_session, detail, header, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("80")
    assert Decimal(str(detail.available_quantity)) == Decimal("50")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("30")
    assert Decimal(str(header.stock_qty)) == Decimal("80")
    assert Decimal(str(header.adjusted_stock_out_qty)) == Decimal("20")
    assert Decimal(str(ledger.quantity)) == Decimal("80")

    too_much = _adjustment(db_session, depot, [(product.id, "2024001", "-80")], number="ADJ-OVER")
    failed = _approve(client, auth_headers, too_much.id)
    assert failed.status_code == 400
    assert failed.json()["detail"] == "Insufficient available stock"
    detail, header, ledger = _reload(db_session, detail, header, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("80")
    assert Decimal(str(detail.available_quantity)) == Decimal("50")
    assert Decimal(str(detail.reserved_quantity)) == Decimal("30")
    saved = db_session.get(StockAdjustment, too_much.id)
    assert saved.status == "Pending"


def test_multiple_lines_and_full_rollback(client, db_session, auth_headers):
    depot, product, header, detail, ledger = _stock(db_session, quantity="100")
    second, _second_ledger = _add_batch(db_session, header, product, depot, "2024002", "40")
    db_session.add(
        StockLedger(
            product_id=product.id,
            depot_id=depot.id,
            batch="2024002",
            quantity=Decimal("1"),
            available_quantity=Decimal("1"),
            reserved_quantity=Decimal("0"),
        )
    )
    db_session.commit()
    failed = _adjustment(
        db_session,
        depot,
        [(product.id, "2024001", "5"), (product.id, "2024002", "-2")],
        number="ADJ-ROLLBACK",
    )
    response = _approve(client, auth_headers, failed.id)
    assert response.status_code == 409
    assert response.json()["detail"] == "Duplicate stock records"
    detail, header, _ledger = _reload(db_session, detail, header, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("100")
    assert Decimal(str(header.adjusted_stock_in_qty)) == Decimal("0")
    assert db_session.get(StockAdjustment, failed.id).status == "Pending"

    db_session.query(StockLedger).filter(StockLedger.batch == "2024002", StockLedger.quantity == 1).delete()
    db_session.commit()
    approved = _adjustment(
        db_session,
        depot,
        [(product.id, "2024001", "5"), (product.id, "2024002", "-2")],
        number="ADJ-MULTI",
    )
    response = _approve(client, auth_headers, approved.id)
    assert response.status_code == 200, response.text
    detail, header, ledger = _reload(db_session, detail, header, ledger)
    second = db_session.get(ProductItemStockDetail, second.id)
    assert Decimal(str(detail.quantity)) == Decimal("105")
    assert Decimal(str(second.quantity)) == Decimal("38")
    assert Decimal(str(header.stock_qty)) == Decimal("143")
    assert Decimal(str(ledger.quantity)) == Decimal("105")


def test_repeat_and_invalid_status_do_not_post(client, db_session, auth_headers):
    depot, product, header, detail, ledger = _stock(db_session)
    adjustment = _adjustment(db_session, depot, [(product.id, "2024001", "2")], number="ADJ-ONCE")
    assert _approve(client, auth_headers, adjustment.id).status_code == 200
    again = _approve(client, auth_headers, adjustment.id)
    assert again.status_code == 400
    assert again.json()["detail"] == "Only pending adjustments can be approved"
    detail, _header, ledger = _reload(db_session, detail, header, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("102")
    assert Decimal(str(ledger.quantity)) == Decimal("102")

    rejected = _adjustment(
        db_session, depot, [(product.id, "2024001", "9")], number="ADJ-REJECTED", status_value="Rejected"
    )
    response = _approve(client, auth_headers, rejected.id)
    assert response.status_code == 400
    assert response.json()["detail"] == "Only pending adjustments can be approved"
    detail, _header, _ledger = _reload(db_session, detail, header, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("102")


def test_missing_adjustment_product_depot_batch_and_quantity(client, db_session, auth_headers):
    missing = _approve(client, auth_headers, 99999)
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Adjustment not found"

    depot, product, header, detail, ledger = _stock(db_session)
    bad_product = _adjustment(db_session, depot, [(product.id + 50, "2024001", "1")], number="ADJ-PRODUCT")
    response = _approve(client, auth_headers, bad_product.id)
    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"

    bad_depot = _adjustment(db_session, depot, [(product.id, "2024001", "1")], number="ADJ-DEPOT")
    saved = db_session.get(StockAdjustment, bad_depot.id)
    saved.depot_id = depot.id + 99
    db_session.commit()
    response = _approve(client, auth_headers, bad_depot.id)
    assert response.status_code == 404
    assert response.json()["detail"] == "Depot not found"

    blank = _adjustment(db_session, depot, [(product.id, "", "1")], number="ADJ-BATCH")
    response = _approve(client, auth_headers, blank.id)
    assert response.status_code == 400
    assert response.json()["detail"] == "Batch not found"

    absent = _adjustment(db_session, depot, [(product.id, "9999999", "1")], number="ADJ-NO-BATCH")
    response = _approve(client, auth_headers, absent.id)
    assert response.status_code == 404
    assert response.json()["detail"] == "Batch not found"
    assert db_session.query(ProductItemStockDetail).filter(ProductItemStockDetail.batch_no == "9999999").count() == 0

    zero = _adjustment(db_session, depot, [(product.id, "2024001", "0")], number="ADJ-ZERO")
    response = _approve(client, auth_headers, zero.id)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid quantity"

    for row in (bad_product, bad_depot, blank, absent, zero):
        assert db_session.get(StockAdjustment, row.id).status == "Pending"
    detail, _header, ledger = _reload(db_session, detail, header, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("100")
    assert Decimal(str(ledger.quantity)) == Decimal("100")


def test_inconsistent_history_is_not_repaired(client, db_session, auth_headers):
    depot, product, header, detail, ledger = _stock(db_session, quantity="500", available="500", ledger="498")
    small = _adjustment(db_session, depot, [(product.id, "2024001", "-1")], number="ADJ-GAP")
    assert _approve(client, auth_headers, small.id).status_code == 200
    detail, _header, ledger = _reload(db_session, detail, header, ledger)
    assert Decimal(str(detail.quantity)) == Decimal("499")
    assert Decimal(str(ledger.quantity)) == Decimal("497")

    detail.quantity = Decimal("100")
    detail.available_quantity = Decimal("90")
    detail.reserved_quantity = Decimal("0")
    db_session.commit()
    broken = _adjustment(db_session, depot, [(product.id, "2024001", "1")], number="ADJ-BROKEN")
    response = _approve(client, auth_headers, broken.id)
    assert response.status_code == 400
    assert response.json()["detail"] == "Inconsistent inventory balances"
    assert db_session.get(StockAdjustment, broken.id).status == "Pending"


def _posted_quantity(db, detail_id):
    db.expire_all()
    return Decimal(str(db.get(ProductItemStockDetail, detail_id).quantity))


def test_adjustment_types_apply_the_confirmed_direction(client, db_session, auth_headers):
    depot, product, _header, detail, _ledger = _stock(db_session, quantity="100", available="100", reserved="0")
    cases = [
        ("Found", "10", "110", "ADJ-FOUND"),
        ("Write off", "-10", "100", "ADJ-WRITE"),
        ("Damaged", "-10", "90", "ADJ-DAMAGE"),
        ("Expired", "-10", "80", "ADJ-EXPIRE"),
        ("Correction", "10", "90", "ADJ-CORR-UP"),
        ("Correction", "-10", "80", "ADJ-CORR-DOWN"),
    ]
    expected = Decimal("100")
    for adjustment_type, change, after, number in cases:
        created = client.post(
            "/api/stock/adjustments",
            headers=auth_headers,
            json={
                "adjustment_date": "2026-11-19",
                "depot_id": depot.id,
                "adjustment_type": adjustment_type,
                "reason": adjustment_type,
                "status": "Pending",
                "items": [{"product_id": product.id, "batch": "2024001", "quantity_change": change}],
            },
        )
        assert created.status_code == 201, created.text
        approved = _approve(client, auth_headers, created.json()["id"])
        assert approved.status_code == 200, approved.text
        expected = Decimal(after)
        assert _posted_quantity(db_session, detail.id) == expected


def test_invalid_direction_is_rejected_and_pending_rows_stay_unchanged(client, db_session, auth_headers):
    depot, product, _header, detail, _ledger = _stock(db_session, quantity="100", available="70", reserved="30")
    rejected = client.post(
        "/api/stock/adjustments",
        headers=auth_headers,
        json={
            "adjustment_date": "2026-11-19",
            "depot_id": depot.id,
            "adjustment_type": "Write off",
            "reason": "wrong sign",
            "status": "Pending",
            "items": [{"product_id": product.id, "batch": "2024001", "quantity_change": "10"}],
        },
    )
    assert rejected.status_code == 400
    assert rejected.json()["detail"] == "Invalid adjustment direction"
    assert db_session.query(StockAdjustment).count() == 0

    contradictory = _adjustment(
        db_session,
        depot,
        [(product.id, "2024001", "10")],
        number="ADJ-CONTRADICT",
        adjustment_type="Write off",
    )
    response = _approve(client, auth_headers, contradictory.id)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid adjustment direction"
    saved = db_session.get(StockAdjustment, contradictory.id)
    assert saved.status == "Pending"
    assert Decimal(str(saved.items[0].quantity_change)) == Decimal("10")
    assert _posted_quantity(db_session, detail.id) == Decimal("100")

    historical = _adjustment(
        db_session,
        depot,
        [(product.id, "2024001", "10")],
        number="ADJ-HISTORICAL",
        adjustment_type="Damaged",
        status_value="Approved",
    )
    response = _approve(client, auth_headers, historical.id)
    assert response.status_code == 400
    assert response.json()["detail"] == "Only pending adjustments can be approved"
    saved = db_session.get(StockAdjustment, historical.id)
    assert saved.status == "Approved"
    assert Decimal(str(saved.items[0].quantity_change)) == Decimal("10")
    assert _posted_quantity(db_session, detail.id) == Decimal("100")

    unknown = _adjustment(
        db_session,
        depot,
        [(product.id, "2024001", "-5")],
        number="ADJ-QUANTITY",
        adjustment_type="Quantity",
    )
    response = _approve(client, auth_headers, unknown.id)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid adjustment type"
    assert db_session.get(StockAdjustment, unknown.id).status == "Pending"

    reserved = _adjustment(
        db_session,
        depot,
        [(product.id, "2024001", "-80")],
        number="ADJ-RESERVED",
        adjustment_type="Expired",
    )
    response = _approve(client, auth_headers, reserved.id)
    assert response.status_code == 400
    assert response.json()["detail"] == "Insufficient available stock"
    detail_row = db_session.get(ProductItemStockDetail, detail.id)
    assert Decimal(str(detail_row.available_quantity)) == Decimal("70")
    assert Decimal(str(detail_row.reserved_quantity)) == Decimal("30")


def _create_payload(depot_id, product_id, *, status_value=None):
    payload = {
        "adjustment_date": "2026-11-19",
        "depot_id": depot_id,
        "adjustment_type": "Found",
        "reason": "status check",
        "items": [{"product_id": product_id, "batch": "2024001", "quantity_change": "10"}],
    }
    if status_value is not None:
        payload["status"] = status_value
    return payload


def test_create_cannot_bypass_approval_status(client, db_session, auth_headers):
    depot, product, _header, detail, _ledger = _stock(db_session, quantity="100")
    omitted = client.post(
        "/api/stock/adjustments",
        headers=auth_headers,
        json=_create_payload(depot.id, product.id),
    )
    assert omitted.status_code == 201, omitted.text
    assert omitted.json()["status"] == "Pending"

    pending = client.post(
        "/api/stock/adjustments",
        headers=auth_headers,
        json=_create_payload(depot.id, product.id, status_value="Pending"),
    )
    assert pending.status_code == 201, pending.text
    assert pending.json()["status"] == "Pending"

    before = db_session.query(StockAdjustment).count()
    before_items = db_session.query(StockAdjustmentItem).count()
    for blocked in ("Approved", "APPROVED", "Rejected", "Completed"):
        response = client.post(
            "/api/stock/adjustments",
            headers=auth_headers,
            json=_create_payload(depot.id, product.id, status_value=blocked),
        )
        assert response.status_code == 400, response.text
        assert response.json()["detail"] == "Invalid adjustment status"
    assert db_session.query(StockAdjustment).count() == before
    assert db_session.query(StockAdjustmentItem).count() == before_items
    assert _posted_quantity(db_session, detail.id) == Decimal("100")

    wrong_direction = client.post(
        "/api/stock/adjustments",
        headers=auth_headers,
        json={
            **_create_payload(depot.id, product.id, status_value="Pending"),
            "adjustment_type": "Write off",
            "items": [{"product_id": product.id, "batch": "2024001", "quantity_change": "10"}],
        },
    )
    assert wrong_direction.status_code == 400
    assert wrong_direction.json()["detail"] == "Invalid adjustment direction"
    assert db_session.query(StockAdjustmentItem).count() == before_items

    approved = _approve(client, auth_headers, pending.json()["id"])
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "Approved"
    assert _posted_quantity(db_session, detail.id) == Decimal("110")
    again = _approve(client, auth_headers, pending.json()["id"])
    assert again.status_code == 400
    assert _posted_quantity(db_session, detail.id) == Decimal("110")

    missing_update = client.put(
        f"/api/stock/adjustments/{omitted.json()['id']}",
        headers=auth_headers,
        json={"status": "Approved"},
    )
    assert missing_update.status_code == 405
    assert db_session.get(StockAdjustment, omitted.json()["id"]).status == "Pending"


def test_create_list_get_and_delete_remain_available(client, db_session, auth_headers):
    depot, product, *_rest = _stock(db_session, code="M04000999", batch="2024008")
    created = client.post(
        "/api/stock/adjustments",
        headers=auth_headers,
        json={
            "adjustment_date": "2026-11-19",
            "depot_id": depot.id,
            "adjustment_type": "Found",
            "reason": "audit",
            "status": "Pending",
            "items": [{"product_id": product.id, "batch": "2024008", "quantity_change": "1.50"}],
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] == "Pending"
    assert Decimal(body["items"][0]["quantity_change"]) == Decimal("1.50")
    listed = client.get("/api/stock/adjustments", headers=auth_headers)
    assert listed.status_code == 200
    assert any(row["id"] == body["id"] for row in listed.json())
    fetched = client.get(f"/api/stock/adjustments/{body['id']}", headers=auth_headers)
    assert fetched.status_code == 200
    assert fetched.json()["adjustment_number"] == body["adjustment_number"]
    approved = _approve(client, auth_headers, body["id"])
    assert approved.status_code == 200, approved.text
    blocked = client.delete(f"/api/stock/adjustments/{body['id']}", headers=auth_headers)
    assert blocked.status_code == 400
    pending = client.post(
        "/api/stock/adjustments",
        headers=auth_headers,
        json={
            "adjustment_date": "2026-11-19",
            "depot_id": depot.id,
            "adjustment_type": "Write off",
            "reason": "not posted",
            "status": "Pending",
            "items": [{"product_id": product.id, "batch": "2024008", "quantity_change": "-1"}],
        },
    )
    assert pending.status_code == 201
    deleted = client.delete(f"/api/stock/adjustments/{pending.json()['id']}", headers=auth_headers)
    assert deleted.status_code == 204
