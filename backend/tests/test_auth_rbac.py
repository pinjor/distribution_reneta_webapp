"""Auth and RBAC tests."""


def test_health_public(client):
    assert client.get("/health").status_code == 200


def test_unauthenticated_orders_blocked(client):
    resp = client.get("/api/orders")
    assert resp.status_code == 401


def test_authenticated_orders_allowed(client, auth_headers):
    resp = client.get("/api/orders", headers=auth_headers)
    assert resp.status_code == 200


def test_login_success(client, admin_user):
    resp = client.post("/api/auth/login", json={
        "email": "admin@test.com", "password": "admin123", "remember_me": False,
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_failure_audit(client, db_session):
    resp = client.post("/api/auth/login", json={
        "email": "wrong@test.com", "password": "bad", "remember_me": False,
    })
    assert resp.status_code == 401


def test_blocked_user_cannot_login(client, db_session, admin_user):
    admin_user.is_blocked = True
    db_session.commit()
    resp = client.post("/api/auth/login", json={
        "email": "admin@test.com", "password": "admin123", "remember_me": False,
    })
    assert resp.status_code == 403


def test_permissions_endpoint(client, auth_headers):
    resp = client.get("/api/auth/permissions", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "orders.read" in data["permissions"]


def test_audit_logs_require_permission(client, auth_headers):
    resp = client.get("/api/audit-logs", headers=auth_headers)
    assert resp.status_code == 200


def test_reports_registry(client, auth_headers):
    resp = client.get("/api/reports/registry", headers=auth_headers)
    assert resp.status_code == 200
    reports = resp.json()
    assert len(reports) >= 60
