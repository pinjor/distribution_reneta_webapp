from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from app.auth import get_password_hash
from app.models import Depot, Employee, Product, ProductItemStock, StockLedger
from app.models_opening_stock import OpeningStockRequest


def _headers(client, email, password):
    resp = client.post("/api/auth/login", json={"email": email, "password": password, "remember_me": False})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture
def catalog(db_session: Session):
    depot_a = Depot(name="Opening A", code="OSA")
    depot_b = Depot(name="Opening B", code="OSB")
    product = Product(name="Open Product", code="OP-1", sku="SKU-OP-1", unit_of_measure="PCS", is_active=True)
    db_session.add_all([depot_a, depot_b, product])
    db_session.commit()
    db_session.refresh(depot_a)
    db_session.refresh(depot_b)
    db_session.refresh(product)
    return {"a": depot_a, "b": depot_b, "product": product}


@pytest.fixture
def warehouse_user(db_session: Session, catalog):
    user = Employee(
        employee_id="OSU001",
        first_name="Warehouse",
        last_name="User",
        email="os-user@test.com",
        hashed_password=get_password_hash("user123"),
        role="user",
        depot_id=catalog["a"].id,
        is_active=True,
        is_blocked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def manager_user(db_session: Session, catalog):
    user = Employee(
        employee_id="OSM001",
        first_name="Manager",
        last_name="User",
        email="os-manager@test.com",
        hashed_password=get_password_hash("mgr123"),
        role="manager",
        depot_id=catalog["a"].id,
        is_active=True,
        is_blocked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_b(db_session: Session):
    user = Employee(
        employee_id="OSA002",
        first_name="Second",
        last_name="Admin",
        email="os-admin2@test.com",
        hashed_password=get_password_hash("admin123"),
        role="admin",
        is_active=True,
        is_blocked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _line(product_id, qty=500, batch="B1", expiry=None, mfg=None, uom="PCS"):
    expiry = expiry or (date.today() + timedelta(days=400)).isoformat()
    return {
        "productId": product_id,
        "batchNumber": batch,
        "manufacturingDate": mfg or (date.today() - timedelta(days=10)).isoformat(),
        "expiryDate": expiry,
        "quantity": qty,
        "unitOfMeasure": uom,
    }


def _create(client, headers, catalog, **overrides):
    body = {
        "depotId": catalog["a"].id,
        "openingDate": date.today().isoformat(),
        "remarks": "new depot start",
        "items": [_line(catalog["product"].id)],
    }
    body.update(overrides)
    return client.post("/api/opening-stock", json=body, headers=headers)


def test_create_edit_submit_reject(client, admin_user, admin_b, catalog, warehouse_user, db_session):
    user_h = _headers(client, "os-user@test.com", "user123")
    created = _create(client, user_h, catalog)
    assert created.status_code == 201, created.text
    data = created.json()
    assert data["status"] == "Draft"
    assert data["postingStatus"] == "not_posted"
    request_id = data["id"]

    patched = client.patch(
        f"/api/opening-stock/{request_id}",
        json={"remarks": "updated", "items": [_line(catalog["product"].id, qty=80, batch="B2")]},
        headers=user_h,
    )
    assert patched.status_code == 200
    assert patched.json()["totalQuantity"] == 80

    submitted = client.post(f"/api/opening-stock/{request_id}/submit", headers=user_h)
    assert submitted.status_code == 200
    assert submitted.json()["status"] == "Pending Approval"

    admin_h = _headers(client, "admin@test.com", "admin123")
    rejected = client.post(
        f"/api/opening-stock/{request_id}/reject",
        json={"reason": "quantities not verified"},
        headers=admin_h,
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "Rejected"
    assert db_session.query(ProductItemStock).count() == 0
    assert db_session.query(StockLedger).count() == 0


def test_unauthorized_and_self_approval(client, admin_user, catalog, warehouse_user, manager_user, db_session):
    user_h = _headers(client, "os-user@test.com", "user123")
    created = _create(client, user_h, catalog)
    request_id = created.json()["id"]
    client.post(f"/api/opening-stock/{request_id}/submit", headers=user_h)

    mgr_h = _headers(client, "os-manager@test.com", "mgr123")
    unauth = client.post(f"/api/opening-stock/{request_id}/approve", headers=mgr_h)
    assert unauth.status_code == 403

    other_product = Product(name="Self Product", code="OP-SELF", sku="SKU-OP-SELF", unit_of_measure="PCS", is_active=True)
    db_session.add(other_product)
    db_session.commit()
    db_session.refresh(other_product)
    admin_creates = _create(client, _headers(client, "admin@test.com", "admin123"), catalog, items=[_line(other_product.id, batch="SELF")])
    admin_id = admin_creates.json()["id"]
    client.post(f"/api/opening-stock/{admin_id}/submit", headers=_headers(client, "admin@test.com", "admin123"))
    self_approve = client.post(f"/api/opening-stock/{admin_id}/approve", headers=_headers(client, "admin@test.com", "admin123"))
    assert self_approve.status_code == 403
    assert self_approve.json()["detail"]["code"] == "SELF_APPROVAL_BLOCKED"


def test_foreign_depot_hidden(client, catalog, warehouse_user, db_session):
    other = Employee(
        employee_id="OSU002",
        first_name="Other",
        last_name="Depot",
        email="os-other@test.com",
        hashed_password=get_password_hash("user123"),
        role="user",
        depot_id=catalog["b"].id,
        is_active=True,
        is_blocked=False,
    )
    db_session.add(other)
    db_session.commit()
    user_h = _headers(client, "os-user@test.com", "user123")
    created = _create(client, user_h, catalog)
    other_h = _headers(client, "os-other@test.com", "user123")
    hidden = client.get(f"/api/opening-stock/{created.json()['id']}", headers=other_h)
    assert hidden.status_code == 404
    listed = client.get("/api/opening-stock", headers=other_h)
    assert listed.json()["total"] == 0
    foreign_create = _create(client, other_h, catalog)
    assert foreign_create.status_code == 403


def test_duplicate_and_history_block(client, admin_user, catalog, warehouse_user, db_session):
    user_h = _headers(client, "os-user@test.com", "user123")
    first = _create(client, user_h, catalog)
    client.post(f"/api/opening-stock/{first.json()['id']}/submit", headers=user_h)
    second = _create(client, user_h, catalog, items=[_line(catalog["product"].id, batch="B9")])
    assert second.status_code == 409
    assert second.json()["detail"]["code"] == "OPENING_ALREADY_EXISTS"

    product_b = Product(name="Historic", code="OP-H", sku="SKU-OP-H", unit_of_measure="PCS", is_active=True)
    db_session.add(product_b)
    db_session.commit()
    db_session.refresh(product_b)
    db_session.add(StockLedger(product_id=product_b.id, depot_id=catalog["a"].id, quantity=0, available_quantity=0, batch="OLD"))
    db_session.commit()
    historic = _create(client, user_h, catalog, items=[_line(product_b.id, batch="NEW")])
    assert historic.status_code == 409
    assert historic.json()["detail"]["code"] == "STOCK_HISTORY_EXISTS"


def test_expiry_and_quantity_validation(client, catalog, warehouse_user):
    user_h = _headers(client, "os-user@test.com", "user123")
    zero = _create(client, user_h, catalog, items=[_line(catalog["product"].id, qty=0)])
    assert zero.status_code == 400
    expired = _create(
        client,
        user_h,
        catalog,
        items=[_line(catalog["product"].id, expiry=(date.today() - timedelta(days=1)).isoformat())],
    )
    assert expired.status_code == 400
    unknown = client.post(
        "/api/opening-stock",
        json={
            "depotId": catalog["a"].id,
            "openingDate": date.today().isoformat(),
            "items": [{"productId": catalog["product"].id, "batchNumber": "X", "quantity": 1}],
        },
        headers=user_h,
    )
    assert unknown.status_code == 422


def test_approve_does_not_post_and_is_idempotent(client, admin_user, admin_b, catalog, warehouse_user, db_session):
    user_h = _headers(client, "os-user@test.com", "user123")
    created = _create(client, user_h, catalog)
    request_id = created.json()["id"]
    client.post(f"/api/opening-stock/{request_id}/submit", headers=user_h)
    admin2 = _headers(client, "os-admin2@test.com", "admin123")
    first = client.post(f"/api/opening-stock/{request_id}/approve", headers=admin2)
    assert first.status_code == 200
    body = first.json()
    assert body["status"] == "Approved"
    assert body["postingStatus"] == "not_posted"
    assert body["inventoryPosted"] is False
    second = client.post(f"/api/opening-stock/{request_id}/approve", headers=admin2)
    assert second.status_code == 200
    assert db_session.query(ProductItemStock).count() == 0
    assert db_session.query(StockLedger).count() == 0
    assert db_session.query(OpeningStockRequest).filter_by(id=request_id).one().posting_status == "not_posted"


def test_summary_and_pagination(client, admin_user, catalog, warehouse_user):
    user_h = _headers(client, "os-user@test.com", "user123")
    _create(client, user_h, catalog)
    listed = client.get("/api/opening-stock?limit=1", headers=user_h)
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    summary = client.get("/api/opening-stock/summary", headers=user_h)
    assert summary.json()["total"] == 1
    assert summary.json()["draft"] == 1
