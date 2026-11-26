"""Disposable PostgreSQL concurrency for F.4B.2-DEV workflow.

Never connects to swift_distro_hub. Container name is f4b2_dev_pg only.
"""
from __future__ import annotations

import os
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.auth import get_password_hash
from app.database import Base
from app.models import Depot, Employee, Product, SampleGiftDelivery, SampleGiftDeliveryItem
import app.models_platform  # noqa: F401
from app.models_platform import AuditLog
from app.services.audit_service import AuditService
from app.services.draft_document_lock import require_draft_for_write
from app.services.draft_workflow_execution import execute_draft_workflow

CONTAINER = "f4b2_dev_pg"
DB_NAME = "f4b2_dev"
DB_USER = "f4b2"
DB_PASS = "f4b2_iso_pass"
HOST_PORT = os.getenv("F4B2_DEV_PG_PORT", "15499")
FORBIDDEN_DBS = {"swift_distro_hub"}


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
    supplied = os.getenv("F4B2_DEV_DATABASE_URL")
    started_container = False
    if supplied:
        url = supplied
        if "swift_distro_hub" in url:
            pytest.fail("F4B2_DEV_DATABASE_URL must not point at swift_distro_hub")
    else:
        if _docker("info").returncode != 0:
            pytest.skip("docker is required for F.4B.2-DEV PostgreSQL concurrency tests")
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
            pytest.fail(run.stderr or run.stdout or "failed to start f4b2_dev_pg")
        started_container = True
        url = f"postgresql://{DB_USER}:{DB_PASS}@127.0.0.1:{HOST_PORT}/{DB_NAME}"
    engine = None
    try:
        engine = _wait_engine(url)
        dbname = engine.url.database or ""
        assert dbname not in FORBIDDEN_DBS
        assert dbname.startswith("f4b2")
        yield engine
    finally:
        if engine is not None:
            engine.dispose()
        if started_container:
            _docker("rm", "-f", CONTAINER)


@pytest.fixture
def pg_factory(pg_engine):
    dbname = pg_engine.url.database
    assert dbname not in FORBIDDEN_DBS
    assert dbname != "swift_distro_hub"
    with pg_engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    Base.metadata.create_all(bind=pg_engine)
    Factory = sessionmaker(bind=pg_engine, autocommit=False, autoflush=False)
    return Factory


def _seed(Factory):
    db = Factory()
    try:
        depot = Depot(name="PG Depot", code="F4B2-PG")
        db.add(depot)
        db.flush()
        product = Product(
            name="PG Sample",
            code="F4B2-PG-S",
            sku="F4B2-PG-S",
            product_type_sample=True,
            is_active=True,
        )
        db.add(product)
        db.flush()
        creator = Employee(
            employee_id="F4B2-PG-C",
            first_name="Creator",
            last_name="PG",
            email="test.creator.manager@example.com",
            hashed_password=get_password_hash("IsoPass!9"),
            role="manager",
            depot_id=depot.id,
            is_active=True,
            is_blocked=False,
        )
        approver = Employee(
            employee_id="F4B2-PG-A",
            first_name="Approver",
            last_name="PG",
            email="test.operations.owner@example.com",
            hashed_password=get_password_hash("IsoPass!9"),
            role="manager",
            depot_id=depot.id,
            is_active=True,
            is_blocked=False,
        )
        db.add_all([creator, approver])
        db.commit()
        db.refresh(depot)
        db.refresh(product)
        db.refresh(creator)
        db.refresh(approver)
        return depot, product, creator, approver
    finally:
        db.close()


def _draft(Factory, depot, product, creator, number):
    db = Factory()
    try:
        row = SampleGiftDelivery(
            delivery_number=number,
            depot_id=depot.id,
            document_kind="sample",
            status="Draft",
            delivery_date=date.today(),
            recipient_name="PG",
            recipient_type="Doctor",
            created_by=creator.id,
        )
        db.add(row)
        db.flush()
        db.add(SampleGiftDeliveryItem(delivery_id=row.id, product_id=product.id, quantity=1))
        db.commit()
        db.refresh(row)
        return row.id
    finally:
        db.close()


def _reload_users(Factory, creator_id, approver_id):
    db = Factory()
    try:
        creator = db.get(Employee, creator_id)
        approver = db.get(Employee, approver_id)
        for row in {creator, approver}:
            if row is not None:
                db.expunge(row)
        return creator, approver
    finally:
        db.close()


def test_two_simultaneous_submits(pg_factory):
    depot, product, creator, _approver = _seed(pg_factory)
    doc_id = _draft(pg_factory, depot, product, creator, "SG-PG-SUB")
    creator_d, _ = _reload_users(pg_factory, creator.id, creator.id)

    def worker():
        db = pg_factory()
        try:
            execute_draft_workflow(db, "sample_gift", doc_id, "submit", creator_d)
            db.commit()
            return "ok"
        except HTTPException as exc:
            db.rollback()
            return exc.status_code
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: worker(), range(2)))
    db = pg_factory()
    try:
        status = db.get(SampleGiftDelivery, doc_id).status
        audits = db.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_SUBMITTED").count()
    finally:
        db.close()
    assert status == "Submitted"
    assert audits == 1
    assert "ok" in results
    assert set(results) <= {"ok", 409}


def test_two_simultaneous_approves(pg_factory):
    depot, product, creator, approver = _seed(pg_factory)
    doc_id = _draft(pg_factory, depot, product, creator, "SG-PG-APPR")
    creator_d, approver_d = _reload_users(pg_factory, creator.id, approver.id)
    db = pg_factory()
    try:
        execute_draft_workflow(db, "sample_gift", doc_id, "submit", creator_d)
        db.commit()
    finally:
        db.close()

    def worker():
        session = pg_factory()
        try:
            execute_draft_workflow(session, "sample_gift", doc_id, "approve", approver_d)
            session.commit()
            return "ok"
        except HTTPException as exc:
            session.rollback()
            return exc.status_code
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: worker(), range(2)))
    db = pg_factory()
    try:
        status = db.get(SampleGiftDelivery, doc_id).status
        audits = db.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_APPROVED").count()
    finally:
        db.close()
    assert status == "Approved"
    assert audits == 1
    assert "ok" in results


def test_approve_and_reject_concurrent(pg_factory):
    depot, product, creator, approver = _seed(pg_factory)
    doc_id = _draft(pg_factory, depot, product, creator, "SG-PG-RACE")
    creator_d, approver_d = _reload_users(pg_factory, creator.id, approver.id)
    db = pg_factory()
    try:
        execute_draft_workflow(db, "sample_gift", doc_id, "submit", creator_d)
        db.commit()
    finally:
        db.close()

    def approve():
        session = pg_factory()
        try:
            execute_draft_workflow(session, "sample_gift", doc_id, "approve", approver_d)
            session.commit()
            return "approve"
        except HTTPException as exc:
            session.rollback()
            return exc.status_code
        finally:
            session.close()

    def reject():
        session = pg_factory()
        try:
            execute_draft_workflow(
                session, "sample_gift", doc_id, "reject", approver_d, reason="race"
            )
            session.commit()
            return "reject"
        except HTTPException as exc:
            session.rollback()
            return exc.status_code
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        fut_a = pool.submit(approve)
        fut_r = pool.submit(reject)
        outcomes = {fut_a.result(), fut_r.result()}
    db = pg_factory()
    try:
        status = db.get(SampleGiftDelivery, doc_id).status
        approved = db.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_APPROVED").count()
        rejected = db.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_REJECTED").count()
    finally:
        db.close()
    assert status in ("Approved", "Rejected")
    assert approved + rejected == 1
    assert 409 in outcomes
    assert ("approve" in outcomes) ^ ("reject" in outcomes)


def test_submit_versus_put(pg_factory):
    depot, product, creator, _approver = _seed(pg_factory)
    doc_id = _draft(pg_factory, depot, product, creator, "SG-PG-PUT")
    creator_d, _ = _reload_users(pg_factory, creator.id, creator.id)

    def submit():
        session = pg_factory()
        try:
            execute_draft_workflow(session, "sample_gift", doc_id, "submit", creator_d)
            session.commit()
            return "submit"
        except HTTPException as exc:
            session.rollback()
            return exc.status_code
        finally:
            session.close()

    def put():
        session = pg_factory()
        try:
            row = require_draft_for_write(session, SampleGiftDelivery, doc_id, creator_d)
            row.recipient_name = "Mutated After Submit"
            session.commit()
            return "put"
        except HTTPException as exc:
            session.rollback()
            return exc.status_code
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        fut_s = pool.submit(submit)
        fut_p = pool.submit(put)
        outcomes = {fut_s.result(), fut_p.result()}
    db = pg_factory()
    try:
        row = db.get(SampleGiftDelivery, doc_id)
        status = row.status
        name = row.recipient_name
        audits = db.query(AuditLog).filter(AuditLog.action == "SAMPLE_GIFT_SUBMITTED").count()
    finally:
        db.close()
    assert status in ("Draft", "Submitted")
    if status == "Submitted":
        assert audits == 1
        if "put" in outcomes and 409 not in outcomes:
            assert name == "Mutated After Submit"
        if 409 in outcomes and "put" not in outcomes:
            assert name == "PG"
    if status == "Draft":
        assert "put" in outcomes


def test_transaction_rollback_and_invalid_product(pg_factory):
    depot, product, creator, _approver = _seed(pg_factory)
    doc_id = _draft(pg_factory, depot, product, creator, "SG-PG-RB")
    creator_d, _ = _reload_users(pg_factory, creator.id, creator.id)
    db = pg_factory()
    try:
        execute_draft_workflow(db, "sample_gift", doc_id, "submit", creator_d)
        db.rollback()
        db.expire_all()
        assert db.get(SampleGiftDelivery, doc_id).status == "Draft"
        assert db.query(AuditLog).count() == 0
        db.execute(text("UPDATE products SET product_type_sample = false WHERE id = :id"), {"id": product.id})
        db.commit()
        with pytest.raises(HTTPException) as exc:
            execute_draft_workflow(db, "sample_gift", doc_id, "submit", creator_d)
        assert exc.value.status_code == 400
        db.rollback()
        assert db.get(SampleGiftDelivery, doc_id).status == "Draft"
    finally:
        db.close()


def test_audit_failure_and_self_approval(pg_factory, monkeypatch):
    depot, product, creator, approver = _seed(pg_factory)
    doc_id = _draft(pg_factory, depot, product, creator, "SG-PG-AUD")
    creator_d, approver_d = _reload_users(pg_factory, creator.id, approver.id)
    db = pg_factory()
    try:
        def boom(*_a, **_k):
            raise RuntimeError("pg audit fail")

        monkeypatch.setattr(AuditService, "log_action", boom)
        with pytest.raises(RuntimeError):
            execute_draft_workflow(db, "sample_gift", doc_id, "submit", creator_d)
        db.rollback()
        assert db.get(SampleGiftDelivery, doc_id).status == "Draft"
        monkeypatch.undo()
        execute_draft_workflow(db, "sample_gift", doc_id, "submit", creator_d)
        db.commit()
        with pytest.raises(HTTPException) as exc:
            execute_draft_workflow(db, "sample_gift", doc_id, "approve", creator_d)
        assert exc.value.status_code == 403
        db.rollback()
        assert db.get(SampleGiftDelivery, doc_id).status == "Submitted"
        execute_draft_workflow(db, "sample_gift", doc_id, "approve", approver_d)
        db.commit()
        assert db.get(SampleGiftDelivery, doc_id).status == "Approved"
    finally:
        db.close()
