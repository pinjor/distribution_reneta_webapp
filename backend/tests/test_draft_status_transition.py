"""Isolated Draft status transitions. Endpoints are not mounted; policy is pending."""
from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import func

from app.auth import get_password_hash
from app.models import (
    Depot,
    Employee,
    ExportDelivery,
    ExportDeliveryItem,
    Invoice,
    Order,
    Product,
    ProductItemStock,
    ProductItemStockDetail,
    SampleGiftDelivery,
    SampleGiftDeliveryItem,
    StockIssuance,
    StockLedger,
)
from app.models_platform import AuditLog, OrderBatchAllocation
from app.services.draft_status_transition import (
    ENDPOINTS_MOUNTED,
    POLICY_APPROVED,
    apply_transition,
)


def _seed(db, suffix="1"):
    depot = Depot(name=f"F4B {suffix}", code=f"F4B-{suffix}")
    db.add(depot)
    db.flush()
    product = Product(name=f"F4B SKU {suffix}", code=f"F4B-{suffix}", sku=f"F4B-{suffix}")
    db.add(product)
    db.flush()
    creator = Employee(
        employee_id=f"F4B-C-{suffix}",
        first_name="Creator",
        last_name="Mgr",
        email=f"f4b-c-{suffix}@test.com",
        hashed_password=get_password_hash("manager123"),
        role="manager",
        depot_id=depot.id,
        is_active=True,
        is_blocked=False,
    )
    approver = Employee(
        employee_id=f"F4B-A-{suffix}",
        first_name="Approver",
        last_name="Mgr",
        email=f"f4b-a-{suffix}@test.com",
        hashed_password=get_password_hash("manager123"),
        role="manager",
        depot_id=depot.id,
        is_active=True,
        is_blocked=False,
    )
    pso = Employee(
        employee_id=f"F4B-U-{suffix}",
        first_name="Field",
        last_name="User",
        email=f"f4b-u-{suffix}@test.com",
        hashed_password=get_password_hash("user123"),
        role="user",
        depot_id=depot.id,
        is_active=True,
        is_blocked=False,
    )
    db.add_all([creator, approver, pso])
    db.commit()
    db.refresh(depot)
    db.refresh(product)
    db.refresh(creator)
    db.refresh(approver)
    db.refresh(pso)
    return depot, product, creator, approver, pso


def _sg(db, depot, product, creator, number):
    row = SampleGiftDelivery(
        delivery_number=number,
        depot_id=depot.id,
        document_kind="sample",
        status="Draft",
        delivery_date=date.today(),
        recipient_name="Dr. A",
        recipient_type="Doctor",
        created_by=creator.id,
    )
    db.add(row)
    db.flush()
    db.add(SampleGiftDeliveryItem(delivery_id=row.id, product_id=product.id, quantity=1))
    db.commit()
    db.refresh(row)
    return row


def _ex(db, depot, product, creator, number):
    row = ExportDelivery(
        delivery_number=number,
        depot_id=depot.id,
        status="Draft",
        delivery_date=date.today(),
        destination_country="MY",
        port_of_loading="CTG",
        port_of_discharge="PKG",
        created_by=creator.id,
    )
    db.add(row)
    db.flush()
    db.add(
        ExportDeliveryItem(
            delivery_id=row.id, product_id=product.id, quantity=1, unit_price=0
        )
    )
    db.commit()
    db.refresh(row)
    return row


def _snap(db):
    return {
        "ledger": db.query(func.coalesce(func.sum(StockLedger.available_quantity), 0)).scalar(),
        "pisd": db.query(func.coalesce(func.sum(ProductItemStockDetail.available_quantity), 0)).scalar(),
        "pis": db.query(func.coalesce(func.sum(ProductItemStock.stock_qty), 0)).scalar(),
        "alloc": db.query(OrderBatchAllocation).count(),
        "orders": db.query(Order).count(),
        "invoices": db.query(Invoice).count(),
        "issuances": db.query(StockIssuance).count(),
    }


def test_policy_and_endpoints_not_live():
    assert POLICY_APPROVED is False
    assert ENDPOINTS_MOUNTED is False


def test_submit_approve_reject_and_invalid(db_session):
    depot, product, creator, approver, _pso = _seed(db_session, "1")
    before = _snap(db_session)
    doc = _sg(db_session, depot, product, creator, "SG-F4B-1")

    result = apply_transition(db_session, "sample_gift", doc.id, "submit", creator)
    db_session.commit()
    assert result["to_status"] == "Submitted"
    assert result["idempotent"] is False
    db_session.refresh(doc)
    assert doc.status == "Submitted"

    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "approve", creator)
    assert exc.value.status_code == 403
    db_session.rollback()
    db_session.refresh(doc)
    assert doc.status == "Submitted"

    result = apply_transition(db_session, "sample_gift", doc.id, "approve", approver)
    db_session.commit()
    assert result["to_status"] == "Approved"
    db_session.refresh(doc)
    assert doc.status == "Approved"

    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "reject", approver, reason="late")
    assert exc.value.status_code == 409
    db_session.rollback()
    db_session.refresh(doc)
    assert doc.status == "Approved"
    assert _snap(db_session) == before

    actions = [
        a.action
        for a in db_session.query(AuditLog).filter(AuditLog.entity_id == str(doc.id)).all()
    ]
    assert "SAMPLE_GIFT_SUBMITTED" in actions
    assert "SAMPLE_GIFT_APPROVED" in actions
    assert "SAMPLE_GIFT_REJECTED" not in actions


def test_reject_requires_reason_and_is_terminal(db_session):
    depot, product, creator, approver, _pso = _seed(db_session, "2")
    doc = _sg(db_session, depot, product, creator, "SG-F4B-2")
    apply_transition(db_session, "sample_gift", doc.id, "submit", creator)
    db_session.commit()
    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "reject", approver)
    assert exc.value.status_code == 422
    db_session.rollback()
    apply_transition(db_session, "sample_gift", doc.id, "reject", approver, reason="Incomplete lines")
    db_session.commit()
    db_session.refresh(doc)
    assert doc.status == "Rejected"
    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "submit", creator)
    assert exc.value.status_code == 409


def test_idempotent_submit_skips_second_audit(db_session):
    depot, product, creator, _approver, _pso = _seed(db_session, "3")
    doc = _sg(db_session, depot, product, creator, "SG-F4B-3")
    apply_transition(db_session, "sample_gift", doc.id, "submit", creator)
    db_session.commit()
    first = db_session.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_SUBMITTED").count()
    again = apply_transition(db_session, "sample_gift", doc.id, "submit", creator)
    db_session.commit()
    assert again["idempotent"] is True
    assert again["to_status"] == "Submitted"
    assert db_session.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_SUBMITTED").count() == first


def test_pso_cannot_submit(db_session):
    depot, product, creator, _approver, pso = _seed(db_session, "4")
    doc = _sg(db_session, depot, product, creator, "SG-F4B-4")
    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "submit", pso)
    assert exc.value.status_code == 403
    db_session.refresh(doc)
    assert doc.status == "Draft"


def test_foreign_depot_404(db_session):
    depot, product, creator, _approver, _pso = _seed(db_session, "5")
    other = Depot(name="Other F4B", code="F4B-X")
    db_session.add(other)
    db_session.flush()
    stranger = Employee(
        employee_id="F4B-STR",
        first_name="Stranger",
        email="f4b-str@test.com",
        hashed_password=get_password_hash("manager123"),
        role="manager",
        depot_id=other.id,
        is_active=True,
        is_blocked=False,
    )
    db_session.add(stranger)
    db_session.commit()
    db_session.refresh(stranger)
    doc = _sg(db_session, depot, product, creator, "SG-F4B-5")
    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "submit", stranger)
    assert exc.value.status_code == 404
    db_session.refresh(doc)
    assert doc.status == "Draft"


def test_export_submit_approve_no_billing(db_session):
    depot, product, creator, approver, _pso = _seed(db_session, "6")
    before = _snap(db_session)
    doc = _ex(db_session, depot, product, creator, "EX-F4B-1")
    apply_transition(db_session, "export", doc.id, "submit", creator)
    db_session.commit()
    apply_transition(db_session, "export", doc.id, "approve", approver)
    db_session.commit()
    db_session.refresh(doc)
    assert doc.status == "Approved"
    assert _snap(db_session) == before
    actions = [a.action for a in db_session.query(AuditLog).filter(AuditLog.entity_id == str(doc.id))]
    assert "EXPORT_SUBMITTED" in actions
    assert "EXPORT_APPROVED" in actions


def test_missing_document_404(db_session, admin_user):
    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", 99999, "submit", admin_user)
    assert exc.value.status_code == 404


def test_transition_endpoints_not_mounted(client, auth_headers):
    for path in (
        "/api/sample-gift-deliveries/1/submit",
        "/api/sample-gift-deliveries/1/approve",
        "/api/sample-gift-deliveries/1/reject",
        "/api/export-deliveries/1/submit",
        "/api/export-deliveries/1/approve",
        "/api/export-deliveries/1/reject",
    ):
        resp = client.post(path, json={}, headers=auth_headers)
        assert resp.status_code in (404, 405), path


def test_reject_blank_reason_422(db_session):
    depot, product, creator, approver, _pso = _seed(db_session, "7")
    doc = _sg(db_session, depot, product, creator, "SG-F4B-7")
    apply_transition(db_session, "sample_gift", doc.id, "submit", creator)
    db_session.commit()
    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "reject", approver, reason="   ")
    assert exc.value.status_code == 422
    db_session.rollback()
    db_session.refresh(doc)
    assert doc.status == "Submitted"


def test_approve_from_draft_and_submit_from_terminal(db_session):
    depot, product, creator, approver, _pso = _seed(db_session, "8")
    doc = _sg(db_session, depot, product, creator, "SG-F4B-8")
    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "approve", approver)
    assert exc.value.status_code == 409
    apply_transition(db_session, "sample_gift", doc.id, "submit", creator)
    apply_transition(db_session, "sample_gift", doc.id, "approve", approver)
    db_session.commit()
    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "submit", creator)
    assert exc.value.status_code == 409
    db_session.rollback()
    db_session.refresh(doc)
    assert doc.status == "Approved"


def test_submit_from_rejected_409(db_session):
    depot, product, creator, approver, _pso = _seed(db_session, "9")
    doc = _sg(db_session, depot, product, creator, "SG-F4B-9")
    apply_transition(db_session, "sample_gift", doc.id, "submit", creator)
    apply_transition(db_session, "sample_gift", doc.id, "reject", approver, reason="no")
    db_session.commit()
    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "submit", creator)
    assert exc.value.status_code == 409


def test_repeated_approve_and_reject_idempotent(db_session):
    depot, product, creator, approver, _pso = _seed(db_session, "10")
    approved = _sg(db_session, depot, product, creator, "SG-F4B-10A")
    apply_transition(db_session, "sample_gift", approved.id, "submit", creator)
    apply_transition(db_session, "sample_gift", approved.id, "approve", approver)
    db_session.commit()
    n_appr = db_session.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_APPROVED").count()
    again = apply_transition(db_session, "sample_gift", approved.id, "approve", approver)
    db_session.commit()
    assert again["idempotent"] is True
    assert db_session.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_APPROVED").count() == n_appr

    rejected = _sg(db_session, depot, product, creator, "SG-F4B-10R")
    apply_transition(db_session, "sample_gift", rejected.id, "submit", creator)
    apply_transition(db_session, "sample_gift", rejected.id, "reject", approver, reason="dup")
    db_session.commit()
    n_rej = db_session.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_REJECTED").count()
    again_r = apply_transition(db_session, "sample_gift", rejected.id, "reject", approver, reason="dup")
    db_session.commit()
    assert again_r["idempotent"] is True
    assert db_session.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_REJECTED").count() == n_rej


def test_billing_role_cannot_submit(db_session):
    depot, product, creator, _approver, _pso = _seed(db_session, "11")
    billing = Employee(
        employee_id="F4B-BILL",
        first_name="Bill",
        email="f4b-bill@test.com",
        hashed_password=get_password_hash("x"),
        role="billing",
        depot_id=depot.id,
        is_active=True,
        is_blocked=False,
    )
    db_session.add(billing)
    db_session.commit()
    db_session.refresh(billing)
    doc = _sg(db_session, depot, product, creator, "SG-F4B-11")
    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "submit", billing)
    assert exc.value.status_code == 403


def test_missing_user_401(db_session):
    depot, product, creator, _a, _p = _seed(db_session, "12")
    doc = _sg(db_session, depot, product, creator, "SG-F4B-12")
    with pytest.raises(HTTPException) as exc:
        apply_transition(db_session, "sample_gift", doc.id, "submit", None)
    assert exc.value.status_code == 401
    db_session.refresh(doc)
    assert doc.status == "Draft"


def test_rollback_reverts_status_and_audit(db_session):
    depot, product, creator, _a, _p = _seed(db_session, "13")
    before_audit = db_session.query(AuditLog).count()
    doc = _sg(db_session, depot, product, creator, "SG-F4B-13")
    apply_transition(db_session, "sample_gift", doc.id, "submit", creator)
    db_session.rollback()
    db_session.refresh(doc)
    assert doc.status == "Draft"
    assert db_session.query(AuditLog).count() == before_audit


def test_audit_fields_on_submit(db_session):
    depot, product, creator, _a, _p = _seed(db_session, "14")
    doc = _sg(db_session, depot, product, creator, "SG-F4B-14")
    apply_transition(db_session, "sample_gift", doc.id, "submit", creator, remarks="ok")
    db_session.commit()
    row = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "SAMPLE_GIFT_SUBMITTED", AuditLog.entity_id == str(doc.id))
        .first()
    )
    assert row is not None
    assert row.user_id == creator.id
    assert "Creator" in (row.user_name or "")
    assert row.role_name == "manager"
    assert row.entity_type == "sample_gift_delivery"
    assert row.depot_id == depot.id
    assert row.old_value["status"] == "Draft"
    assert row.new_value["status"] == "Submitted"
    assert row.created_at is not None
    assert row.remarks == "ok"
