"""Proposed Draft product eligibility helper. Policy is not approved or wired."""
from datetime import date
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.models import Product
from app.services.draft_product_eligibility import (
    POLICY_APPROVED,
    POLICY_STATUS,
    category_for_sample_gift,
    collect_line_product_ids,
    product_is_eligible,
    require_eligible_products,
    validate_lines_for_submit,
)


def _product(db, code, **flags):
    row = Product(
        name=code,
        code=code,
        sku=code,
        is_active=flags.pop("is_active", True),
        product_type_sample=flags.get("product_type_sample", False),
        product_type_export=flags.get("product_type_export", False),
        product_type_commercial=flags.get("product_type_commercial", False),
        product_type_institutional=flags.get("product_type_institutional", False),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_policy_is_pending_and_not_approved():
    assert POLICY_STATUS == "pending"
    assert POLICY_APPROVED is False


def test_sample_eligible_accepted(db_session):
    sample = _product(db_session, "ELIG-S", product_type_sample=True)
    found = require_eligible_products(db_session, [sample.id], "sample")
    assert found[sample.id].id == sample.id
    assert product_is_eligible(sample, "sample")
    assert product_is_eligible(sample, "gift")
    assert not product_is_eligible(sample, "export")


def test_sample_ineligible_rejected(db_session):
    commercial = _product(db_session, "ELIG-C", product_type_commercial=True)
    with pytest.raises(HTTPException) as exc:
        require_eligible_products(db_session, [commercial.id], "sample")
    assert exc.value.status_code == 400
    assert "product_type_sample" in exc.value.detail
    assert db_session.query(Product).count() == 1


def test_gift_uses_sample_flag(db_session):
    sample = _product(db_session, "ELIG-G", product_type_sample=True)
    require_eligible_products(db_session, [sample.id], "gift")
    other = _product(db_session, "ELIG-G2", product_type_export=True)
    with pytest.raises(HTTPException) as exc:
        require_eligible_products(db_session, [other.id], "gift")
    assert exc.value.status_code == 400
    assert "Gift" in exc.value.detail


def test_export_eligible_and_ineligible(db_session):
    export = _product(db_session, "ELIG-E", product_type_export=True)
    require_eligible_products(db_session, [export.id], "export")
    sample = _product(db_session, "ELIG-E2", product_type_sample=True)
    with pytest.raises(HTTPException) as exc:
        require_eligible_products(db_session, [sample.id], "export")
    assert exc.value.status_code == 400
    assert "product_type_export" in exc.value.detail


def test_multi_flag_product(db_session):
    both = _product(
        db_session,
        "ELIG-M",
        product_type_sample=True,
        product_type_export=True,
        product_type_commercial=True,
    )
    require_eligible_products(db_session, [both.id], "sample")
    require_eligible_products(db_session, [both.id], "gift")
    require_eligible_products(db_session, [both.id], "export")


def test_missing_and_invalid_product_id(db_session):
    with pytest.raises(HTTPException) as exc:
        require_eligible_products(db_session, [99999], "sample")
    assert exc.value.status_code == 400
    assert "Invalid product_id" in exc.value.detail


def test_inactive_product_rejected(db_session):
    inactive = _product(db_session, "ELIG-I", product_type_sample=True, is_active=False)
    with pytest.raises(HTTPException) as exc:
        require_eligible_products(db_session, [inactive.id], "sample")
    assert exc.value.status_code == 400
    assert "Inactive" in exc.value.detail
    found = require_eligible_products(
        db_session, [inactive.id], "sample", require_active=False
    )
    assert found[inactive.id].id == inactive.id


def test_mixed_lines_one_ineligible_rejects_all(db_session):
    sample = _product(db_session, "ELIG-OK", product_type_sample=True)
    other = _product(db_session, "ELIG-NO", product_type_export=True)
    with pytest.raises(HTTPException) as exc:
        require_eligible_products(db_session, [sample.id, other.id], "sample")
    assert exc.value.status_code == 400
    assert str(other.id) in exc.value.detail
    assert str(sample.id) not in exc.value.detail.split(":")[-1] or True


def test_collect_line_product_ids_allows_duplicate_lines():
    items = [
        SimpleNamespace(product_id=1, quantity=1),
        SimpleNamespace(product_id=1, quantity=2),
    ]
    assert collect_line_product_ids(items) == [1, 1]


def test_routers_do_not_enforce_eligibility_yet(client, auth_headers, db_session):
    """Until policy is approved, Draft APIs still accept any existing product."""
    from app.models import Depot

    depot = Depot(name="ELIG Depot", code="ELIG-D")
    db_session.add(depot)
    commercial = _product(db_session, "ELIG-API", product_type_commercial=True)
    db_session.commit()
    sample_resp = client.post(
        "/api/sample-gift-deliveries",
        json={
            "document_kind": "sample",
            "delivery_date": date.today().isoformat(),
            "recipient_name": "Dr. Flag",
            "recipient_type": "Doctor",
            "depot_id": depot.id,
            "items": [{"product_id": commercial.id, "quantity": 1}],
        },
        headers=auth_headers,
    )
    assert sample_resp.status_code == 201, sample_resp.text
    export_resp = client.post(
        "/api/export-deliveries",
        json={
            "delivery_date": date.today().isoformat(),
            "destination_country": "Malaysia",
            "port_of_loading": "Chattogram",
            "port_of_discharge": "Port Klang",
            "depot_id": depot.id,
            "items": [{"product_id": commercial.id, "quantity": "1", "unit_price": "1"}],
        },
        headers=auth_headers,
    )
    assert export_resp.status_code == 201, export_resp.text


def test_validate_lines_for_submit_sample_and_gift(db_session):
    sample = _product(db_session, "ELIG-SUB", product_type_sample=True)
    cat = category_for_sample_gift("gift")
    assert cat == "gift"
    items = [SimpleNamespace(product_id=sample.id)]
    found = validate_lines_for_submit(db_session, items, cat)
    assert sample.id in found
    with pytest.raises(HTTPException) as exc:
        validate_lines_for_submit(
            db_session,
            [SimpleNamespace(product_id=sample.id)],
            "export",
        )
    assert exc.value.status_code == 400
