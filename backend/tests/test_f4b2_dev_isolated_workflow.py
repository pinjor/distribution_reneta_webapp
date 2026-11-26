"""F.4B.2-DEV isolated Submit/Approve/Reject. Production app stays unmounted."""
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func

from app.api_app import create_api_app
from app.auth import get_password_hash
from app.core.config import get_settings
from app.database import get_db
from app.models import (
    CollectionDeposit,
    CollectionTransaction,
    Depot,
    Employee,
    ExportDelivery,
    Invoice,
    Order,
    Product,
    ProductItemStock,
    ProductItemStockDetail,
    SampleGiftDelivery,
    StockIssuance,
    StockLedger,
)
from app.models_platform import AuditLog, OrderBatchAllocation
from app.services.audit_service import AuditService
from app.services.draft_status_transition import ENDPOINTS_MOUNTED, POLICY_APPROVED
from main import app as production_app

isolated_app = create_api_app(isolated_workflow=True)

SYNTHETIC = {
    "product": "test.product.owner@example.com",
    "operations": "test.operations.owner@example.com",
    "authorization": "test.authorization.owner@example.com",
    "creator": "test.creator.manager@example.com",
    "pso": "test.pso.user@example.com",
    "billing": "test.billing.user@example.com",
    "foreign": "test.foreign.manager@example.com",
}


@pytest.fixture
def isolated_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    isolated_app.dependency_overrides[get_db] = override_get_db
    with TestClient(isolated_app) as c:
        yield c
    isolated_app.dependency_overrides.clear()


def _snap(db):
    return {
        "ledger": db.query(func.coalesce(func.sum(StockLedger.available_quantity), 0)).scalar(),
        "pisd": db.query(func.coalesce(func.sum(ProductItemStockDetail.available_quantity), 0)).scalar(),
        "pis": db.query(func.coalesce(func.sum(ProductItemStock.stock_qty), 0)).scalar(),
        "alloc": db.query(OrderBatchAllocation).count(),
        "orders": db.query(Order).count(),
        "invoices": db.query(Invoice).count(),
        "issuances": db.query(StockIssuance).count(),
        "deposits": db.query(CollectionDeposit).count(),
        "collections": db.query(CollectionTransaction).count(),
    }


def _seed_isolated(db):
    depot_a = Depot(name="F4B2 Depot A", code="F4B2-A")
    depot_b = Depot(name="F4B2 Depot B", code="F4B2-B")
    db.add_all([depot_a, depot_b])
    db.flush()
    sample = Product(
        name="F4B2 Sample SKU",
        code="F4B2-S",
        sku="F4B2-S",
        product_type_sample=True,
        is_active=True,
    )
    export = Product(
        name="F4B2 Export SKU",
        code="F4B2-E",
        sku="F4B2-E",
        product_type_export=True,
        is_active=True,
    )
    both = Product(
        name="F4B2 Both SKU",
        code="F4B2-BTH",
        sku="F4B2-BTH",
        product_type_sample=True,
        product_type_export=True,
        is_active=True,
    )
    plain = Product(
        name="F4B2 Plain SKU",
        code="F4B2-P",
        sku="F4B2-P",
        is_active=True,
    )
    inactive = Product(
        name="F4B2 Inactive Sample",
        code="F4B2-I",
        sku="F4B2-I",
        product_type_sample=True,
        is_active=False,
    )
    db.add_all([sample, export, both, plain, inactive])

    def emp(email, role, depot_id, suffix):
        return Employee(
            employee_id=f"F4B2-{suffix}",
            first_name="Synthetic",
            last_name=suffix,
            email=email,
            hashed_password=get_password_hash("IsoPass!9"),
            role=role,
            depot_id=depot_id,
            is_active=True,
            is_blocked=False,
        )

    users = [
        emp(SYNTHETIC["product"], "admin", depot_a.id, "PO"),
        emp(SYNTHETIC["operations"], "manager", depot_a.id, "OPS"),
        emp(SYNTHETIC["authorization"], "admin", depot_a.id, "AUTH"),
        emp(SYNTHETIC["creator"], "manager", depot_a.id, "CRE"),
        emp(SYNTHETIC["pso"], "user", depot_a.id, "PSO"),
        emp(SYNTHETIC["billing"], "billing", depot_a.id, "BILL"),
        emp(SYNTHETIC["foreign"], "manager", depot_b.id, "FOR"),
    ]
    db.add_all(users)
    db.commit()
    for row in [depot_a, depot_b, sample, export, both, plain, inactive, *users]:
        db.refresh(row)
    return {
        "depot_a": depot_a,
        "depot_b": depot_b,
        "sample": sample,
        "export": export,
        "both": both,
        "plain": plain,
        "inactive": inactive,
    }


def _login(client, email):
    resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": "IsoPass!9", "remember_me": False},
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _sg_payload(product_id, depot_id, **overrides):
    body = {
        "document_kind": "sample",
        "delivery_date": date.today().isoformat(),
        "recipient_name": "Dr Isolated",
        "recipient_type": "Doctor",
        "depot_id": depot_id,
        "items": [{"product_id": product_id, "quantity": 1}],
    }
    body.update(overrides)
    return body


def _ex_payload(product_id, depot_id, **overrides):
    body = {
        "delivery_date": date.today().isoformat(),
        "destination_country": "MY",
        "port_of_loading": "CTG",
        "port_of_discharge": "PKG",
        "depot_id": depot_id,
        "items": [{"product_id": product_id, "quantity": 1, "unit_price": 1.0}],
    }
    body.update(overrides)
    return body


def test_production_policy_flags_remain_unsigned():
    assert POLICY_APPROVED is False
    assert ENDPOINTS_MOUNTED is False
    assert isolated_app.state.isolated_workflow is True
    assert production_app.state.isolated_workflow is False


def test_production_workflow_routes_404(client, auth_headers):
    for path in (
        "/api/sample-gift-deliveries/1/submit",
        "/api/sample-gift-deliveries/1/approve",
        "/api/sample-gift-deliveries/1/reject",
        "/api/export-deliveries/1/submit",
        "/api/export-deliveries/1/approve",
        "/api/export-deliveries/1/reject",
    ):
        resp = client.post(path, json={}, headers=auth_headers)
        assert resp.status_code in (404, 405), (path, resp.status_code, resp.text)


def test_production_capabilities_hide_workflow(client, auth_headers):
    body = client.get("/api/draft-modules/capabilities", headers=auth_headers).json()
    assert body["sample_gift"]["can_submit"] is False
    assert body["sample_gift"]["can_approve"] is False
    assert body["sample_gift"]["can_reject"] is False
    assert "document" not in body["sample_gift"]


def test_isolated_submit_approve_reject_and_stock_unchanged(isolated_client, db_session):
    seed = _seed_isolated(db_session)
    before = _snap(db_session)
    creator = _login(isolated_client, SYNTHETIC["creator"])
    approver = _login(isolated_client, SYNTHETIC["operations"])
    created = isolated_client.post(
        "/api/sample-gift-deliveries",
        json=_sg_payload(seed["sample"].id, seed["depot_a"].id, delivery_number="SG-ISO-1"),
        headers=creator,
    )
    assert created.status_code == 201, created.text
    doc_id = created.json()["id"]

    caps = isolated_client.get(
        f"/api/draft-modules/capabilities?sample_gift_id={doc_id}",
        headers=creator,
    )
    assert caps.status_code == 200
    assert caps.json()["sample_gift"]["can_submit"] is True
    assert caps.json()["sample_gift"]["document"]["can_submit"] is True
    assert caps.json()["sample_gift"]["document"]["can_approve"] is False

    submitted = isolated_client.post(
        f"/api/sample-gift-deliveries/{doc_id}/submit",
        json={},
        headers=creator,
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["status"] == "Submitted"

    self_approve = isolated_client.post(
        f"/api/sample-gift-deliveries/{doc_id}/approve",
        json={},
        headers=creator,
    )
    assert self_approve.status_code == 403

    approved = isolated_client.post(
        f"/api/sample-gift-deliveries/{doc_id}/approve",
        json={},
        headers=approver,
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "Approved"

    rejected = isolated_client.post(
        f"/api/sample-gift-deliveries/{doc_id}/reject",
        json={"reason": "too late"},
        headers=approver,
    )
    assert rejected.status_code == 409

    db_session.expire_all()
    assert _snap(db_session) == before
    actions = [
        row.action
        for row in db_session.query(AuditLog).filter(AuditLog.entity_id == str(doc_id)).all()
    ]
    assert actions.count("SAMPLE_GIFT_SUBMITTED") == 1
    assert actions.count("SAMPLE_GIFT_APPROVED") == 1
    assert "SAMPLE_GIFT_REJECTED" not in actions


def test_isolated_reject_reason_and_idempotent_retry(isolated_client, db_session):
    seed = _seed_isolated(db_session)
    creator = _login(isolated_client, SYNTHETIC["creator"])
    approver = _login(isolated_client, SYNTHETIC["operations"])
    created = isolated_client.post(
        "/api/sample-gift-deliveries",
        json=_sg_payload(seed["sample"].id, seed["depot_a"].id, delivery_number="SG-ISO-R"),
        headers=creator,
    )
    doc_id = created.json()["id"]
    isolated_client.post(f"/api/sample-gift-deliveries/{doc_id}/submit", json={}, headers=creator)
    blank = isolated_client.post(
        f"/api/sample-gift-deliveries/{doc_id}/reject",
        json={"reason": "  "},
        headers=approver,
    )
    assert blank.status_code == 422
    first = isolated_client.post(
        f"/api/sample-gift-deliveries/{doc_id}/reject",
        json={"reason": "Incomplete lines"},
        headers=approver,
    )
    assert first.status_code == 200
    assert first.json()["status"] == "Rejected"
    second = isolated_client.post(
        f"/api/sample-gift-deliveries/{doc_id}/reject",
        json={"reason": "Incomplete lines"},
        headers=approver,
    )
    assert second.status_code == 200
    assert second.json()["status"] == "Rejected"
    assert (
        db_session.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_REJECTED").count()
        == 1
    )


def test_isolated_eligibility_create_update_submit(isolated_client, db_session):
    seed = _seed_isolated(db_session)
    creator = _login(isolated_client, SYNTHETIC["creator"])
    depot = seed["depot_a"].id
    assert (
        isolated_client.post(
            "/api/sample-gift-deliveries",
            json=_sg_payload(seed["plain"].id, depot, delivery_number="SG-ISO-PLAIN"),
            headers=creator,
        ).status_code
        == 400
    )
    assert (
        isolated_client.post(
            "/api/sample-gift-deliveries",
            json=_sg_payload(seed["inactive"].id, depot, delivery_number="SG-ISO-INACT"),
            headers=creator,
        ).status_code
        == 400
    )
    gift_ok = isolated_client.post(
        "/api/sample-gift-deliveries",
        json=_sg_payload(
            seed["sample"].id,
            depot,
            delivery_number="SG-ISO-GIFT",
            document_kind="gift",
        ),
        headers=creator,
    )
    assert gift_ok.status_code == 201, gift_ok.text
    both_export = isolated_client.post(
        "/api/export-deliveries",
        json=_ex_payload(seed["both"].id, depot, delivery_number="EX-ISO-BOTH"),
        headers=creator,
    )
    assert both_export.status_code == 201, both_export.text
    bad_export = isolated_client.post(
        "/api/export-deliveries",
        json=_ex_payload(seed["sample"].id, depot, delivery_number="EX-ISO-BAD"),
        headers=creator,
    )
    assert bad_export.status_code == 400

    created = isolated_client.post(
        "/api/sample-gift-deliveries",
        json=_sg_payload(seed["sample"].id, depot, delivery_number="SG-ISO-UPD"),
        headers=creator,
    )
    doc_id = created.json()["id"]
    bad_put = isolated_client.put(
        f"/api/sample-gift-deliveries/{doc_id}",
        json=_sg_payload(seed["plain"].id, depot, recipient_name="No"),
        headers=creator,
    )
    assert bad_put.status_code == 400

    ok = isolated_client.post(
        "/api/sample-gift-deliveries",
        json=_sg_payload(seed["sample"].id, depot, delivery_number="SG-ISO-FLIP"),
        headers=creator,
    )
    flip_id = ok.json()["id"]
    db_session.query(Product).filter(Product.id == seed["sample"].id).update(
        {"product_type_sample": False}
    )
    db_session.commit()
    submit = isolated_client.post(
        f"/api/sample-gift-deliveries/{flip_id}/submit",
        json={},
        headers=creator,
    )
    assert submit.status_code == 400
    db_session.expire_all()
    stored = db_session.query(SampleGiftDelivery).filter(SampleGiftDelivery.id == flip_id).first()
    assert stored.status == "Draft"


def test_isolated_pso_billing_foreign_and_flags(isolated_client, db_session, monkeypatch):
    seed = _seed_isolated(db_session)
    creator = _login(isolated_client, SYNTHETIC["creator"])
    pso = _login(isolated_client, SYNTHETIC["pso"])
    billing = _login(isolated_client, SYNTHETIC["billing"])
    foreign = _login(isolated_client, SYNTHETIC["foreign"])
    created = isolated_client.post(
        "/api/sample-gift-deliveries",
        json=_sg_payload(seed["sample"].id, seed["depot_a"].id, delivery_number="SG-ISO-RBAC"),
        headers=creator,
    )
    doc_id = created.json()["id"]
    assert (
        isolated_client.post(
            f"/api/sample-gift-deliveries/{doc_id}/submit", json={}, headers=pso
        ).status_code
        == 403
    )
    assert (
        isolated_client.post(
            f"/api/sample-gift-deliveries/{doc_id}/submit", json={}, headers=billing
        ).status_code
        == 403
    )
    assert (
        isolated_client.post(
            f"/api/sample-gift-deliveries/{doc_id}/submit", json={}, headers=foreign
        ).status_code
        == 404
    )
    monkeypatch.setenv("SAMPLE_GIFT_DRAFT_WRITES", "no")
    get_settings.cache_clear()
    try:
        assert (
            isolated_client.post(
                f"/api/sample-gift-deliveries/{doc_id}/submit", json={}, headers=creator
            ).status_code
            == 403
        )
    finally:
        monkeypatch.setenv("SAMPLE_GIFT_DRAFT_WRITES", "yes")
        get_settings.cache_clear()


def test_isolated_export_workflow_and_put_after_submit(isolated_client, db_session):
    seed = _seed_isolated(db_session)
    creator = _login(isolated_client, SYNTHETIC["creator"])
    approver = _login(isolated_client, SYNTHETIC["operations"])
    created = isolated_client.post(
        "/api/export-deliveries",
        json=_ex_payload(seed["export"].id, seed["depot_a"].id, delivery_number="EX-ISO-1"),
        headers=creator,
    )
    assert created.status_code == 201, created.text
    doc_id = created.json()["id"]
    submitted = isolated_client.post(
        f"/api/export-deliveries/{doc_id}/submit", json={}, headers=creator
    )
    assert submitted.status_code == 200
    put = isolated_client.put(
        f"/api/export-deliveries/{doc_id}",
        json=_ex_payload(seed["export"].id, seed["depot_a"].id, destination_country="SG"),
        headers=creator,
    )
    assert put.status_code == 409
    retry = isolated_client.post(
        f"/api/export-deliveries/{doc_id}/submit", json={}, headers=creator
    )
    assert retry.status_code == 200
    assert (
        db_session.query(AuditLog).filter(AuditLog.action == "EXPORT_SUBMITTED").count() == 1
    )
    approved = isolated_client.post(
        f"/api/export-deliveries/{doc_id}/approve", json={}, headers=approver
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "Approved"
    db_session.expire_all()
    stored = db_session.query(ExportDelivery).filter(ExportDelivery.id == doc_id).first()
    assert stored.destination_country == "MY"


def test_isolated_audit_failure_rolls_back(isolated_client, db_session, monkeypatch):
    seed = _seed_isolated(db_session)
    creator = _login(isolated_client, SYNTHETIC["creator"])
    created = isolated_client.post(
        "/api/sample-gift-deliveries",
        json=_sg_payload(seed["sample"].id, seed["depot_a"].id, delivery_number="SG-ISO-AUD"),
        headers=creator,
    )
    doc_id = created.json()["id"]
    before_audit = db_session.query(AuditLog).count()

    def boom(*_a, **_k):
        raise RuntimeError("synthetic audit failure")

    monkeypatch.setattr(AuditService, "log_action", boom)
    with pytest.raises(RuntimeError, match="synthetic audit failure"):
        isolated_client.post(
            f"/api/sample-gift-deliveries/{doc_id}/submit", json={}, headers=creator
        )
    db_session.expire_all()
    stored = db_session.query(SampleGiftDelivery).filter(SampleGiftDelivery.id == doc_id).first()
    assert stored.status == "Draft"
    assert db_session.query(AuditLog).count() == before_audit
