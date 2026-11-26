"""Disposable PostgreSQL concurrency for F.4C-DEV document reservation.

Never connects to swift_distro_hub. Reuses container name f4c_dev_pg.
"""
from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import event
from sqlalchemy.orm import sessionmaker

from app.auth import get_password_hash
from app.database import Base
from app.models import Depot, Employee, Product, SampleGiftDelivery, SampleGiftDeliveryItem
import app.models  # noqa: F401
import app.models_platform  # noqa: F401
from app.services.isolated_document_reservation import (
    assert_synthetic_inventory_integrity,
    release_reservation,
    reserve_for_document,
)
from app.services.isolated_inventory_simulation import (
    FORBIDDEN_DATABASES,
    IsoLotRow,
    IsoReservationAuditRow,
    IsoReservationRow,
    PostgresInventoryStore,
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
def pg_docs(pg_engine):
    dbname = pg_engine.url.database or ""
    assert dbname not in FORBIDDEN_DATABASES
    Base.metadata.create_all(pg_engine)
    drop_isolated_schema(pg_engine)
    create_isolated_schema(pg_engine)
    Factory = sessionmaker(bind=pg_engine, autocommit=False, autoflush=False)
    yield Factory
    drop_isolated_schema(pg_engine)


def _seed_world(Factory, *, available=50, second_available=0, qty=50, extra_product=False):
    tag = uuid4().hex[:8]
    db = Factory()
    try:
        depot = Depot(name=f"F4C PG Depot {tag}", code=f"F4C{tag[:6]}")
        db.add(depot)
        db.flush()
        product = Product(
            name=f"F4C PG Sample {tag}",
            code=f"F4C-S-{tag}",
            sku=f"F4C-S-{tag}",
            product_type_sample=True,
            is_active=True,
        )
        db.add(product)
        other = None
        if extra_product:
            other = Product(
                name=f"F4C PG Sample B {tag}",
                code=f"F4C-B-{tag}",
                sku=f"F4C-B-{tag}",
                product_type_sample=True,
                is_active=True,
            )
            db.add(other)
        admin = Employee(
            employee_id=f"F4CPG-{tag}",
            first_name="PG",
            last_name="Admin",
            email=f"f4c.pg.{tag}@example.com",
            hashed_password=get_password_hash("IsoPass!9"),
            role="admin",
            depot_id=None,
            is_active=True,
            is_blocked=False,
        )
        db.add(admin)
        db.flush()
        store = PostgresInventoryStore(db)
        lot = store.add_lot(
            depot_id=depot.id,
            product_id=product.id,
            batch_no="PG-EARLY",
            expiry_date=TODAY + timedelta(days=10),
            quantity=available,
            available=available,
        )
        lot2 = None
        if extra_product:
            lot2 = store.add_lot(
                depot_id=depot.id,
                product_id=other.id,
                batch_no="PG-B",
                expiry_date=TODAY + timedelta(days=12),
                quantity=second_available,
                available=second_available,
            )
        doc = SampleGiftDelivery(
            delivery_number=f"SG-PG-1-{tag}",
            depot_id=depot.id,
            document_kind="sample",
            status="Approved",
            delivery_date=TODAY,
            recipient_name="PG Recipient",
            recipient_type="Doctor",
            created_by=admin.id,
        )
        db.add(doc)
        db.flush()
        db.add(
            SampleGiftDeliveryItem(
                delivery_id=doc.id,
                product_id=product.id,
                quantity=qty,
            )
        )
        if extra_product:
            db.add(
                SampleGiftDeliveryItem(
                    delivery_id=doc.id,
                    product_id=other.id,
                    quantity=5,
                )
            )
        doc2 = SampleGiftDelivery(
            delivery_number=f"SG-PG-2-{tag}",
            depot_id=depot.id,
            document_kind="sample",
            status="Approved",
            delivery_date=TODAY,
            recipient_name="PG Recipient 2",
            recipient_type="Doctor",
            created_by=admin.id,
        )
        db.add(doc2)
        db.flush()
        db.add(
            SampleGiftDeliveryItem(
                delivery_id=doc2.id,
                product_id=product.id,
                quantity=qty,
            )
        )
        db.commit()
        db.refresh(admin)
        db.refresh(doc)
        db.refresh(doc2)
        db.refresh(product)
        return {
            "admin_id": admin.id,
            "doc_id": doc.id,
            "doc2_id": doc2.id,
            "product_id": product.id,
            "lot_id": lot.lot_id,
            "lot2_id": None if lot2 is None else lot2.lot_id,
            "depot_id": depot.id,
        }
    finally:
        db.close()


def test_two_documents_last_units(pg_docs):
    world = _seed_world(pg_docs, available=50, qty=50)

    def attempt(doc_id, key):
        db = pg_docs()
        try:
            actor = db.get(Employee, world["admin_id"])
            reserve_for_document(db, "sample_gift", doc_id, actor, key)
            db.commit()
            return "ok"
        except HTTPException as exc:
            db.rollback()
            return str(exc.status_code)
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(
                lambda pair: attempt(*pair),
                ((world["doc_id"], "k1"), (world["doc2_id"], "k2")),
            )
        )
    assert sorted(results) == ["409", "ok"]
    db = pg_docs()
    try:
        lot = db.get(IsoLotRow, world["lot_id"])
        assert Decimal(str(lot.reserved)) == Decimal("50")
        assert Decimal(str(lot.available)) == Decimal("0")
        assert_synthetic_inventory_integrity(db, context="two docs")
    finally:
        db.close()


def test_same_document_same_idempotency_concurrent(pg_docs):
    world = _seed_world(pg_docs, available=20, qty=10)

    def attempt(_):
        db = pg_docs()
        try:
            actor = db.get(Employee, world["admin_id"])
            body = reserve_for_document(db, "sample_gift", world["doc_id"], actor, "same-key")
            db.commit()
            return body["reservation_id"]
        except HTTPException as exc:
            db.rollback()
            return f"err-{exc.status_code}"
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, (1, 2)))
    ids = [r for r in results if not str(r).startswith("err-")]
    assert len(set(ids)) == 1
    db = pg_docs()
    try:
        lot = db.get(IsoLotRow, world["lot_id"])
        assert Decimal(str(lot.reserved)) == Decimal("10")
        assert db.query(IsoReservationRow).filter_by(status="RESERVED").count() == 1
        assert_synthetic_inventory_integrity(db, context="same key")
    finally:
        db.close()


def test_same_document_different_idempotency_concurrent(pg_docs):
    world = _seed_world(pg_docs, available=40, qty=10)

    def attempt(key):
        db = pg_docs()
        try:
            actor = db.get(Employee, world["admin_id"])
            reserve_for_document(db, "sample_gift", world["doc_id"], actor, key)
            db.commit()
            return "ok"
        except HTTPException as exc:
            db.rollback()
            return str(exc.status_code)
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, ("a", "b")))
    assert results.count("ok") == 1
    assert results.count("409") == 1


def test_release_twice_and_reserve_release_race(pg_docs):
    world = _seed_world(pg_docs, available=15, qty=15)
    db = pg_docs()
    try:
        actor = db.get(Employee, world["admin_id"])
        body = reserve_for_document(db, "sample_gift", world["doc_id"], actor, "rel")
        db.commit()
        rid = body["reservation_id"]
    finally:
        db.close()

    def release():
        session = pg_docs()
        try:
            actor = session.get(Employee, world["admin_id"])
            release_reservation(session, rid, actor)
            session.commit()
            return "released"
        except HTTPException as exc:
            session.rollback()
            return str(exc.status_code)
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: release(), (1, 2)))
    assert results.count("released") == 2
    db = pg_docs()
    try:
        lot = db.get(IsoLotRow, world["lot_id"])
        assert Decimal(str(lot.reserved)) == Decimal("0")
        assert Decimal(str(lot.available)) == Decimal("15")
        audits = db.query(IsoReservationAuditRow).filter_by(reservation_id=rid, action="RELEASE").count()
        assert audits == 1
        assert_synthetic_inventory_integrity(db, context="double release")
    finally:
        db.close()


def test_multi_product_all_or_nothing(pg_docs):
    world = _seed_world(pg_docs, available=20, second_available=0, qty=5, extra_product=True)
    db = pg_docs()
    try:
        actor = db.get(Employee, world["admin_id"])
        try:
            reserve_for_document(db, "sample_gift", world["doc_id"], actor, "both")
            db.commit()
            pytest.fail("expected insufficient")
        except HTTPException as exc:
            db.rollback()
            assert exc.status_code == 409
        lot = db.get(IsoLotRow, world["lot_id"])
        assert Decimal(str(lot.reserved)) == Decimal("0")
        assert db.query(IsoReservationRow).count() == 0
        assert_synthetic_inventory_integrity(db, context="all or nothing")
    finally:
        db.close()


def test_audit_insert_failure_rolls_back(pg_docs):
    world = _seed_world(pg_docs, available=8, qty=4)
    db = pg_docs()

    def boom(*_args, **_kwargs):
        raise RuntimeError("audit boom")

    event.listen(IsoReservationAuditRow, "before_insert", boom)
    try:
        actor = db.get(Employee, world["admin_id"])
        with pytest.raises(RuntimeError, match="audit boom"):
            reserve_for_document(db, "sample_gift", world["doc_id"], actor, "aud")
            db.commit()
        db.rollback()
        lot = db.get(IsoLotRow, world["lot_id"])
        assert Decimal(str(lot.reserved)) == Decimal("0")
        assert db.query(IsoReservationRow).count() == 0
    finally:
        event.remove(IsoReservationAuditRow, "before_insert", boom)
        db.close()


def test_stock_change_under_lock(pg_docs):
    world = _seed_world(pg_docs, available=10, qty=10)
    dest = None
    db = pg_docs()
    try:
        store = PostgresInventoryStore(db)
        dest = store.add_lot(
            depot_id=world["depot_id"],
            product_id=world["product_id"],
            batch_no="DEST",
            expiry_date=TODAY + timedelta(days=40),
            quantity=0,
            available=0,
        )
        db.commit()
        dest_id = dest.lot_id
    finally:
        db.close()

    def reserve():
        session = pg_docs()
        try:
            actor = session.get(Employee, world["admin_id"])
            reserve_for_document(session, "sample_gift", world["doc_id"], actor, "chg")
            session.commit()
            return "reserved"
        except HTTPException as exc:
            session.rollback()
            return str(exc.status_code)
        finally:
            session.close()

    def transfer():
        session = pg_docs()
        try:
            store = PostgresInventoryStore(session)
            store.transfer_available(world["lot_id"], Decimal("10"), dest_id)
            session.commit()
            return "moved"
        except Exception:
            session.rollback()
            return "fail"
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda fn: fn(), (reserve, transfer)))
    assert "reserved" in results or "moved" in results
    db = pg_docs()
    try:
        src = db.get(IsoLotRow, world["lot_id"])
        dst = db.get(IsoLotRow, dest_id)
        assert Decimal(str(src.available)) + Decimal(str(src.reserved)) == Decimal(str(src.quantity))
        assert Decimal(str(dst.available)) + Decimal(str(dst.reserved)) == Decimal(str(dst.quantity))
        assert Decimal(str(src.available)) >= 0
        assert_synthetic_inventory_integrity(db, context="stock change")
    finally:
        db.close()
