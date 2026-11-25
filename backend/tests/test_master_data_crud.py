"""Master-data CRUD, auth, depot isolation, and referential-integrity tests."""
from datetime import date

from app.auth import get_password_hash
from app.models import Company, Depot, Employee, StockReceipt, Vendor


def _manager_headers(client, db_session, depot_id=None):
    manager = Employee(
        employee_id="MGR-E2",
        first_name="Mgr",
        last_name="E2",
        email="manager-e2@test.com",
        hashed_password=get_password_hash("manager123"),
        role="manager",
        depot_id=depot_id,
        is_active=True,
        is_blocked=False,
    )
    db_session.add(manager)
    db_session.commit()
    login = client.post(
        "/api/auth/login",
        json={"email": "manager-e2@test.com", "password": "manager123", "remember_me": False},
    )
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _company(client, headers, code="COMP-E2-1"):
    return client.post(
        "/api/companies",
        json={"name": "E2 Company", "code": code, "is_active": True},
        headers=headers,
    )


def test_companies_crud_and_duplicate(client, auth_headers, db_session):
    created = _company(client, auth_headers)
    assert created.status_code == 201
    company_id = created.json()["id"]
    listed = client.get("/api/companies", headers=auth_headers)
    assert listed.status_code == 200
    assert any(row["id"] == company_id for row in listed.json())
    detail = client.get(f"/api/companies/{company_id}", headers=auth_headers)
    assert detail.status_code == 200
    updated = client.put(f"/api/companies/{company_id}", json={"city": "Dhaka"}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["city"] == "Dhaka"
    db_session.expire_all()
    assert db_session.query(Company).filter(Company.id == company_id).first().city == "Dhaka"
    dup = _company(client, auth_headers, code="COMP-E2-1")
    assert dup.status_code == 400
    deleted = client.delete(f"/api/companies/{company_id}", headers=auth_headers)
    assert deleted.status_code == 200
    db_session.expire_all()
    assert db_session.query(Company).filter(Company.id == company_id).first() is None


def test_company_write_forbidden_for_user(client, user_auth_headers):
    assert client.get("/api/companies", headers=user_auth_headers).status_code == 200
    resp = client.post("/api/companies", json={"name": "X", "code": "NOPE"}, headers=user_auth_headers)
    assert resp.status_code == 403


def test_company_delete_blocked_when_depot_exists(client, auth_headers):
    company = _company(client, auth_headers, code="COMP-DEP").json()
    depot = client.post(
        "/api/depots",
        json={"name": "Linked Depot", "code": "DEP-LINK", "company_id": company["id"]},
        headers=auth_headers,
    )
    assert depot.status_code == 201
    blocked = client.delete(f"/api/companies/{company['id']}", headers=auth_headers)
    assert blocked.status_code == 409


def test_depots_crud_duplicate_and_auth(client, auth_headers, user_auth_headers, db_session):
    company = _company(client, auth_headers, code="COMP-DEP2").json()
    created = client.post(
        "/api/depots",
        json={"name": "Depot One", "code": "DEP-E2-1", "company_id": company["id"], "city": "Dhaka"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    depot_id = created.json()["id"]
    assert client.get("/api/depots", headers=auth_headers).status_code == 200
    assert client.get(f"/api/depots/{depot_id}", headers=auth_headers).json()["code"] == "DEP-E2-1"
    updated = client.put(f"/api/depots/{depot_id}", json={"city": "Khulna"}, headers=auth_headers)
    assert updated.status_code == 200
    db_session.expire_all()
    assert db_session.query(Depot).filter(Depot.id == depot_id).first().city == "Khulna"
    dup = client.post(
        "/api/depots",
        json={"name": "Other", "code": "DEP-E2-1", "company_id": company["id"]},
        headers=auth_headers,
    )
    assert dup.status_code == 400
    assert client.post(
        "/api/depots",
        json={"name": "X", "code": "DEP-USER", "company_id": company["id"]},
        headers=user_auth_headers,
    ).status_code == 403
    assert client.delete(f"/api/depots/{depot_id}", headers=user_auth_headers).status_code == 403
    deleted = client.delete(f"/api/depots/{depot_id}", headers=auth_headers)
    assert deleted.status_code == 200


def test_depot_delete_blocked_by_employee(client, auth_headers, db_session):
    company = _company(client, auth_headers, code="COMP-EMP").json()
    depot = client.post(
        "/api/depots",
        json={"name": "Busy Depot", "code": "DEP-BUSY", "company_id": company["id"]},
        headers=auth_headers,
    ).json()
    db_session.add(
        Employee(
            employee_id="EMP-BUSY",
            first_name="Busy",
            email="busy@test.com",
            hashed_password=get_password_hash("x"),
            role="user",
            depot_id=depot["id"],
            is_active=True,
        )
    )
    db_session.commit()
    blocked = client.delete(f"/api/depots/{depot['id']}", headers=auth_headers)
    assert blocked.status_code == 409


def test_depot_isolation_returns_404(client, auth_headers, db_session):
    company = _company(client, auth_headers, code="COMP-ISO").json()
    depot_a = client.post(
        "/api/depots",
        json={"name": "A", "code": "DEP-ISO-A", "company_id": company["id"]},
        headers=auth_headers,
    ).json()
    depot_b = client.post(
        "/api/depots",
        json={"name": "B", "code": "DEP-ISO-B", "company_id": company["id"]},
        headers=auth_headers,
    ).json()
    headers = _manager_headers(client, db_session, depot_id=depot_a["id"])
    listed = client.get("/api/depots", headers=headers)
    assert listed.status_code == 200
    ids = {row["id"] for row in listed.json()}
    assert depot_a["id"] in ids
    assert depot_b["id"] not in ids
    assert client.get(f"/api/depots/{depot_b['id']}", headers=headers).status_code == 404
    assert client.put(f"/api/depots/{depot_b['id']}", json={"city": "X"}, headers=headers).status_code == 404
    point = client.post(
        "/api/shipping-points",
        json={"name": "Point B", "code": "SP-B", "depot_id": depot_b["id"]},
        headers=auth_headers,
    ).json()
    assert client.get(f"/api/shipping-points/{point['id']}", headers=headers).status_code == 404


def test_vendors_crud_duplicate_and_conflict(client, auth_headers, user_auth_headers, db_session):
    created = client.post(
        "/api/vendors",
        json={"name": "Vendor E2", "code": "VEND-E2-1", "email": "v@test.com"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    vendor_id = created.json()["id"]
    assert client.get(f"/api/vendors/{vendor_id}", headers=auth_headers).status_code == 200
    updated = client.put(f"/api/vendors/{vendor_id}", json={"city": "Dhaka"}, headers=auth_headers)
    assert updated.status_code == 200
    db_session.expire_all()
    assert db_session.query(Vendor).filter(Vendor.id == vendor_id).first().city == "Dhaka"
    assert client.post(
        "/api/vendors", json={"name": "Dup", "code": "VEND-E2-1"}, headers=auth_headers
    ).status_code == 400
    assert client.post("/api/vendors", json={"name": "Nope"}, headers=user_auth_headers).status_code == 403
    assert client.get("/api/vendors/99999", headers=auth_headers).status_code == 404
    company = _company(client, auth_headers, code="COMP-V").json()
    depot = client.post(
        "/api/depots",
        json={"name": "V Depot", "code": "DEP-V", "company_id": company["id"]},
        headers=auth_headers,
    ).json()
    db_session.add(
        StockReceipt(
            receipt_number="RCV-E2",
            receipt_date=date.today(),
            depot_id=depot["id"],
            vendor_id=vendor_id,
        )
    )
    db_session.commit()
    assert client.delete(f"/api/vendors/{vendor_id}", headers=auth_headers).status_code == 409


def test_vendors_require_auth(client):
    assert client.get("/api/vendors").status_code == 401
    assert client.post("/api/vendors", json={"name": "X"}).status_code == 401


def test_shipping_points_crud_and_fk(client, auth_headers, user_auth_headers):
    company = _company(client, auth_headers, code="COMP-SP").json()
    depot = client.post(
        "/api/depots",
        json={"name": "SP Depot", "code": "DEP-SP", "company_id": company["id"]},
        headers=auth_headers,
    ).json()
    created = client.post(
        "/api/shipping-points",
        json={"name": "Point 1", "code": "SP-E2-1", "depot_id": depot["id"], "city": "Dhaka"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    point_id = created.json()["id"]
    assert client.get(f"/api/shipping-points/{point_id}", headers=auth_headers).status_code == 200
    updated = client.put(
        f"/api/shipping-points/{point_id}", json={"city": "Khulna"}, headers=auth_headers
    )
    assert updated.status_code == 200
    assert client.post(
        "/api/shipping-points",
        json={"name": "Dup", "code": "SP-E2-1", "depot_id": depot["id"]},
        headers=auth_headers,
    ).status_code == 400
    assert client.post(
        "/api/shipping-points",
        json={"name": "Bad depot", "code": "SP-BAD", "depot_id": 99999},
        headers=auth_headers,
    ).status_code == 400
    assert client.post(
        "/api/shipping-points",
        json={"name": "Nope", "code": "SP-U", "depot_id": depot["id"]},
        headers=user_auth_headers,
    ).status_code == 403
    assert client.delete(f"/api/shipping-points/{point_id}", headers=auth_headers).status_code == 200


def test_routes_crud_duplicate_and_conflict(client, auth_headers, user_auth_headers):
    company = _company(client, auth_headers, code="COMP-RT").json()
    depot = client.post(
        "/api/depots",
        json={"name": "RT Depot", "code": "DEP-RT", "company_id": company["id"]},
        headers=auth_headers,
    ).json()
    created = client.post(
        "/api/routes",
        json={"route_id": "20099", "name": "Test Route", "depot_id": depot["id"]},
        headers=auth_headers,
    )
    assert created.status_code == 201
    assert created.json()["code"] == "20099"
    route_id = created.json()["id"]
    assert client.get(f"/api/routes/{route_id}", headers=auth_headers).status_code == 200
    updated = client.put(f"/api/routes/{route_id}", json={"name": "Renamed"}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["name"] == "Renamed"
    assert client.post(
        "/api/routes",
        json={"route_id": "20099", "name": "Dup", "depot_id": depot["id"]},
        headers=auth_headers,
    ).status_code == 400
    assert client.post(
        "/api/routes",
        json={"route_id": "20100", "name": "Nope", "depot_id": depot["id"]},
        headers=user_auth_headers,
    ).status_code == 403
    point = client.post(
        "/api/shipping-points",
        json={"name": "Linked SP", "code": "SP-RT", "depot_id": depot["id"]},
        headers=auth_headers,
    ).json()
    linked = client.post(
        "/api/route-shipping-points",
        json={"route_id": route_id, "shipping_point_id": point["id"], "distance_km": 1.5, "sequence": 1},
        headers=auth_headers,
    )
    assert linked.status_code in (200, 201)
    assert client.delete(f"/api/routes/{route_id}", headers=auth_headers).status_code == 409
    assert client.delete(f"/api/shipping-points/{point['id']}", headers=auth_headers).status_code == 409


def test_stock_adjustment_detail(client, auth_headers, user_auth_headers):
    company = _company(client, auth_headers, code="COMP-ADJ").json()
    depot = client.post(
        "/api/depots",
        json={"name": "Adj Depot", "code": "DEP-ADJ", "company_id": company["id"]},
        headers=auth_headers,
    ).json()
    created = client.post(
        "/api/stock/adjustments",
        json={
            "adjustment_date": str(date.today()),
            "depot_id": depot["id"],
            "adjustment_type": "Increase",
            "reason": "E2 test",
            "items": [{"product_id": 1, "batch": "123", "quantity_change": 1}],
        },
        headers=auth_headers,
    )
    assert created.status_code == 201
    adj_id = created.json()["id"]
    detail = client.get(f"/api/stock/adjustments/{adj_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["id"] == adj_id
    assert len(detail.json().get("items") or []) == 1
    assert client.get("/api/stock/adjustments/99999", headers=auth_headers).status_code == 404
    assert client.get(f"/api/stock/adjustments/{adj_id}").status_code == 401


def test_missing_and_invalid_input(client, auth_headers):
    assert client.post("/api/companies", json={"code": "X"}, headers=auth_headers).status_code == 422
    assert client.post("/api/depots", json={"name": "X"}, headers=auth_headers).status_code == 422
    assert client.get("/api/companies/99999", headers=auth_headers).status_code == 404
    assert client.get("/api/routes/99999", headers=auth_headers).status_code == 404
