"""Disposable PostgreSQL concurrency for F.4D-DEV isolated fulfillment HTTP adapters.

Never connects to swift_distro_hub.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import event

from app.models import Employee
from app.services.isolated_document_fulfillment import (
    confirm_delivery_fulfillment,
    confirm_picking,
    dispatch_fulfillment,
    fail_delivery_fulfillment,
    issue_fulfillment,
    start_picking_for_document,
)
from app.services.isolated_document_reservation import (
    assert_synthetic_inventory_integrity,
    release_reservation,
    reserve_for_document,
)
from app.services.isolated_fulfillment_simulation import IsoFulfillmentAuditRow, IsoFulfillmentRow
from app.services.isolated_inventory_simulation import IsoLotRow
from tests.test_f4c_dev_pg_reservation_concurrency import _seed_world, pg_docs, pg_engine  # noqa: F401


def _actor(db, world):
    return db.get(Employee, world["admin_id"])


def _reserve(db, world, key="r"):
    return reserve_for_document(db, "sample_gift", world["doc_id"], _actor(db, world), key)


def test_two_users_start_picking(pg_docs):
    world = _seed_world(pg_docs, available=20, qty=10)
    db = pg_docs()
    try:
        _reserve(db, world)
        db.commit()
    finally:
        db.close()

    def attempt(key):
        session = pg_docs()
        try:
            start_picking_for_document(session, "sample_gift", world["doc_id"], _actor(session, world), key)
            session.commit()
            return "ok"
        except HTTPException as exc:
            session.rollback()
            return str(exc.status_code)
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, ("p-a", "p-b")))
    assert results.count("ok") == 1
    assert results.count("409") == 1
    db = pg_docs()
    try:
        assert db.query(IsoFulfillmentRow).count() == 1
    finally:
        db.close()


def test_concurrent_issue(pg_docs):
    world = _seed_world(pg_docs, available=20, qty=10)
    db = pg_docs()
    try:
        _reserve(db, world)
        picked = start_picking_for_document(db, "sample_gift", world["doc_id"], _actor(db, world), "p")
        slices = [{"lot_id": s["lot_id"], "picked_quantity": s["reserved_quantity"]} for s in picked["slices"]]
        confirm_picking(db, picked["fulfillment_id"], _actor(db, world), "c", slices)
        db.commit()
        fid = picked["fulfillment_id"]
    finally:
        db.close()

    def attempt(key):
        session = pg_docs()
        try:
            issue_fulfillment(session, fid, _actor(session, world), key)
            session.commit()
            return "ok"
        except HTTPException as exc:
            session.rollback()
            return str(exc.status_code)
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, ("i-a", "i-b")))
    assert results.count("ok") == 1
    assert results.count("409") == 1
    db = pg_docs()
    try:
        lot = db.get(IsoLotRow, world["lot_id"])
        assert Decimal(str(lot.reserved)) == Decimal("0")
        assert Decimal(str(lot.quantity)) == Decimal(str(lot.available))
        assert Decimal(str(lot.quantity)) == Decimal("10")
        assert_synthetic_inventory_integrity(db, context="issue race")
    finally:
        db.close()


def test_delivery_versus_fail(pg_docs):
    world = _seed_world(pg_docs, available=20, qty=10)
    db = pg_docs()
    try:
        _reserve(db, world)
        picked = start_picking_for_document(db, "sample_gift", world["doc_id"], _actor(db, world), "p")
        slices = [{"lot_id": s["lot_id"], "picked_quantity": s["reserved_quantity"]} for s in picked["slices"]]
        confirm_picking(db, picked["fulfillment_id"], _actor(db, world), "c", slices)
        issue_fulfillment(db, picked["fulfillment_id"], _actor(db, world), "i")
        dispatch_fulfillment(db, picked["fulfillment_id"], _actor(db, world), "d")
        db.commit()
        fid = picked["fulfillment_id"]
    finally:
        db.close()

    def deliver():
        session = pg_docs()
        try:
            confirm_delivery_fulfillment(
                session,
                fid,
                _actor(session, world),
                "del",
                receiver_name="A",
                delivered_quantity=None,
                confirmation_date=None,
                pod_ref=None,
                remarks=None,
            )
            session.commit()
            return "delivered"
        except HTTPException as exc:
            session.rollback()
            return str(exc.status_code)
        finally:
            session.close()

    def fail():
        session = pg_docs()
        try:
            fail_delivery_fulfillment(session, fid, _actor(session, world), "fail", "refused")
            session.commit()
            return "failed"
        except HTTPException as exc:
            session.rollback()
            return str(exc.status_code)
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(deliver)
        second = pool.submit(fail)
        results = [first.result(), second.result()]
    terminals = [r for r in results if r in {"delivered", "failed"}]
    conflicts = [r for r in results if r == "409"]
    assert len(terminals) == 1
    assert len(conflicts) == 1
    db = pg_docs()
    try:
        header = db.get(IsoFulfillmentRow, fid)
        assert header.status in {"DELIVERED", "FAILED_DELIVERY"}
    finally:
        db.close()


def test_release_versus_start_picking(pg_docs):
    world = _seed_world(pg_docs, available=20, qty=10)
    db = pg_docs()
    try:
        reserved = _reserve(db, world)
        db.commit()
        rid = reserved["reservation_id"]
    finally:
        db.close()

    def pick():
        session = pg_docs()
        try:
            start_picking_for_document(session, "sample_gift", world["doc_id"], _actor(session, world), "p")
            session.commit()
            return "pick"
        except HTTPException as exc:
            session.rollback()
            return str(exc.status_code)
        finally:
            session.close()

    def release():
        session = pg_docs()
        try:
            release_reservation(session, rid, _actor(session, world))
            session.commit()
            return "release"
        except HTTPException as exc:
            session.rollback()
            return str(exc.status_code)
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [pool.submit(pick).result(), pool.submit(release).result()]
    assert "409" in results
    assert "pick" in results or "release" in results
    db = pg_docs()
    try:
        headers = db.query(IsoFulfillmentRow).all()
        if headers:
            assert headers[0].status == "PICKING"
            lot = db.get(IsoLotRow, world["lot_id"])
            assert Decimal(str(lot.reserved)) == Decimal("10")
        else:
            lot = db.get(IsoLotRow, world["lot_id"])
            assert Decimal(str(lot.reserved)) == Decimal("0")
        assert_synthetic_inventory_integrity(db, context="release vs pick")
    finally:
        db.close()


def test_same_key_different_payload_and_audit_rollback(pg_docs):
    world = _seed_world(pg_docs, available=20, qty=10)
    db = pg_docs()
    try:
        _reserve(db, world)
        picked = start_picking_for_document(db, "sample_gift", world["doc_id"], _actor(db, world), "p")
        slices = [{"lot_id": s["lot_id"], "picked_quantity": s["reserved_quantity"]} for s in picked["slices"]]
        confirm_picking(db, picked["fulfillment_id"], _actor(db, world), "c", slices)
        db.commit()
        fid = picked["fulfillment_id"]
        lot_id = slices[0]["lot_id"]
    finally:
        db.close()

    db = pg_docs()
    try:
        confirm_picking(
            db,
            fid,
            _actor(db, world),
            "c",
            [{"lot_id": lot_id, "picked_quantity": Decimal("99")}],
        )
        pytest.fail("expected conflict")
    except HTTPException as exc:
        assert exc.status_code == 409
        db.rollback()
    finally:
        db.close()

    db = pg_docs()
    try:

        def boom(*_a, **_k):
            raise RuntimeError("audit boom")

        event.listen(IsoFulfillmentAuditRow, "before_insert", boom)
        try:
            issue_fulfillment(db, fid, _actor(db, world), "i-audit")
            pytest.fail("expected audit failure")
        except RuntimeError:
            db.rollback()
        finally:
            event.remove(IsoFulfillmentAuditRow, "before_insert", boom)
        lot = db.get(IsoLotRow, world["lot_id"])
        assert Decimal(str(lot.reserved)) == Decimal("10")
        assert db.get(IsoFulfillmentRow, fid).status == "PICKED"
    finally:
        db.close()
