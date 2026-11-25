"""Negative authorization for catalog writes tightened in Phase E.3."""


def test_customer_writes_forbidden_for_user(client, user_auth_headers, auth_headers):
    assert client.get("/api/customers", headers=user_auth_headers).status_code == 200
    assert client.post(
        "/api/customers", json={"name": "Blocked"}, headers=user_auth_headers
    ).status_code == 403
    created = client.post("/api/customers", json={"name": "Admin Cust", "code": "CUST-AUTH1"}, headers=auth_headers)
    assert created.status_code == 200
    cid = created.json()["id"]
    assert client.put(f"/api/customers/{cid}", json={"name": "X"}, headers=user_auth_headers).status_code == 403
    assert client.delete(f"/api/customers/{cid}", headers=user_auth_headers).status_code == 403


def test_product_uom_packaging_price_forbidden_for_user(client, user_auth_headers):
    assert client.get("/api/products", headers=user_auth_headers).status_code == 200
    assert client.get("/api/uoms", headers=user_auth_headers).status_code == 200
    assert client.post("/api/products", json={"name": "Nope"}, headers=user_auth_headers).status_code == 403
    assert client.post(
        "/api/uoms", json={"code": "UOM-X", "name": "Box"}, headers=user_auth_headers
    ).status_code == 403
    assert client.post(
        "/api/primary-packagings",
        json={"code": "PP-X", "name": "Blister"},
        headers=user_auth_headers,
    ).status_code == 403
    assert client.post(
        "/api/price-setups",
        json={"code": "PRICE-X", "product_id": 1},
        headers=user_auth_headers,
    ).status_code == 403


def test_route_shipping_point_writes_forbidden_for_user(client, user_auth_headers):
    assert client.get("/api/route-shipping-points", headers=user_auth_headers).status_code == 200
    assert client.post(
        "/api/route-shipping-points",
        json={"route_id": 1, "shipping_point_id": 1, "distance_km": 1, "sequence": 1},
        headers=user_auth_headers,
    ).status_code == 403


def test_employee_writes_still_require_admin_users(client, user_auth_headers):
    """Ordinary user must not administer employees. Manager is not granted admin.users."""
    body = {
        "employee_id": "E3-NO",
        "first_name": "No",
        "email": "no-admin@test.com",
        "role": "user",
    }
    assert client.post("/api/employees", json=body, headers=user_auth_headers).status_code == 403


def test_manager_cannot_administer_employees(client, db_session):
    """Employee writes stay on admin.users. Manager is not granted that permission."""
    from app.auth import get_password_hash
    from app.models import Employee

    db_session.add(
        Employee(
            employee_id="MGR-E3",
            first_name="Mgr",
            email="manager-e3@test.com",
            hashed_password=get_password_hash("manager123"),
            role="manager",
            is_active=True,
            is_blocked=False,
        )
    )
    db_session.commit()
    login = client.post(
        "/api/auth/login",
        json={"email": "manager-e3@test.com", "password": "manager123", "remember_me": False},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    body = {
        "employee_id": "E3-MGR-NO",
        "first_name": "No",
        "email": "no-mgr-admin@test.com",
        "role": "user",
    }
    assert client.post("/api/employees", json=body, headers=headers).status_code == 403


def test_catalog_writes_require_auth(client):
    assert client.post("/api/customers", json={"name": "X"}).status_code == 401
    assert client.post("/api/uoms", json={"code": "U", "name": "U"}).status_code == 401
    assert client.post("/api/products", json={"name": "X"}).status_code == 401
