"""F.4D-DEV Gate B isolated fulfillment HTTP tests. Production app stays unmounted."""
from app.auth import get_password_hash
from app.models import Employee, SampleGiftDelivery
from app.services.isolated_document_reservation import seed_synthetic_lots
from app.services.isolated_inventory_simulation import IsoBase, IsoLotRow
from main import app as production_app
from tests.test_f4b2_dev_isolated_workflow import (
    SYNTHETIC,
    _login,
    _seed_isolated,
    _sg_payload,
    _snap,
    isolated_app,
)
from tests.test_f4c_dev_isolated_reservation_api import _approve_ex, _approve_sg, _iso_client


def _warehouse(db, depot_id):
    row = Employee(
        employee_id="F4D-WH",
        first_name="Synthetic",
        last_name="WH",
        email="test.warehouse.operator@example.com",
        hashed_password=get_password_hash("IsoPass!9"),
        role="warehouse",
        depot_id=depot_id,
        is_active=True,
        is_blocked=False,
    )
    db.add(row)
    db.commit()
    return row


def _reserve(client, headers, kind, doc_id, key):
    path = (
        f"/api/isolated-inventory/sample-gift-deliveries/{doc_id}/reserve"
        if kind == "sg"
        else f"/api/isolated-inventory/export-deliveries/{doc_id}/reserve"
    )
    resp = client.post(path, json={"idempotency_key": key}, headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _confirm_body(slices, key):
    return {
        "idempotency_key": key,
        "slices": [{"lot_id": s["lot_id"], "picked_quantity": s["reserved_quantity"]} for s in slices],
    }


def test_production_fulfillment_routes_404(client, auth_headers):
    paths = (
        "/api/isolated-fulfillment/sample-gift-deliveries/1/picking/start",
        "/api/isolated-fulfillment/export-deliveries/1/picking/start",
        "/api/isolated-fulfillment/abc/issue",
        "/api/isolated-fulfillment/abc/dispatch",
        "/api/isolated-fulfillment/abc/delivery/confirm",
        "/api/isolated-fulfillment/abc/delivery/fail",
    )
    for path in paths:
        resp = client.post(path, json={"idempotency_key": "x", "reason": "x"}, headers=auth_headers)
        assert resp.status_code in (404, 405), (path, resp.status_code, resp.text)
    production_paths = {getattr(route, "path", "") for route in production_app.routes}
    assert not any("isolated-fulfillment" in path for path in production_paths)


def test_full_sample_gift_and_export_lifecycle(db_session):
    seed = _seed_isolated(db_session)
    _warehouse(db_session, seed["depot_a"].id)
    client = _iso_client(db_session)
    try:
        seed_synthetic_lots(
            db_session,
            depot_id=seed["depot_a"].id,
            sample_product_id=seed["sample"].id,
            export_product_id=seed["export"].id,
        )
        db_session.commit()
        before = _snap(db_session)
        sg_id, _c, approver = _approve_sg(client, seed["sample"].id, seed["depot_a"].id, "SG-FF-1")
        reserved = _reserve(client, approver, "sg", sg_id, "r-sg")
        started = client.post(
            f"/api/isolated-fulfillment/sample-gift-deliveries/{sg_id}/picking/start",
            json={"idempotency_key": "p-sg"},
            headers=approver,
        )
        assert started.status_code == 200, started.text
        fid = started.json()["fulfillment_id"]
        assert started.json()["status"] == "PICKING"
        db_session.expire_all()
        assert db_session.get(SampleGiftDelivery, sg_id).status == "Approved"

        retry = client.post(
            f"/api/isolated-fulfillment/sample-gift-deliveries/{sg_id}/picking/start",
            json={"idempotency_key": "p-sg"},
            headers=approver,
        )
        assert retry.json()["fulfillment_id"] == fid
        other = client.post(
            f"/api/isolated-fulfillment/sample-gift-deliveries/{sg_id}/picking/start",
            json={"idempotency_key": "p-sg-2"},
            headers=approver,
        )
        assert other.status_code == 409

        confirmed = client.post(
            f"/api/isolated-fulfillment/{fid}/picking/confirm",
            json=_confirm_body(started.json()["slices"], "c-sg"),
            headers=approver,
        )
        assert confirmed.status_code == 200, confirmed.text
        assert confirmed.json()["status"] == "PICKED"
        again = client.post(
            f"/api/isolated-fulfillment/{fid}/picking/confirm",
            json=_confirm_body(started.json()["slices"], "c-sg"),
            headers=approver,
        )
        assert again.status_code == 200
        mismatch = client.post(
            f"/api/isolated-fulfillment/{fid}/picking/confirm",
            json={
                "idempotency_key": "c-sg",
                "slices": [{"lot_id": started.json()["slices"][0]["lot_id"], "picked_quantity": 99}],
            },
            headers=approver,
        )
        assert mismatch.status_code == 409

        issued = client.post(
            f"/api/isolated-fulfillment/{fid}/issue",
            json={"idempotency_key": "i-sg"},
            headers=approver,
        )
        assert issued.status_code == 200, issued.text
        assert issued.json()["status"] == "ISSUED"
        lot = db_session.get(IsoLotRow, started.json()["slices"][0]["lot_id"])
        db_session.refresh(lot)
        assert str(lot.reserved).startswith("0")
        assert str(lot.available) == str(lot.quantity) or float(lot.available) == float(lot.quantity)

        dispatched = client.post(
            f"/api/isolated-fulfillment/{fid}/dispatch",
            json={"idempotency_key": "d-sg", "transport_ref": "TRK-1"},
            headers=approver,
        )
        assert dispatched.status_code == 200
        delivered = client.post(
            f"/api/isolated-fulfillment/{fid}/delivery/confirm",
            json={"idempotency_key": "del-sg", "receiver_name": "Dr Isolated"},
            headers=approver,
        )
        assert delivered.status_code == 200
        assert delivered.json()["status"] == "DELIVERED"
        fail = client.post(
            f"/api/isolated-fulfillment/{fid}/delivery/fail",
            json={"idempotency_key": "fail-sg", "reason": "too late"},
            headers=approver,
        )
        assert fail.status_code == 409
        history = client.get(f"/api/isolated-fulfillment/{fid}/history", headers=approver)
        assert history.status_code == 200
        actions = [row["action"] for row in history.json()]
        assert actions == ["START_PICK", "CONFIRM_PICK", "ISSUE", "DISPATCH", "CONFIRM_DELIVERY"]
        assert _snap(db_session) == before

        creator = _login(client, SYNTHETIC["creator"])
        gift_body = _sg_payload(
            seed["sample"].id,
            seed["depot_a"].id,
            document_kind="gift",
            delivery_number="GF-FF-1",
        )
        gift_created = client.post("/api/sample-gift-deliveries", json=gift_body, headers=creator)
        assert gift_created.status_code == 201, gift_created.text
        gift_id = gift_created.json()["id"]
        assert client.post(f"/api/sample-gift-deliveries/{gift_id}/submit", json={}, headers=creator).status_code == 200
        assert client.post(f"/api/sample-gift-deliveries/{gift_id}/approve", json={}, headers=approver).status_code == 200
        db_session.expire_all()
        assert db_session.get(SampleGiftDelivery, gift_id).document_kind == "gift"
        _reserve(client, approver, "sg", gift_id, "r-gf")
        gift_pick = client.post(
            f"/api/isolated-fulfillment/sample-gift-deliveries/{gift_id}/picking/start",
            json={"idempotency_key": "p-gf"},
            headers=approver,
        )
        assert gift_pick.status_code == 200, gift_pick.text

        ex_id, _c, approver = _approve_ex(client, seed["export"].id, seed["depot_a"].id, "EX-FF-1")
        _reserve(client, approver, "ex", ex_id, "r-ex")
        ex_pick = client.post(
            f"/api/isolated-fulfillment/export-deliveries/{ex_id}/picking/start",
            json={"idempotency_key": "p-ex"},
            headers=approver,
        )
        assert ex_pick.status_code == 200, ex_pick.text
        ex_fid = ex_pick.json()["fulfillment_id"]
        client.post(
            f"/api/isolated-fulfillment/{ex_fid}/picking/confirm",
            json=_confirm_body(ex_pick.json()["slices"], "c-ex"),
            headers=approver,
        )
        client.post(f"/api/isolated-fulfillment/{ex_fid}/issue", json={"idempotency_key": "i-ex"}, headers=approver)
        client.post(f"/api/isolated-fulfillment/{ex_fid}/dispatch", json={"idempotency_key": "d-ex"}, headers=approver)
        failed = client.post(
            f"/api/isolated-fulfillment/{ex_fid}/delivery/fail",
            json={"idempotency_key": "f-ex", "reason": "refused"},
            headers=approver,
        )
        assert failed.status_code == 200, failed.text
        assert failed.json()["status"] == "FAILED_DELIVERY"
        fail_history = client.get(f"/api/isolated-fulfillment/{ex_fid}/history", headers=approver)
        assert [row["action"] for row in fail_history.json()][-1] == "FAIL_DELIVERY"
        assert _snap(db_session) == before
    finally:
        isolated_app.dependency_overrides.clear()
        IsoBase.metadata.drop_all(db_session.get_bind())


def test_auth_status_and_release_during_pick(db_session):
    seed = _seed_isolated(db_session)
    _warehouse(db_session, seed["depot_a"].id)
    db_session.add(
        Employee(
            employee_id="F4D-FIN",
            first_name="Synthetic",
            last_name="FIN",
            email="test.finance.f4d@example.com",
            hashed_password=get_password_hash("IsoPass!9"),
            role="finance",
            depot_id=seed["depot_a"].id,
            is_active=True,
            is_blocked=False,
        )
    )
    db_session.commit()
    client = _iso_client(db_session)
    try:
        seed_synthetic_lots(
            db_session,
            depot_id=seed["depot_a"].id,
            sample_product_id=seed["sample"].id,
            export_product_id=seed["export"].id,
        )
        db_session.commit()
        creator = _login(client, SYNTHETIC["creator"])
        draft = client.post(
            "/api/sample-gift-deliveries",
            json=_sg_payload(seed["sample"].id, seed["depot_a"].id, delivery_number="SG-FF-DR"),
            headers=creator,
        ).json()["id"]
        pso = _login(client, SYNTHETIC["pso"])
        billing = _login(client, SYNTHETIC["billing"])
        finance = _login(client, "test.finance.f4d@example.com")
        foreign = _login(client, SYNTHETIC["foreign"])
        wh = _login(client, "test.warehouse.operator@example.com")
        assert (
            client.post(
                f"/api/isolated-fulfillment/sample-gift-deliveries/{draft}/picking/start",
                json={"idempotency_key": "p"},
                headers=pso,
            ).status_code
            == 403
        )
        assert (
            client.post(
                f"/api/isolated-fulfillment/sample-gift-deliveries/{draft}/picking/start",
                json={"idempotency_key": "p"},
                headers=billing,
            ).status_code
            == 403
        )
        assert (
            client.post(
                f"/api/isolated-fulfillment/sample-gift-deliveries/{draft}/picking/start",
                json={"idempotency_key": "p"},
                headers=finance,
            ).status_code
            == 403
        )
        assert (
            client.post(
                f"/api/isolated-fulfillment/sample-gift-deliveries/{draft}/picking/start",
                json={"idempotency_key": "p"},
            ).status_code
            in (401, 403)
        )
        sg_id, _c, approver = _approve_sg(client, seed["sample"].id, seed["depot_a"].id, "SG-FF-AUTH")
        start_unreserved = client.post(
            f"/api/isolated-fulfillment/sample-gift-deliveries/{sg_id}/picking/start",
            json={"idempotency_key": "p0"},
            headers=approver,
        )
        assert start_unreserved.status_code == 409
        reserved = _reserve(client, approver, "sg", sg_id, "r-auth")
        foreign_start = client.post(
            f"/api/isolated-fulfillment/sample-gift-deliveries/{sg_id}/picking/start",
            json={"idempotency_key": "p-for"},
            headers=foreign,
        )
        assert foreign_start.status_code == 404
        started = client.post(
            f"/api/isolated-fulfillment/sample-gift-deliveries/{sg_id}/picking/start",
            json={"idempotency_key": "p-wh"},
            headers=wh,
        )
        assert started.status_code == 200, started.text
        release = client.post(
            f"/api/isolated-inventory/reservations/{reserved['reservation_id']}/release",
            headers=approver,
        )
        assert release.status_code == 409
        short = client.post(
            f"/api/isolated-fulfillment/{started.json()['fulfillment_id']}/picking/confirm",
            json={
                "idempotency_key": "short",
                "slices": [{"lot_id": started.json()["slices"][0]["lot_id"], "picked_quantity": 0}],
            },
            headers=wh,
        )
        assert short.status_code in (409, 422)
        issue_early = client.post(
            f"/api/isolated-fulfillment/{started.json()['fulfillment_id']}/issue",
            json={"idempotency_key": "early"},
            headers=wh,
        )
        assert issue_early.status_code == 409
    finally:
        isolated_app.dependency_overrides.clear()
        IsoBase.metadata.drop_all(db_session.get_bind())
