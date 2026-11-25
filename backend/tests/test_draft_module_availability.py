"""Missing F.2/F.3 tables return 503; commercial routes stay available."""
from app.core import draft_modules
from app.core.schema_guard import PENDING_LIVE_REVISIONS, _pending_revisions_only


def test_missing_export_tables_return_503(client, auth_headers, monkeypatch):
    monkeypatch.setattr(draft_modules, "tables_exist", lambda bind, names: False)
    resp = client.get("/api/export-deliveries", headers=auth_headers)
    assert resp.status_code == 503
    assert "f3_export_draft" in resp.json()["detail"]
    write = client.post(
        "/api/export-deliveries",
        json={
            "delivery_date": "2026-11-25",
            "destination_country": "Malaysia",
            "port_of_loading": "Chattogram",
            "port_of_discharge": "Port Klang",
            "items": [{"product_id": 1, "quantity": "1", "unit_price": "0"}],
        },
        headers=auth_headers,
    )
    assert write.status_code == 503


def test_missing_sample_gift_tables_return_503(client, auth_headers, monkeypatch):
    monkeypatch.setattr(draft_modules, "tables_exist", lambda bind, names: False)
    resp = client.get("/api/sample-gift-deliveries", headers=auth_headers)
    assert resp.status_code == 503
    assert "f2_sample_gift_draft" in resp.json()["detail"]


def test_commercial_orders_still_list_when_draft_tables_missing(
    client, auth_headers, monkeypatch
):
    monkeypatch.setattr(draft_modules, "tables_exist", lambda bind, names: False)
    resp = client.get("/api/orders", headers=auth_headers)
    assert resp.status_code == 200


def test_pending_revisions_allow_d4_through_f3():
    assert "f2_sample_gift_draft" in PENDING_LIVE_REVISIONS
    assert "f3_export_draft" in PENDING_LIVE_REVISIONS
    assert _pending_revisions_only("d4_baseline", "f3_export_draft") is True
    assert _pending_revisions_only("f2_sample_gift_draft", "f3_export_draft") is True
    assert _pending_revisions_only("f3_export_draft", "f3_export_draft") is False
