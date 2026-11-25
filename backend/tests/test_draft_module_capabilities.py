"""Read-only Draft capability API. Does not grant writes."""
from app.auth import get_password_hash
from app.core.config import get_settings
from app.models import Employee


def test_unauthenticated_capabilities_are_401(client):
    resp = client.get("/api/draft-modules/capabilities")
    assert resp.status_code == 401


def test_admin_capabilities_follow_write_flags(client, auth_headers, monkeypatch):
    on = client.get("/api/draft-modules/capabilities", headers=auth_headers)
    assert on.status_code == 200
    body = on.json()
    assert set(body.keys()) == {"sample_gift", "export"}
    for module in ("sample_gift", "export"):
        assert body[module]["can_read"] is True
        assert body[module]["can_create"] is True
        assert body[module]["can_edit"] is True
        assert body[module]["writes_enabled"] is True
        assert body[module]["can_submit"] is False
        assert body[module]["can_approve"] is False
        assert body[module]["can_reject"] is False
    dumped = str(body).lower()
    assert "secret" not in dumped
    assert "password" not in dumped
    assert "database_url" not in dumped
    assert "sample_gift_draft_writes" not in dumped

    monkeypatch.setenv("SAMPLE_GIFT_DRAFT_WRITES", "no")
    monkeypatch.setenv("EXPORT_DRAFT_WRITES", "no")
    get_settings.cache_clear()
    try:
        off = client.get("/api/draft-modules/capabilities", headers=auth_headers)
        assert off.status_code == 200
        disabled = off.json()
        for module in ("sample_gift", "export"):
            assert disabled[module]["can_read"] is True
            assert disabled[module]["writes_enabled"] is False
            assert disabled[module]["can_create"] is False
            assert disabled[module]["can_edit"] is False
            assert disabled[module]["can_submit"] is False
    finally:
        monkeypatch.delenv("SAMPLE_GIFT_DRAFT_WRITES", raising=False)
        monkeypatch.delenv("EXPORT_DRAFT_WRITES", raising=False)
        get_settings.cache_clear()


def test_pso_cannot_create_or_edit_when_flags_on(client, user_auth_headers):
    resp = client.get("/api/draft-modules/capabilities", headers=user_auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    for module in ("sample_gift", "export"):
        assert body[module]["can_read"] is True
        assert body[module]["can_create"] is False
        assert body[module]["can_edit"] is False
        assert body[module]["can_submit"] is False


def test_manager_can_write_when_flags_on(client, db_session):
    manager = Employee(
        employee_id="MGR-CAP",
        first_name="Cap",
        last_name="Manager",
        email="cap.manager@test.com",
        hashed_password=get_password_hash("manager123"),
        role="manager",
        is_active=True,
        is_blocked=False,
    )
    db_session.add(manager)
    db_session.commit()
    login = client.post(
        "/api/auth/login",
        json={"email": "cap.manager@test.com", "password": "manager123", "remember_me": False},
    )
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    resp = client.get("/api/draft-modules/capabilities", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["sample_gift"]["can_create"] is True
    assert body["export"]["can_edit"] is True
    assert body["sample_gift"]["can_submit"] is False


def test_capability_true_does_not_bypass_put_guards(client, auth_headers, db_session, monkeypatch):
    from app.models import Depot, Product

    depot = Depot(name="Cap Depot", code="CAP-D")
    product = Product(name="Cap SKU", code="CAP-SKU", sku="CAP-SKU", product_type_sample=True)
    db_session.add_all([depot, product])
    db_session.commit()
    caps = client.get("/api/draft-modules/capabilities", headers=auth_headers)
    assert caps.json()["sample_gift"]["can_create"] is True

    monkeypatch.setenv("SAMPLE_GIFT_DRAFT_WRITES", "no")
    get_settings.cache_clear()
    try:
        created = client.post(
            "/api/sample-gift-deliveries",
            json={
                "depot_id": depot.id,
                "document_kind": "sample",
                "delivery_date": "2026-11-25",
                "recipient_name": "Should Fail",
                "recipient_type": "Doctor",
                "items": [{"product_id": product.id, "quantity": 1}],
            },
            headers=auth_headers,
        )
        assert created.status_code == 403
    finally:
        monkeypatch.delenv("SAMPLE_GIFT_DRAFT_WRITES", raising=False)
        get_settings.cache_clear()
