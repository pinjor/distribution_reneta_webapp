"""PostgreSQL concurrency for LogiCollect. Skips unless LOGICOLLECT_PG_URL is set.

Uses independent SQLAlchemy sessions (not SQLite, not the live hub).
"""
from __future__ import annotations

import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from app.auth import get_password_hash
from app.database import get_db
from app.models import Customer, Depot, Employee, Order, OrderItem, OrderStatusEnum, Product
from app.services.logicollect import ops as lc_ops
from app.services.logicollect.errors import LcError
from logicollect_app import create_logicollect_app

PG_URL = os.environ.get("LOGICOLLECT_PG_URL", "")

pytestmark = pytest.mark.skipif(
    not PG_URL or "swift_distro_hub" in PG_URL,
    reason="LOGICOLLECT_PG_URL unset or points at live database",
)


@pytest.fixture(scope="module")
def pg_engine():
    engine = create_engine(PG_URL, pool_pre_ping=True, pool_size=8)
    names = set(inspect(engine).get_table_names())
    required = {"employees", "orders", "lc_sessions", "lc_wallets", "lc_idempotency"}
    missing = required - names
    if missing:
        pytest.skip(f"LogiCollect PG schema incomplete, missing {sorted(missing)}")
    yield engine
    engine.dispose()


@pytest.fixture
def Session(pg_engine):
    return sessionmaker(bind=pg_engine, autocommit=False, autoflush=True)


@pytest.fixture
def pg_client(Session):
    application = create_logicollect_app()

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    application.dependency_overrides[get_db] = override_get_db
    with TestClient(application) as client:
        yield client
    application.dependency_overrides.clear()


def _fresh_ids():
    tag = uuid.uuid4().hex[:8]
    return f"P{tag[:6]}", f"26{tag[:6]}"


def _seed(Session, memo: str, employee_id: str) -> None:
    db = Session()
    try:
        depot = db.query(Depot).filter_by(code="DHK").first()
        if not depot:
            depot = Depot(name="Dhaka", code="DHK")
            db.add(depot)
            db.flush()
        user = db.query(Employee).filter_by(employee_id=employee_id).first()
        if not user:
            user = Employee(
                employee_id=employee_id,
                first_name="Race",
                last_name=employee_id,
                email=f"{employee_id.lower()}@example.com",
                phone=f"019{employee_id[-8:]}"[:14],
                role="user",
                depot_id=depot.id,
                hashed_password=get_password_hash("demo123"),
                is_active=True,
                is_blocked=False,
            )
            db.add(user)
            db.flush()
        product = db.query(Product).filter_by(code="PARA500").first()
        if not product:
            product = Product(name="Paracetamol 500mg", code="PARA500", sku="PARA500", unit_of_measure="strips")
            db.add(product)
            db.flush()
        customer = db.query(Customer).filter_by(code="CUST001").first()
        if not customer:
            customer = Customer(name="ABC Pharmacy", code="CUST001", phone="01711111112")
            db.add(customer)
            db.flush()
        if db.query(Order).filter_by(memo_number=memo).first():
            db.commit()
            return
        order = Order(
            order_number=f"SO-{memo}",
            memo_number=memo,
            depot_code="DHK",
            customer_id=str(customer.id),
            customer_name=customer.name,
            customer_code=customer.code,
            pso_id="PSO1",
            pso_name="PSO",
            route_code="R1",
            route_name="Route A",
            delivery_date=date.today(),
            status=OrderStatusEnum.APPROVED,
            loaded=True,
            loading_number="L-PG-1",
            assigned_to=user.id,
        )
        db.add(order)
        db.flush()
        db.add(
            OrderItem(
                order_id=order.id,
                product_code=product.code,
                product_name=product.name,
                pack_size="strips",
                quantity=100,
                total_quantity=100,
                trade_price=50,
                unit_price=50,
                delivery_date=date.today(),
            )
        )
        db.commit()
    finally:
        db.close()


def _user(db, employee_id: str):
    return db.query(Employee).filter_by(employee_id=employee_id).one()


def _prepare_delivered(Session, memo: str, employee_id: str):
    db = Session()
    try:
        user = _user(db, employee_id)
        lc_ops.accept_one(db, user, memo)
        lc_ops.check_in(db, user, memo, None)
        order = lc_ops.resolve_order(db, user, memo)
        item = db.query(OrderItem).filter_by(order_id=order.id).first()
        lc_ops.deliver(db, user, memo, {"type": "full", "items": [{"id": str(item.id), "deliveredQty": 100}]}, None)
        db.commit()
    finally:
        db.close()


def test_pg_http_full_cash_then_wallet(pg_client, Session):
    employee_id, memo = _fresh_ids()
    _seed(Session, memo, employee_id)
    _prepare_delivered(Session, memo, employee_id)
    login = pg_client.post("/api/logicollect/v1/auth/login", json={"employeeId": employee_id, "password": "demo123"})
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['accessToken']}"}
    collect = pg_client.post(
        f"/api/logicollect/v1/memos/{memo}/collect",
        headers=headers,
        json={"type": "full", "mode": "cash"},
    )
    assert collect.status_code == 200, collect.text
    assert collect.json()["memo"]["paidAmount"] == 5000
    assert collect.json()["wallet"]["cashBalance"] == 5000
    wallet = pg_client.get("/api/logicollect/v1/wallet", headers=headers).json()
    assert wallet["cashBalance"] == 5000


def test_pg_concurrent_full_cash_collect(Session):
    employee_id, memo = _fresh_ids()
    _seed(Session, memo, employee_id)
    _prepare_delivered(Session, memo, employee_id)

    def collect():
        db = Session()
        try:
            user = _user(db, employee_id)
            try:
                lc_ops.collect(db, user, memo, {"type": "full", "mode": "cash"}, None)
                db.commit()
                return "ok"
            except LcError as exc:
                db.rollback()
                return exc.lc_code
        finally:
            db.close()

    db = Session()
    try:
        before = lc_ops.wallet_snapshot(db, _user(db, employee_id))
    finally:
        db.close()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: collect(), range(2)))
    assert results.count("ok") == 1
    assert "ALREADY_COLLECTED" in results or "ILLEGAL_STATUS" in results
    db = Session()
    try:
        snap = lc_ops.wallet_snapshot(db, _user(db, employee_id))
        assert snap["cashBalance"] == before["cashBalance"] + 5000
        assert snap["totalCollected"] == before["totalCollected"] + 5000
    finally:
        db.close()


def test_pg_concurrent_deposits_do_not_overdraw(Session):
    employee_id, memo = _fresh_ids()
    _seed(Session, memo, employee_id)
    _prepare_delivered(Session, memo, employee_id)
    db = Session()
    try:
        user = _user(db, employee_id)
        lc_ops.collect(db, user, memo, {"type": "full", "mode": "cash"}, None)
        db.commit()
        before = lc_ops.wallet_snapshot(db, user)
        assert before["cashBalance"] == 5000
    finally:
        db.close()

    def deposit(i: int):
        session = Session()
        try:
            user = _user(session, employee_id)
            try:
                lc_ops.create_deposit(session, user, "bkash", 4000, f"RACE-{memo}-{i}", None, None, None)
                session.commit()
                return "ok"
            except LcError as exc:
                session.rollback()
                return exc.lc_code
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(deposit, (1, 2)))
    assert results.count("ok") == 1
    assert "DEPOSIT_EXCEEDS_CASH" in results
    db = Session()
    try:
        snap = lc_ops.wallet_snapshot(db, _user(db, employee_id))
        assert snap["cashBalance"] == before["cashBalance"] - 4000
        assert snap["totalDeposited"] == before["totalDeposited"] + 4000
    finally:
        db.close()
