import io

import pytest
from fastapi.testclient import TestClient

import app.models_logicollect  # noqa: F401
from app.auth import get_password_hash
from app.database import get_db
from app.models import Customer, Depot, Employee, Order, OrderItem, OrderStatusEnum, Product
from logicollect_app import create_logicollect_app


@pytest.fixture
def lc_app(db_session):
    application = create_logicollect_app()

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    application.dependency_overrides[get_db] = override_get_db
    return application


@pytest.fixture
def lc_client(lc_app):
    with TestClient(lc_app) as client:
        yield client


@pytest.fixture
def depot_a(db_session):
    row = Depot(name="Dhaka", code="DHK")
    db_session.add(row)
    db_session.commit()
    db_session.refresh(row)
    return row


@pytest.fixture
def depot_b(db_session):
    row = Depot(name="Khulna", code="KHL")
    db_session.add(row)
    db_session.commit()
    db_session.refresh(row)
    return row


def _employee(db, **kwargs):
    user = Employee(is_active=True, is_blocked=False, hashed_password=get_password_hash("demo123"), **kwargs)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def dsr_a(db_session, depot_a):
    return _employee(
        db_session,
        employee_id="D001",
        first_name="Shamim",
        last_name="Sarwar",
        email="dsr.a@example.com",
        phone="01711111111",
        role="user",
        depot_id=depot_a.id,
    )


@pytest.fixture
def dsr_b(db_session, depot_a):
    return _employee(
        db_session,
        employee_id="D002",
        first_name="Other",
        last_name="DSR",
        email="dsr.b@example.com",
        phone="01711111112",
        role="user",
        depot_id=depot_a.id,
    )


@pytest.fixture
def dsr_foreign(db_session, depot_b):
    return _employee(
        db_session,
        employee_id="D009",
        first_name="Foreign",
        last_name="DSR",
        email="dsr.f@example.com",
        phone="01700000000",
        role="user",
        depot_id=depot_b.id,
    )


@pytest.fixture
def finance_user(db_session, depot_a):
    return _employee(
        db_session,
        employee_id="FIN1",
        first_name="Finance",
        last_name="User",
        email="finance@example.com",
        phone="01800000000",
        role="finance",
        depot_id=depot_a.id,
    )


@pytest.fixture
def product_general(db_session):
    p = Product(name="Paracetamol 500mg", code="PARA500", sku="PARA500", unit_of_measure="strips", cold_chain_available=False)
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    return p


@pytest.fixture
def product_cold(db_session):
    p = Product(name="Insulin Injection", code="INS1", sku="INS1", unit_of_measure="vials", cold_chain_available=True)
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    return p


@pytest.fixture
def customer(db_session):
    c = Customer(name="ABC Pharmacy", code="CUST001", phone="01711111112", address="123 MG Road", city="Dhaka", credit_limit=15000)
    db_session.add(c)
    db_session.commit()
    db_session.refresh(c)
    return c


def make_order(db, dsr, customer, product, memo="2500001", qty=100, price=50, extra_product=None):
    from datetime import date

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
        route_name="Route A - Central Dhaka",
        delivery_date=date.today(),
        status=OrderStatusEnum.APPROVED,
        loaded=True,
        loading_number="L-1",
        assigned_to=dsr.id,
    )
    db.add(order)
    db.flush()
    item = OrderItem(
        order_id=order.id,
        product_code=product.code,
        product_name=product.name,
        pack_size="strips",
        quantity=qty,
        total_quantity=qty,
        trade_price=price,
        unit_price=price,
        delivery_date=date.today(),
    )
    db.add(item)
    if extra_product:
        db.add(
            OrderItem(
                order_id=order.id,
                product_code=extra_product.code,
                product_name=extra_product.name,
                pack_size="vials",
                quantity=10,
                total_quantity=10,
                trade_price=100,
                unit_price=100,
                delivery_date=date.today(),
            )
        )
    db.commit()
    db.refresh(order)
    return order


@pytest.fixture
def memo_order(db_session, dsr_a, customer, product_general):
    return make_order(db_session, dsr_a, customer, product_general)


def login(client, employee_id="D001", password="demo123"):
    resp = client.post("/api/logicollect/v1/auth/login", json={"employeeId": employee_id, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()


def auth_header(tokens):
    return {"Authorization": f"Bearer {tokens['accessToken']}"}
