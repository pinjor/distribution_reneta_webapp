"""Disposable PostgreSQL concurrency for F.4C-DEV isolated inventory simulation.

Never connects to swift_distro_hub. Container name is f4c_dev_pg only.
"""
from __future__ import annotations

import os
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.services.isolated_inventory_simulation import (
    FORBIDDEN_DATABASES,
    PostgresInventoryStore,
    SimulationError,
    SimulationPolicy,
    create_isolated_schema,
    drop_isolated_schema,
)

CONTAINER = "f4c_dev_pg"
DB_NAME = "f4c_dev"
DB_USER = "f4c"
DB_PASS = "f4c_iso_pass"
HOST_PORT = os.getenv("F4C_DEV_PG_PORT", "15501")
TODAY = date(2026, 11, 26)
POLICY = SimulationPolicy(as_of=TODAY, skip_expired=True, no_expiry="reject")


def _docker(*args: str) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(
            ["docker", *args],
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        return subprocess.CompletedProcess(["docker", *args], 127, "", "docker not found")


def _wait_engine(url: str):
    last = None
    for _ in range(60):
        engine = create_engine(url, pool_pre_ping=True)
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return engine
        except Exception as exc:
            last = exc
            engine.dispose()
            time.sleep(1)
    raise RuntimeError(f"disposable postgres not ready: {last}")


@pytest.fixture(scope="module")
def pg_engine():
    supplied = os.getenv("F4C_DEV_DATABASE_URL")
    started_container = False
    if supplied:
        url = supplied
        if "swift_distro_hub" in url:
            pytest.fail("F4C_DEV_DATABASE_URL must not point at swift_distro_hub")
    else:
        if _docker("info").returncode != 0:
            pytest.skip("docker is required for F.4C-DEV PostgreSQL concurrency tests")
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
        assert dbname.startswith("f4c")
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


def _seed_lot(Factory, **kwargs):
    db = Factory()
    try:
        store = PostgresInventoryStore(db)
        lot = store.add_lot(**kwargs)
        db.commit()
        return lot.lot_id
    finally:
        db.close()


def test_two_reservations_same_batch(pg_factory):
    lot_id = _seed_lot(
        pg_factory,
        lot_id=1,
        depot_id=1,
        product_id=1,
        batch_no="PG-A",
        expiry_date=TODAY + timedelta(days=20),
        quantity=90,
        available=90,
    )

    def attempt(i):
        db = pg_factory()
        try:
            store = PostgresInventoryStore(db)
            store.reserve(
                document_kind="sample_gift",
                document_id=f"PG-{i}",
                product_id=1,
                depot_id=1,
                qty=Decimal("50"),
                idempotency_key=f"pg-{i}",
                policy=POLICY,
            )
            db.commit()
            return "ok"
        except SimulationError as exc:
            db.rollback()
            return exc.code
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, (1, 2)))
    assert sorted(results) == ["insufficient", "ok"]
    db = pg_factory()
    try:
        from app.services.isolated_inventory_simulation import IsoLotRow

        row = db.get(IsoLotRow, lot_id)
        assert Decimal(str(row.available)) == Decimal("40")
        assert Decimal(str(row.reserved)) == Decimal("50")
    finally:
        db.close()


def test_simultaneous_requests_exceeding_stock(pg_factory):
    _seed_lot(
        pg_factory,
        lot_id=2,
        depot_id=1,
        product_id=2,
        batch_no="PG-B",
        expiry_date=TODAY + timedelta(days=20),
        quantity=30,
        available=30,
    )

    def attempt(i):
        db = pg_factory()
        try:
            store = PostgresInventoryStore(db)
            store.reserve(
                document_kind="export",
                document_id=f"EX-{i}",
                product_id=2,
                depot_id=1,
                qty=Decimal("30"),
                idempotency_key=f"ex-{i}",
                policy=POLICY,
            )
            db.commit()
            return "ok"
        except SimulationError:
            db.rollback()
            return "fail"
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, (1, 2)))
    assert results.count("ok") == 1
    assert results.count("fail") == 1


def test_reservation_versus_transfer(pg_factory):
    _seed_lot(
        pg_factory,
        lot_id=3,
        depot_id=1,
        product_id=3,
        batch_no="SRC",
        expiry_date=TODAY + timedelta(days=20),
        quantity=40,
        available=40,
    )
    _seed_lot(
        pg_factory,
        lot_id=4,
        depot_id=2,
        product_id=3,
        batch_no="DST",
        expiry_date=TODAY + timedelta(days=20),
        quantity=0,
        available=0,
    )

    def reserve():
        db = pg_factory()
        try:
            store = PostgresInventoryStore(db)
            store.reserve(
                document_kind="sample_gift",
                document_id="VS-T",
                product_id=3,
                depot_id=1,
                qty=Decimal("25"),
                idempotency_key="vs-t",
                policy=POLICY,
            )
            db.commit()
            return "reserve"
        except SimulationError:
            db.rollback()
            return "reserve-fail"
        finally:
            db.close()

    def transfer():
        db = pg_factory()
        try:
            store = PostgresInventoryStore(db)
            store.transfer_available(3, Decimal("25"), 4)
            db.commit()
            return "transfer"
        except SimulationError:
            db.rollback()
            return "transfer-fail"
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        a = pool.submit(reserve)
        b = pool.submit(transfer)
        results = {a.result(), b.result()}
    assert "reserve-fail" in results or "transfer-fail" in results
    assert "reserve" in results or "transfer" in results
    db = pg_factory()
    try:
        from app.services.isolated_inventory_simulation import IsoLotRow

        src = db.get(IsoLotRow, 3)
        assert Decimal(str(src.quantity)) == Decimal("40") or Decimal(str(src.quantity)) == Decimal("15")
        assert Decimal(str(src.available)) + Decimal(str(src.reserved)) == Decimal(str(src.quantity))
    finally:
        db.close()


def test_reservation_versus_issue(pg_factory):
    _seed_lot(
        pg_factory,
        lot_id=5,
        depot_id=1,
        product_id=5,
        batch_no="ISS",
        expiry_date=TODAY + timedelta(days=20),
        quantity=20,
        available=20,
    )
    db = pg_factory()
    try:
        store = PostgresInventoryStore(db)
        reserved = store.reserve(
            document_kind="export",
            document_id="ISS-1",
            product_id=5,
            depot_id=1,
            qty=Decimal("10"),
            idempotency_key="iss-1",
            policy=POLICY,
        )
        db.commit()
        rid = reserved.reservation_id
    finally:
        db.close()

    def issue():
        session = pg_factory()
        try:
            PostgresInventoryStore(session).issue(rid)
            session.commit()
            return "issue"
        except SimulationError as exc:
            session.rollback()
            return exc.code
        finally:
            session.close()

    def other_reserve():
        session = pg_factory()
        try:
            PostgresInventoryStore(session).reserve(
                document_kind="export",
                document_id="ISS-2",
                product_id=5,
                depot_id=1,
                qty=Decimal("15"),
                idempotency_key="iss-2",
                policy=POLICY,
            )
            session.commit()
            return "reserve"
        except SimulationError as exc:
            session.rollback()
            return exc.code
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = {pool.submit(issue).result(), pool.submit(other_reserve).result()}
    assert "issue" in results


def test_release_versus_issue(pg_factory):
    _seed_lot(
        pg_factory,
        lot_id=6,
        depot_id=1,
        product_id=6,
        batch_no="REL",
        expiry_date=TODAY + timedelta(days=20),
        quantity=15,
        available=15,
    )
    db = pg_factory()
    try:
        store = PostgresInventoryStore(db)
        reserved = store.reserve(
            document_kind="sample_gift",
            document_id="REL-1",
            product_id=6,
            depot_id=1,
            qty=Decimal("15"),
            idempotency_key="rel-1",
            policy=POLICY,
        )
        db.commit()
        rid = reserved.reservation_id
    finally:
        db.close()

    def release():
        session = pg_factory()
        try:
            PostgresInventoryStore(session).release(rid)
            session.commit()
            return "release"
        except SimulationError as exc:
            session.rollback()
            return f"release-{exc.code}"
        finally:
            session.close()

    def issue():
        session = pg_factory()
        try:
            PostgresInventoryStore(session).issue(rid)
            session.commit()
            return "issue"
        except SimulationError as exc:
            session.rollback()
            return f"issue-{exc.code}"
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = {pool.submit(release).result(), pool.submit(issue).result()}
    assert "release" in results or "issue" in results
    assert any(r.startswith("release-") or r.startswith("issue-") or r in {"release", "issue"} for r in results)
    db = pg_factory()
    try:
        from app.services.isolated_inventory_simulation import IsoLotRow, IsoReservationRow

        header = db.get(IsoReservationRow, rid)
        lot = db.get(IsoLotRow, 6)
        assert header.status in {"RELEASED", "ISSUED"}
        assert Decimal(str(lot.available)) + Decimal(str(lot.reserved)) == Decimal(str(lot.quantity))
        if header.status == "ISSUED":
            assert Decimal(str(lot.quantity)) == Decimal("0")
        if header.status == "RELEASED":
            assert Decimal(str(lot.available)) == Decimal("15")
    finally:
        db.close()


def test_failed_transaction_rollback(pg_factory):
    _seed_lot(
        pg_factory,
        lot_id=7,
        depot_id=1,
        product_id=7,
        batch_no="RB",
        expiry_date=TODAY + timedelta(days=20),
        quantity=12,
        available=12,
    )
    db = pg_factory()
    try:
        store = PostgresInventoryStore(db)
        store.reserve(
            document_kind="sample_gift",
            document_id="RB-1",
            product_id=7,
            depot_id=1,
            qty=Decimal("5"),
            idempotency_key="rb-1",
            policy=POLICY,
        )
        raise RuntimeError("boom")
    except RuntimeError:
        db.rollback()
    finally:
        db.close()
    db = pg_factory()
    try:
        from app.services.isolated_inventory_simulation import IsoLotRow

        row = db.get(IsoLotRow, 7)
        assert Decimal(str(row.available)) == Decimal("12")
        assert Decimal(str(row.reserved)) == Decimal("0")
    finally:
        db.close()


def test_duplicate_reservation_request(pg_factory):
    _seed_lot(
        pg_factory,
        lot_id=8,
        depot_id=1,
        product_id=8,
        batch_no="DUP",
        expiry_date=TODAY + timedelta(days=20),
        quantity=9,
        available=9,
    )
    db = pg_factory()
    try:
        store = PostgresInventoryStore(db)
        first = store.reserve(
            document_kind="export",
            document_id="DUP-1",
            product_id=8,
            depot_id=1,
            qty=Decimal("4"),
            idempotency_key="dup",
            policy=POLICY,
        )
        db.commit()
        second = store.reserve(
            document_kind="export",
            document_id="DUP-1",
            product_id=8,
            depot_id=1,
            qty=Decimal("4"),
            idempotency_key="dup",
            policy=POLICY,
        )
        db.commit()
        assert first.reservation_id == second.reservation_id
        from app.services.isolated_inventory_simulation import IsoLotRow

        row = db.get(IsoLotRow, 8)
        assert Decimal(str(row.reserved)) == Decimal("4")
    finally:
        db.close()


def test_reservation_across_multiple_batches(pg_factory):
    _seed_lot(
        pg_factory,
        lot_id=9,
        depot_id=1,
        product_id=9,
        batch_no="M1",
        expiry_date=TODAY + timedelta(days=5),
        quantity=6,
        available=6,
    )
    _seed_lot(
        pg_factory,
        lot_id=10,
        depot_id=1,
        product_id=9,
        batch_no="M2",
        expiry_date=TODAY + timedelta(days=9),
        quantity=6,
        available=6,
    )
    db = pg_factory()
    try:
        store = PostgresInventoryStore(db)
        reserved = store.reserve(
            document_kind="sample_gift",
            document_id="MULTI",
            product_id=9,
            depot_id=1,
            qty=Decimal("10"),
            idempotency_key="multi",
            policy=POLICY,
        )
        db.commit()
        assert [s.batch_no for s in reserved.slices] == ["M1", "M2"]
        assert reserved.slices[0].qty == Decimal("6")
        assert reserved.slices[1].qty == Decimal("4")
    finally:
        db.close()
