"""Disposable PostgreSQL concurrency for F.4D-DEV isolated fulfillment.

Never connects to swift_distro_hub.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal

import pytest
from sqlalchemy import event
from sqlalchemy.orm import sessionmaker

from app.services.isolated_fulfillment_simulation import (
    FulfillmentActor,
    FulfillmentPolicy,
    IsoFulfillmentAuditRow,
    PostgresFulfillmentStore,
)
from app.services.isolated_inventory_simulation import (
    FORBIDDEN_DATABASES,
    PostgresInventoryStore,
    SimulationError,
    SimulationPolicy,
    create_isolated_schema,
    drop_isolated_schema,
)
from tests.test_f4c_dev_pg_inventory_concurrency import (
    CONTAINER,
    DB_NAME,
    DB_PASS,
    DB_USER,
    HOST_PORT,
    TODAY,
    _docker,
    _wait_engine,
)
import os

INV = SimulationPolicy(as_of=TODAY, skip_expired=True, no_expiry="reject")
FUL = FulfillmentPolicy(as_of=TODAY)
ACTOR = FulfillmentActor(actor_id=9, role="warehouse", depot_id=1)


@pytest.fixture(scope="module")
def pg_engine():
    supplied = os.getenv("F4C_DEV_DATABASE_URL") or os.getenv("F4D_DEV_DATABASE_URL")
    started_container = False
    if supplied:
        url = supplied
        if "swift_distro_hub" in url:
            pytest.fail("disposable URL must not point at swift_distro_hub")
    else:
        if _docker("info").returncode != 0:
            pytest.skip("docker is required for F.4D-DEV PostgreSQL concurrency tests")
        _docker("rm", "-f", CONTAINER)
        run = _docker(
            "run",
            "-d",
            "--name",
            CONTAINER,
            "-e",
            f"POSTGRES_USER={DB_USER}",
            "-e",
            f"POSTGRES_PASSWORD={DB_PASS}",
            "-e",
            f"POSTGRES_DB={DB_NAME}",
            "-p",
            f"127.0.0.1:{HOST_PORT}:5432",
            "postgres:16-alpine",
        )
        if run.returncode != 0:
            pytest.fail(run.stderr or run.stdout or "failed to start f4c_dev_pg")
        started_container = True
        url = f"postgresql://{DB_USER}:{DB_PASS}@127.0.0.1:{HOST_PORT}/{DB_NAME}"
    engine = None
    try:
        engine = _wait_engine(url)
        dbname = engine.url.database or ""
        assert dbname not in FORBIDDEN_DATABASES
        assert dbname.startswith("f4c") or dbname.startswith("f4d")
        yield engine
    finally:
        if engine is not None:
            engine.dispose()
        if started_container:
            _docker("rm", "-f", CONTAINER)


@pytest.fixture
def pg_factory(pg_engine):
    drop_isolated_schema(pg_engine)
    create_isolated_schema(pg_engine)
    return sessionmaker(bind=pg_engine, autocommit=False, autoflush=False)


def _seed_reserved(Factory, *, lot_id, product_id, qty, document_id, key):
    db = Factory()
    try:
        store = PostgresInventoryStore(db)
        store.add_lot(
            lot_id=lot_id,
            depot_id=1,
            product_id=product_id,
            batch_no=f"B{lot_id}",
            expiry_date=TODAY + timedelta(days=20),
            quantity=qty,
            available=qty,
        )
        reserved = store.reserve(
            document_kind="sample_gift",
            document_id=document_id,
            product_id=product_id,
            depot_id=1,
            qty=Decimal(str(qty)),
            idempotency_key=key,
            policy=INV,
        )
        db.commit()
        return reserved.reservation_id
    finally:
        db.close()


def test_two_pickers_same_reservation(pg_factory):
    rid = _seed_reserved(pg_factory, lot_id=1, product_id=1, qty=12, document_id="SG-P1", key="r1")

    def attempt(i):
        db = pg_factory()
        try:
            store = PostgresFulfillmentStore(db, FUL)
            store.start_pick(rid, ACTOR, f"pick-{i}")
            db.commit()
            return "ok"
        except SimulationError as exc:
            db.rollback()
            return exc.code
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, (1, 2)))
    assert results.count("ok") == 1
    assert "conflict" in results or results.count("ok") == 1


def test_concurrent_issue_attempts(pg_factory):
    rid = _seed_reserved(pg_factory, lot_id=2, product_id=2, qty=9, document_id="SG-I1", key="ri")
    db = pg_factory()
    try:
        store = PostgresFulfillmentStore(db, FUL)
        pick = store.start_pick(rid, ACTOR, "p-i")
        store.confirm_pick(pick.fulfillment_id, ACTOR, {2: Decimal("9")})
        db.commit()
        fid = pick.fulfillment_id
    finally:
        db.close()

    def attempt(i):
        session = pg_factory()
        try:
            store = PostgresFulfillmentStore(session, FUL)
            store.issue(fid, ACTOR, f"iss-{i}")
            session.commit()
            return "ok"
        except SimulationError as exc:
            session.rollback()
            return exc.code
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, (1, 2)))
    assert results.count("ok") == 1
    assert results.count("conflict") == 1


def test_concurrent_delivery_confirmations(pg_factory):
    rid = _seed_reserved(pg_factory, lot_id=3, product_id=3, qty=6, document_id="SG-D1", key="rd")
    db = pg_factory()
    try:
        store = PostgresFulfillmentStore(db, FUL)
        pick = store.start_pick(rid, ACTOR, "p-d")
        store.confirm_pick(pick.fulfillment_id, ACTOR, {3: Decimal("6")})
        store.issue(pick.fulfillment_id, ACTOR, "iss-d")
        store.dispatch(pick.fulfillment_id, ACTOR, "disp-d")
        db.commit()
        fid = pick.fulfillment_id
    finally:
        db.close()

    def attempt(i):
        session = pg_factory()
        try:
            store = PostgresFulfillmentStore(session, FUL)
            store.confirm_delivery(fid, ACTOR, f"del-{i}")
            session.commit()
            return "ok"
        except SimulationError as exc:
            session.rollback()
            return exc.code
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, (1, 2)))
    assert results.count("ok") == 1
    assert results.count("conflict") == 1


def test_audit_insert_failure_rolls_back_issue(pg_factory):
    rid = _seed_reserved(pg_factory, lot_id=4, product_id=4, qty=5, document_id="SG-A1", key="ra")
    db = pg_factory()
    try:
        store = PostgresFulfillmentStore(db, FUL)
        pick = store.start_pick(rid, ACTOR, "p-a")
        store.confirm_pick(pick.fulfillment_id, ACTOR, {4: Decimal("5")})
        db.commit()

        def boom(*_a, **_k):
            raise RuntimeError("audit boom")

        event.listen(IsoFulfillmentAuditRow, "before_insert", boom)
        try:
            with pytest.raises(RuntimeError, match="audit boom"):
                store.issue(pick.fulfillment_id, ACTOR, "iss-a")
                db.commit()
            db.rollback()
        finally:
            event.remove(IsoFulfillmentAuditRow, "before_insert", boom)

        from app.services.isolated_inventory_simulation import IsoLotRow, IsoReservationRow

        lot = db.get(IsoLotRow, 4)
        header = db.get(IsoReservationRow, rid)
        assert Decimal(str(lot.reserved)) == Decimal("5")
        assert Decimal(str(lot.quantity)) == Decimal("5")
        assert header.status == "RESERVED"
    finally:
        db.close()
