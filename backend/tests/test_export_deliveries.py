"""Export Draft persistence. No stock, billing, or commercial-order side effects."""
from datetime import date
from decimal import Decimal

from sqlalchemy import func

from app.auth import get_password_hash
from app.models import (
    CollectionDeposit,
    Depot,
    Employee,
    ExportDelivery,
    Invoice,
    Order,
    OrderStatusEnum,
    Product,
    ProductItemStock,
    ProductItemStockDetail,
    SampleGiftDelivery,
    StockIssuance,
    StockLedger,
)
from app.models_platform import OrderBatchAllocation


def _depot_product(db_session, suffix="1"):
    depot = Depot(name=f"EX Depot {suffix}", code=f"EXD-{suffix}")
    db_session.add(depot)
    db_session.flush()
    product = Product(
        name=f"Export SKU {suffix}",
        code=f"EXSKU-{suffix}",
        sku=f"EXSKU-{suffix}",
        product_type_export=True,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(depot)
    db_session.refresh(product)
    return depot, product


def _payload(product_id, **overrides):
    body = {
        "delivery_date": date.today().isoformat(),
        "destination_country": "Malaysia",
        "port_of_loading": "Chattogram",
        "port_of_discharge": "Port Klang",
        "shipping_line": "Maersk Line",
        "container_number": "MSKU1234567",
        "bl_number": "BL-1",
        "invoice_number": "INV-REF-1",
        "lc_number": "LC-1",
        "incoterms": "FOB",
        "payment_terms": "LC",
        "remarks": "Draft only",
        "items": [
            {
                "product_id": product_id,
                "quantity": "2.50",
                "unit_price": "10.25",
                "batch_number": "B1",
                "hsn_code": "3004",
            }
        ],
    }
    body.update(overrides)
    return body


def _stock_snapshot(db):
    return {
        "ledger_available": db.query(func.coalesce(func.sum(StockLedger.available_quantity), 0)).scalar(),
        "pisd_available": db.query(func.coalesce(func.sum(ProductItemStockDetail.available_quantity), 0)).scalar(),
        "pis_stock": db.query(func.coalesce(func.sum(ProductItemStock.stock_qty), 0)).scalar(),
        "allocations": db.query(OrderBatchAllocation).count(),
        "orders": db.query(Order).count(),
        "invoices": db.query(Invoice).count(),
        "issuances": db.query(StockIssuance).count(),
        "deposits": db.query(CollectionDeposit).count(),
    }


def test_create_list_get_update_draft_and_decimal_total(client, auth_headers, db_session):
    depot, product = _depot_product(db_session)
    before = _stock_snapshot(db_session)
    created = client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, delivery_number="EX-TEST-1"),
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] == "Draft"
    assert body["delivery_number"] == "EX-TEST-1"
    assert body["destination_country"] == "Malaysia"
    assert body["total_items"] == 1
    assert Decimal(str(body["total_quantity"])) == Decimal("2.50")
    assert Decimal(str(body["total_value"])) == Decimal("25.625")
    assert Decimal(str(body["items"][0]["line_total"])) == Decimal("25.625")
    cid = body["id"]

    listed = client.get("/api/export-deliveries", headers=auth_headers)
    assert listed.status_code == 200
    assert any(row["id"] == cid for row in listed.json())

    detail = client.get(f"/api/export-deliveries/{cid}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["items"][0]["product_id"] == product.id

    updated = client.put(
        f"/api/export-deliveries/{cid}",
        json=_payload(
            product.id,
            depot_id=depot.id,
            delivery_number="EX-TEST-1",
            destination_country="Singapore",
        ),
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["destination_country"] == "Singapore"

    db_session.expire_all()
    stored = db_session.query(ExportDelivery).filter(ExportDelivery.id == cid).first()
    assert stored is not None
    assert stored.destination_country == "Singapore"
    assert _stock_snapshot(db_session) == before


def test_duplicate_number_and_validation(client, auth_headers, db_session):
    depot, product = _depot_product(db_session, "2")
    first = client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, delivery_number="EX-DUP"),
        headers=auth_headers,
    )
    assert first.status_code == 201
    second = client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, delivery_number="EX-DUP"),
        headers=auth_headers,
    )
    assert second.status_code == 409
    assert client.post(
        "/api/export-deliveries",
        json=_payload(99999, depot_id=depot.id),
        headers=auth_headers,
    ).status_code == 400
    assert client.post(
        "/api/export-deliveries",
        json=_payload(
            product.id,
            depot_id=depot.id,
            items=[{"product_id": product.id, "quantity": 0, "unit_price": "1"}],
        ),
    ).status_code == 401
    assert client.post(
        "/api/export-deliveries",
        json=_payload(
            product.id,
            depot_id=depot.id,
            items=[{"product_id": product.id, "quantity": 0, "unit_price": "1"}],
        ),
        headers=auth_headers,
    ).status_code == 422
    assert client.post(
        "/api/export-deliveries",
        json=_payload(
            product.id,
            depot_id=depot.id,
            items=[{"product_id": product.id, "quantity": "1", "unit_price": "-1"}],
        ),
        headers=auth_headers,
    ).status_code == 422
    assert client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, destination_country=""),
        headers=auth_headers,
    ).status_code == 422
    assert client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, items=[]),
        headers=auth_headers,
    ).status_code == 422
    assert client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, incoterms="XYZ"),
        headers=auth_headers,
    ).status_code == 422
    assert db_session.query(ExportDelivery).count() == 1


def test_admin_without_depot_rejected(client, auth_headers, db_session):
    _depot, product = _depot_product(db_session, "3")
    resp = client.post(
        "/api/export-deliveries",
        json=_payload(product.id),
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "depot" in resp.json()["detail"].lower()
    assert db_session.query(ExportDelivery).count() == 0


def test_user_forbidden_and_unauthenticated(client, user_auth_headers, auth_headers, db_session):
    depot, product = _depot_product(db_session, "4")
    assert client.get("/api/export-deliveries").status_code == 401
    assert client.post("/api/export-deliveries", json=_payload(product.id, depot_id=depot.id)).status_code == 401
    assert client.get("/api/export-deliveries", headers=user_auth_headers).status_code == 200
    assert client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id),
        headers=user_auth_headers,
    ).status_code == 403
    created = client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, delivery_number="EX-AUTH"),
        headers=auth_headers,
    )
    assert created.status_code == 201
    cid = created.json()["id"]
    assert client.put(
        f"/api/export-deliveries/{cid}",
        json=_payload(product.id, depot_id=depot.id, destination_country="India"),
        headers=user_auth_headers,
    ).status_code == 403


def test_foreign_depot_404(client, auth_headers, db_session):
    depot_a, product = _depot_product(db_session, "A")
    depot_b = Depot(name="Other", code="EXD-B")
    db_session.add(depot_b)
    manager = Employee(
        employee_id="MGR-EX",
        first_name="Mgr",
        email="mgr-ex@test.com",
        hashed_password=get_password_hash("manager123"),
        role="manager",
        depot_id=depot_b.id,
        is_active=True,
        is_blocked=False,
    )
    db_session.add(manager)
    db_session.commit()
    created = client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot_a.id, delivery_number="EX-FOR"),
        headers=auth_headers,
    )
    assert created.status_code == 201
    cid = created.json()["id"]
    login = client.post(
        "/api/auth/login",
        json={"email": "mgr-ex@test.com", "password": "manager123", "remember_me": False},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get(f"/api/export-deliveries/{cid}", headers=headers).status_code == 404
    listed = client.get("/api/export-deliveries", headers=headers)
    assert listed.status_code == 200
    assert listed.json() == []
    assert client.put(
        f"/api/export-deliveries/{cid}",
        json=_payload(product.id, depot_id=depot_b.id, destination_country="Nepal"),
        headers=headers,
    ).status_code == 404


def test_invalid_item_does_not_persist_header(client, auth_headers, db_session):
    depot, product = _depot_product(db_session, "5")
    before = db_session.query(ExportDelivery).count()
    resp = client.post(
        "/api/export-deliveries",
        json=_payload(
            product.id,
            depot_id=depot.id,
            items=[
                {"product_id": product.id, "quantity": "1", "unit_price": "1"},
                {"product_id": 99999, "quantity": "1", "unit_price": "1"},
            ],
        ),
        headers=auth_headers,
    )
    assert resp.status_code == 400
    db_session.expire_all()
    assert db_session.query(ExportDelivery).count() == before


def test_writes_disabled_by_flag(client, auth_headers, db_session, monkeypatch):
    from app.core.config import get_settings

    depot, product = _depot_product(db_session, "6")
    monkeypatch.setenv("EXPORT_DRAFT_WRITES", "no")
    get_settings.cache_clear()
    try:
        resp = client.post(
            "/api/export-deliveries",
            json=_payload(product.id, depot_id=depot.id),
            headers=auth_headers,
        )
        assert resp.status_code == 403
    finally:
        monkeypatch.delenv("EXPORT_DRAFT_WRITES", raising=False)
        get_settings.cache_clear()


def test_does_not_change_commercial_orders_or_sample_gift(client, auth_headers, db_session):
    depot, product = _depot_product(db_session, "7")
    db_session.add(
        Order(
            order_number="ORD-EX-SAFE",
            customer_id="C1",
            customer_name="Cust",
            pso_id="P1",
            pso_name="PSO",
            delivery_date=date.today(),
            status=OrderStatusEnum.DRAFT,
            validated=False,
        )
    )
    db_session.commit()
    before_orders = db_session.query(Order).count()
    before_sg = db_session.query(SampleGiftDelivery).count()
    client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, delivery_number="EX-SAFE"),
        headers=auth_headers,
    )
    db_session.expire_all()
    assert db_session.query(Order).count() == before_orders
    assert db_session.query(SampleGiftDelivery).count() == before_sg
    assert db_session.query(Order).filter(Order.order_number == "ORD-EX-SAFE").first() is not None


def test_put_conflict_when_not_draft(client, auth_headers, db_session, admin_user):
    from app.services.draft_status_transition import apply_transition

    depot, product = _depot_product(db_session, "lock")
    created = client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, delivery_number="EX-LOCK", destination_country="Malaysia"),
        headers=auth_headers,
    )
    assert created.status_code == 201
    cid = created.json()["id"]
    apply_transition(db_session, "export", cid, "submit", admin_user)
    db_session.commit()
    resp = client.put(
        f"/api/export-deliveries/{cid}",
        json=_payload(product.id, depot_id=depot.id, delivery_number="EX-LOCK", destination_country="Singapore"),
        headers=auth_headers,
    )
    assert resp.status_code == 409
    db_session.expire_all()
    stored = db_session.query(ExportDelivery).filter(ExportDelivery.id == cid).first()
    assert stored.status == "Submitted"
    assert stored.destination_country == "Malaysia"


def test_put_validation_does_not_partially_update(client, auth_headers, db_session):
    depot, product = _depot_product(db_session, "putval")
    created = client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, delivery_number="EX-PUT-A", destination_country="Malaysia"),
        headers=auth_headers,
    )
    assert created.status_code == 201
    cid = created.json()["id"]
    client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, delivery_number="EX-PUT-B"),
        headers=auth_headers,
    )
    assert client.put(
        f"/api/export-deliveries/{cid}",
        json=_payload(product.id, depot_id=depot.id, items=[{"product_id": 99999, "quantity": "1"}]),
        headers=auth_headers,
    ).status_code == 400
    assert client.put(
        f"/api/export-deliveries/{cid}",
        json=_payload(
            product.id,
            depot_id=depot.id,
            items=[{"product_id": product.id, "quantity": "0"}],
        ),
        headers=auth_headers,
    ).status_code == 422
    assert client.put(
        f"/api/export-deliveries/{cid}",
        json=_payload(product.id, depot_id=depot.id, delivery_number="EX-PUT-B", destination_country="Singapore"),
        headers=auth_headers,
    ).status_code == 409
    db_session.expire_all()
    stored = db_session.query(ExportDelivery).filter(ExportDelivery.id == cid).first()
    assert stored.destination_country == "Malaysia"
    assert stored.delivery_number == "EX-PUT-A"
    assert len(stored.items) == 1


def test_put_replace_failure_rolls_back(client, auth_headers, db_session, monkeypatch):
    from sqlalchemy.exc import OperationalError
    from app.routers import export_deliveries as ex

    depot, product = _depot_product(db_session, "putfail")
    created = client.post(
        "/api/export-deliveries",
        json=_payload(product.id, depot_id=depot.id, delivery_number="EX-PUT-FAIL", destination_country="Malaysia"),
        headers=auth_headers,
    )
    assert created.status_code == 201
    cid = created.json()["id"]

    def boom(*_args, **_kwargs):
        raise OperationalError("flush", {}, Exception("synthetic flush failure"))

    monkeypatch.setattr(ex, "_replace_items", boom)
    resp = client.put(
        f"/api/export-deliveries/{cid}",
        json=_payload(product.id, depot_id=depot.id, destination_country="Singapore"),
        headers=auth_headers,
    )
    assert resp.status_code == 500
    assert resp.json()["detail"] == "The document could not be saved"
    assert "synthetic" not in resp.text.lower()
    db_session.expire_all()
    stored = db_session.query(ExportDelivery).filter(ExportDelivery.id == cid).first()
    assert stored.destination_country == "Malaysia"
    assert len(stored.items) == 1
