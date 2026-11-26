"""F.4C-DEV Gate B isolated reservation HTTP tests. Production app stays unmounted."""
from fastapi.testclient import TestClient

from app.auth import get_password_hash
from app.database import get_db
from app.models import Employee
from app.services.isolated_document_reservation import (
    assert_synthetic_inventory_integrity,
    seed_synthetic_lots,
)
from app.services.isolated_inventory_simulation import IsoBase, IsoLotRow, IsoReservationRow
from main import app as production_app
from tests.test_f4b2_dev_isolated_workflow import (
    SYNTHETIC,
    _ex_payload,
    _login,
    _seed_isolated,
    _sg_payload,
    _snap,
    isolated_app,
)


def _iso_client(db_session):
    IsoBase.metadata.create_all(db_session.get_bind())

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    isolated_app.dependency_overrides[get_db] = override_get_db
    return TestClient(isolated_app)


def _extra_roles(db, depot_id):
    rows = [
        Employee(
            employee_id="F4C-FIN",
            first_name="Synthetic",
            last_name="FIN",
            email="test.finance.user@example.com",
            hashed_password=get_password_hash("IsoPass!9"),
            role="finance",
            depot_id=depot_id,
            is_active=True,
            is_blocked=False,
        ),
        Employee(
            employee_id="F4C-TRN",
            first_name="Synthetic",
            last_name="TRN",
            email="test.transport.user@example.com",
            hashed_password=get_password_hash("IsoPass!9"),
            role="transport",
            depot_id=depot_id,
            is_active=True,
            is_blocked=False,
        ),
    ]
    db.add_all(rows)
    db.commit()


def _approve_sg(client, product_id, depot_id, number, items=None):
    creator = _login(client, SYNTHETIC["creator"])
    approver = _login(client, SYNTHETIC["operations"])
    body = _sg_payload(product_id, depot_id, delivery_number=number)
    if items is not None:
        body["items"] = items
    created = client.post("/api/sample-gift-deliveries", json=body, headers=creator)
    assert created.status_code == 201, created.text
    doc_id = created.json()["id"]
    submitted = client.post(f"/api/sample-gift-deliveries/{doc_id}/submit", json={}, headers=creator)
    assert submitted.status_code == 200, submitted.text
    approved = client.post(f"/api/sample-gift-deliveries/{doc_id}/approve", json={}, headers=approver)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "Approved"
    return doc_id, creator, approver


def _approve_ex(client, product_id, depot_id, number):
    creator = _login(client, SYNTHETIC["creator"])
    approver = _login(client, SYNTHETIC["operations"])
    created = client.post(
        "/api/export-deliveries",
        json=_ex_payload(product_id, depot_id, delivery_number=number),
        headers=creator,
    )
    assert created.status_code == 201, created.text
    doc_id = created.json()["id"]
    submitted = client.post(f"/api/export-deliveries/{doc_id}/submit", json={}, headers=creator)
    assert submitted.status_code == 200, submitted.text
    approved = client.post(f"/api/export-deliveries/{doc_id}/approve", json={}, headers=approver)
    assert approved.status_code == 200, approved.text
    return doc_id, creator, approver


def test_production_reservation_routes_404(client, auth_headers):
    paths = (
        "/api/isolated-inventory/sample-gift-deliveries/1/reserve",
        "/api/isolated-inventory/export-deliveries/1/reserve",
        "/api/isolated-inventory/reservations/abc/release",
    )
    for path in paths:
        resp = client.post(path, json={"idempotency_key": "x"}, headers=auth_headers)
        assert resp.status_code in (404, 405), (path, resp.status_code, resp.text)
    listed = client.get(
        "/api/isolated-inventory/sample-gift-deliveries/1/reservations",
        headers=auth_headers,
    )
    assert listed.status_code in (404, 405)
    production_paths = {getattr(route, "path", "") for route in production_app.routes}
    assert not any("isolated-inventory" in path for path in production_paths)


def test_approve_does_not_reserve(db_session):
    seed = _seed_isolated(db_session)
    client = _iso_client(db_session)
    try:
        seed_synthetic_lots(
            db_session,
            depot_id=seed["depot_a"].id,
            sample_product_id=seed["sample"].id,
            export_product_id=seed["export"].id,
        )
        db_session.commit()
        doc_id, creator, _approver = _approve_sg(
            client, seed["sample"].id, seed["depot_a"].id, "SG-NOAUTO"
        )
        listed = client.get(
            f"/api/isolated-inventory/sample-gift-deliveries/{doc_id}/reservations",
            headers=creator,
        )
        assert listed.status_code == 200
        assert listed.json() == []
        assert db_session.query(IsoReservationRow).count() == 0
    finally:
        isolated_app.dependency_overrides.clear()
        IsoBase.metadata.drop_all(db_session.get_bind())


def test_sample_gift_and_export_reserve_fefo_and_release(db_session):
    seed = _seed_isolated(db_session)
    client = _iso_client(db_session)
    try:
        lots = seed_synthetic_lots(
            db_session,
            depot_id=seed["depot_a"].id,
            sample_product_id=seed["sample"].id,
            export_product_id=seed["export"].id,
        )
        db_session.commit()
        before = _snap(db_session)
        sg_id, _creator, approver = _approve_sg(
            client, seed["sample"].id, seed["depot_a"].id, "SG-RES-1"
        )
        reserved = client.post(
            f"/api/isolated-inventory/sample-gift-deliveries/{sg_id}/reserve",
            json={"idempotency_key": "sg-key-1", "remarks": "test only"},
            headers=approver,
        )
        assert reserved.status_code == 200, reserved.text
        body = reserved.json()
        assert body["status"] == "RESERVED"
        assert body["document_kind"] == "sample_gift"
        assert body["slices"][0]["batch_no"] == "SG-EARLY"
        assert all(slice_["batch_no"] != "SG-EXPIRED" for slice_ in body["slices"])
        assert all(slice_["batch_no"] != "SG-NULL" for slice_ in body["slices"])
        retry = client.post(
            f"/api/isolated-inventory/sample-gift-deliveries/{sg_id}/reserve",
            json={"idempotency_key": "sg-key-1"},
            headers=approver,
        )
        assert retry.status_code == 200
        assert retry.json()["reservation_id"] == body["reservation_id"]
        other_key = client.post(
            f"/api/isolated-inventory/sample-gift-deliveries/{sg_id}/reserve",
            json={"idempotency_key": "sg-key-2"},
            headers=approver,
        )
        assert other_key.status_code == 409

        early = db_session.get(IsoLotRow, lots["sg_early"].id)
        db_session.refresh(early)
        assert str(early.reserved) == "1.0000" or str(early.reserved).startswith("1")
        assert_synthetic_inventory_integrity(db_session, context="after sg reserve")

        released = client.post(
            f"/api/isolated-inventory/reservations/{body['reservation_id']}/release",
            headers=approver,
        )
        assert released.status_code == 200
        assert released.json()["status"] == "RELEASED"
        again = client.post(
            f"/api/isolated-inventory/reservations/{body['reservation_id']}/release",
            headers=approver,
        )
        assert again.status_code == 200
        assert again.json()["status"] == "RELEASED"
        db_session.refresh(early)
        assert str(early.reserved).startswith("0")
        rereserve = client.post(
            f"/api/isolated-inventory/sample-gift-deliveries/{sg_id}/reserve",
            json={"idempotency_key": "sg-key-3"},
            headers=approver,
        )
        assert rereserve.status_code == 409

        ex_id, _c, approver = _approve_ex(
            client, seed["export"].id, seed["depot_a"].id, "EX-RES-1"
        )
        ex_reserved = client.post(
            f"/api/isolated-inventory/export-deliveries/{ex_id}/reserve",
            json={"idempotency_key": "ex-key-1"},
            headers=approver,
        )
        assert ex_reserved.status_code == 200, ex_reserved.text
        assert ex_reserved.json()["slices"][0]["batch_no"] == "EX-EARLY"
        assert _snap(db_session) == before
        assert_synthetic_inventory_integrity(db_session, context="after export reserve")
    finally:
        isolated_app.dependency_overrides.clear()
        IsoBase.metadata.drop_all(db_session.get_bind())


def test_status_auth_stock_and_foreign_depot(db_session):
    seed = _seed_isolated(db_session)
    _extra_roles(db_session, seed["depot_a"].id)
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
            json=_sg_payload(seed["sample"].id, seed["depot_a"].id, delivery_number="SG-DRAFT-R"),
            headers=creator,
        )
        draft_id = draft.json()["id"]
        assert (
            client.post(
                f"/api/isolated-inventory/sample-gift-deliveries/{draft_id}/reserve",
                json={"idempotency_key": "d1"},
                headers=creator,
            ).status_code
            == 409
        )
        client.post(f"/api/sample-gift-deliveries/{draft_id}/submit", json={}, headers=creator)
        assert (
            client.post(
                f"/api/isolated-inventory/sample-gift-deliveries/{draft_id}/reserve",
                json={"idempotency_key": "d2"},
                headers=creator,
            ).status_code
            == 409
        )

        creator = _login(client, SYNTHETIC["creator"])
        approver = _login(client, SYNTHETIC["operations"])
        submitted = client.post(
            "/api/sample-gift-deliveries",
            json=_sg_payload(seed["sample"].id, seed["depot_a"].id, delivery_number="SG-REJ-R"),
            headers=creator,
        )
        sid = submitted.json()["id"]
        client.post(f"/api/sample-gift-deliveries/{sid}/submit", json={}, headers=creator)
        rejected = client.post(
            f"/api/sample-gift-deliveries/{sid}/reject",
            json={"reason": "test reject"},
            headers=approver,
        )
        assert rejected.status_code == 200
        assert (
            client.post(
                f"/api/isolated-inventory/sample-gift-deliveries/{sid}/reserve",
                json={"idempotency_key": "rej"},
                headers=approver,
            ).status_code
            == 409
        )

        sg_id, creator, approver = _approve_sg(
            client,
            seed["sample"].id,
            seed["depot_a"].id,
            "SG-AUTH",
            items=[{"product_id": seed["sample"].id, "quantity": 200}],
        )
        short = client.post(
            f"/api/isolated-inventory/sample-gift-deliveries/{sg_id}/reserve",
            json={"idempotency_key": "short"},
            headers=approver,
        )
        assert short.status_code == 409
        assert db_session.query(IsoReservationRow).filter_by(document_id=str(sg_id)).count() == 0

        missing = client.post(
            "/api/isolated-inventory/sample-gift-deliveries/99999/reserve",
            json={"idempotency_key": "nope"},
            headers=approver,
        )
        assert missing.status_code == 404

        unauth = client.post(
            f"/api/isolated-inventory/sample-gift-deliveries/{sg_id}/reserve",
            json={"idempotency_key": "no-jwt"},
        )
        assert unauth.status_code in (401, 403)

        pso = _login(client, SYNTHETIC["pso"])
        billing = _login(client, SYNTHETIC["billing"])
        finance = _login(client, "test.finance.user@example.com")
        transport = _login(client, "test.transport.user@example.com")
        foreign = _login(client, SYNTHETIC["foreign"])
        ok_id, _c, approver = _approve_sg(client, seed["sample"].id, seed["depot_a"].id, "SG-OK-R")
        for headers in (pso, billing, finance, transport):
            resp = client.post(
                f"/api/isolated-inventory/sample-gift-deliveries/{ok_id}/reserve",
                json={"idempotency_key": "role"},
                headers=headers,
            )
            assert resp.status_code == 403, resp.text
        hidden = client.post(
            f"/api/isolated-inventory/sample-gift-deliveries/{ok_id}/reserve",
            json={"idempotency_key": "forn"},
            headers=foreign,
        )
        assert hidden.status_code == 404
        assert "Dr Isolated" not in hidden.text

        blank = client.post(
            f"/api/isolated-inventory/sample-gift-deliveries/{ok_id}/reserve",
            json={"idempotency_key": ""},
            headers=approver,
        )
        assert blank.status_code == 422
    finally:
        isolated_app.dependency_overrides.clear()
        IsoBase.metadata.drop_all(db_session.get_bind())


def test_duplicate_product_lines_all_or_nothing(db_session):
    seed = _seed_isolated(db_session)
    client = _iso_client(db_session)
    try:
        seed_synthetic_lots(
            db_session,
            depot_id=seed["depot_a"].id,
            sample_product_id=seed["sample"].id,
            export_product_id=seed["export"].id,
        )
        db_session.commit()
        doc_id, _c, approver = _approve_sg(
            client,
            seed["sample"].id,
            seed["depot_a"].id,
            "SG-DUP",
            items=[
                {"product_id": seed["sample"].id, "quantity": 8},
                {"product_id": seed["sample"].id, "quantity": 12},
            ],
        )
        reserved = client.post(
            f"/api/isolated-inventory/sample-gift-deliveries/{doc_id}/reserve",
            json={"idempotency_key": "dup"},
            headers=approver,
        )
        assert reserved.status_code == 200, reserved.text
        body = reserved.json()
        assert len(body["lines"]) == 2
        assert sum(float(line["reserved_quantity"]) for line in body["lines"]) == 20
        assert body["slices"][0]["batch_no"] == "SG-EARLY"
        assert_synthetic_inventory_integrity(db_session, context="dup lines")

        header = db_session.get(IsoReservationRow, body["reservation_id"])
        header.status = "ISSUED"
        db_session.commit()
        blocked = client.post(
            f"/api/isolated-inventory/reservations/{body['reservation_id']}/release",
            headers=approver,
        )
        assert blocked.status_code == 409
    finally:
        isolated_app.dependency_overrides.clear()
        IsoBase.metadata.drop_all(db_session.get_bind())
