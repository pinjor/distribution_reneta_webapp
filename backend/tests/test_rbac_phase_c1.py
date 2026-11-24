"""Phase C.1 signup lock and single-record depot checks. SQLite only."""
from datetime import date
from decimal import Decimal

from app.auth import get_password_hash
from app.models import (
    CollectionDeposit,
    Company,
    Depot,
    DepositMethodEnum,
    Driver,
    Employee,
    Invoice,
    Order,
    OrderStatusEnum,
    ProductReceipt,
    ReceiptSourceEnum,
    Route,
    Trip,
    Vehicle,
)


def _login(client, email, password="pass1234"):
    resp = client.post("/api/auth/login", json={
        "email": email, "password": password, "remember_me": False,
    })
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _person(db, email, role, depot_id, employee_id):
    user = Employee(
        employee_id=employee_id,
        first_name=role,
        last_name="Tester",
        email=email,
        hashed_password=get_password_hash("pass1234" if role != "admin" else "admin123"),
        role=role,
        depot_id=depot_id,
        is_active=True,
        is_blocked=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _depots(db):
    company = Company(name="Renata", code="REN")
    db.add(company)
    db.flush()
    a = Depot(name="Depot A", code="DEP-A", company_id=company.id)
    b = Depot(name="Depot B", code="DEP-B", company_id=company.id)
    db.add_all([a, b])
    db.commit()
    db.refresh(a)
    db.refresh(b)
    return a, b


def _order(db, depot_code):
    order = Order(
        order_number=f"ORD-{depot_code}",
        customer_id="C1",
        customer_name="Chemist",
        pso_id="P1",
        pso_name="PSO",
        depot_code=depot_code,
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def test_signup_requires_admin(client, db_session):
    body = {
        "employee_id": "NEW-1",
        "first_name": "New",
        "email": "new.person@test.com",
        "password": "secret1",
    }
    assert client.post("/api/auth/signup", json=body).status_code == 401
    depot, _ = _depots(db_session)
    user = _person(db_session, "user.c1@test.com", "user", depot.id, "U-C1")
    assert client.post("/api/auth/signup", json=body, headers=_login(client, user.email)).status_code == 403
    admin = _person(db_session, "admin.c1@test.com", "admin", None, "A-C1")
    created = client.post("/api/auth/signup", json=body, headers=_login(client, admin.email, "admin123"))
    assert created.status_code == 200, created.text
    assert created.json()["email"] == "new.person@test.com"


def test_order_invoice_receipt_and_depot_are_isolated(client, db_session):
    depot_a, depot_b = _depots(db_session)
    user = _person(db_session, "user.iso@test.com", "user", depot_a.id, "U-ISO")
    admin = _person(db_session, "admin.iso@test.com", "admin", None, "A-ISO")
    own = _order(db_session, "DEP-A")
    foreign = _order(db_session, "DEP-B")
    headers = _login(client, user.email)
    admin_headers = _login(client, admin.email, "admin123")

    assert client.get(f"/api/orders/{foreign.id}", headers=headers).status_code == 404
    assert client.get(f"/api/orders/{own.id}", headers=headers).status_code == 200
    assert client.get(f"/api/orders/{foreign.id}", headers=admin_headers).status_code == 200

    denied = client.put(f"/api/orders/{own.id}", json={"depot_code": "DEP-B"}, headers=headers)
    assert denied.status_code == 403, denied.text

    assert client.get(f"/api/depots/{depot_b.id}", headers=headers).status_code == 404
    assert client.get(f"/api/depots/{depot_a.id}", headers=headers).status_code == 200
    assert client.get(f"/api/depots/{depot_b.id}", headers=admin_headers).status_code == 200

    own_invoice = Invoice(
        invoice_number="INV-A", invoice_date=date.today(), amount=Decimal("10"), depot_id=depot_a.id,
    )
    foreign_invoice = Invoice(
        invoice_number="INV-B", invoice_date=date.today(), amount=Decimal("10"), depot_id=depot_b.id,
    )
    own_receipt = ProductReceipt(
        receipt_number="RCV-A", source_type=ReceiptSourceEnum.DEPOT, target_depot_id=depot_a.id,
    )
    foreign_receipt = ProductReceipt(
        receipt_number="RCV-B", source_type=ReceiptSourceEnum.DEPOT, target_depot_id=depot_b.id,
    )
    db_session.add_all([own_invoice, foreign_invoice, own_receipt, foreign_receipt])
    db_session.commit()

    assert client.get(f"/api/invoices/{foreign_invoice.id}", headers=headers).status_code == 404
    assert client.get(f"/api/invoices/{own_invoice.id}", headers=headers).status_code == 200
    assert client.get(f"/api/product-receipts/{foreign_receipt.id}", headers=headers).status_code == 404
    assert client.get(f"/api/product-receipts/{own_receipt.id}", headers=headers).status_code == 200
    moved = client.post("/api/invoices/", json={
        "invoice_number": "INV-X",
        "invoice_date": "2026-11-23",
        "amount": 5,
        "depot_id": depot_b.id,
    }, headers=headers)
    assert moved.status_code == 403


def test_deposit_and_trip_cannot_cross_depots(client, db_session):
    depot_a, depot_b = _depots(db_session)
    billing = _person(db_session, "billing.iso@test.com", "billing", depot_a.id, "B-ISO")
    collector = _person(db_session, "pso.other@test.com", "user", depot_b.id, "P-OTH")
    headers = _login(client, billing.email)
    denied = client.post("/api/billing/deposits", json={
        "deposit_date": "2026-11-23",
        "collection_person_id": collector.id,
        "deposit_method": "bKash",
        "deposit_amount": 10,
        "transaction_number": "TX-C1",
        "total_collection_amount": 10,
    }, headers=headers)
    assert denied.status_code == 404, denied.text

    own_collector = _person(db_session, "pso.own@test.com", "user", depot_a.id, "P-OWN")
    deposit = CollectionDeposit(
        deposit_number="DEP-A",
        deposit_date=date.today(),
        collection_person_id=own_collector.id,
        deposit_method=DepositMethodEnum.BKASH,
        deposit_amount=Decimal("10"),
        transaction_number="TX-OWN",
        remaining_amount=Decimal("0"),
        total_collection_amount=Decimal("10"),
    )
    foreign_deposit = CollectionDeposit(
        deposit_number="DEP-B",
        deposit_date=date.today(),
        collection_person_id=collector.id,
        deposit_method=DepositMethodEnum.BKASH,
        deposit_amount=Decimal("10"),
        transaction_number="TX-FOR",
        remaining_amount=Decimal("0"),
        total_collection_amount=Decimal("10"),
    )
    db_session.add_all([deposit, foreign_deposit])
    db_session.commit()
    assert client.get(f"/api/billing/deposits/{foreign_deposit.id}", headers=headers).status_code == 404
    assert client.get(f"/api/billing/deposits/{deposit.id}", headers=headers).status_code == 200

    vehicle_b = Vehicle(
        vehicle_id="V-B", vehicle_type="Van", registration_number="REG-B", depot_id=depot_b.id,
    )
    driver = Driver(driver_id="D-1", first_name="Driver", license_number="LIC-1")
    route = Route(name="Route", route_id="RT-1", depot_id=depot_b.id)
    db_session.add_all([vehicle_b, driver, route])
    db_session.commit()
    trip = Trip(
        trip_number="TRP-B",
        vehicle_id=vehicle_b.id,
        driver_id=driver.id,
        route_id=route.id,
        trip_date=date.today(),
    )
    db_session.add(trip)
    db_session.commit()
    transport = _person(db_session, "transport.iso@test.com", "transport", depot_a.id, "T-ISO")
    assert client.get(f"/api/transport/trips/{trip.id}", headers=_login(client, transport.email)).status_code == 404
    admin = _person(db_session, "admin.trip@test.com", "admin", None, "A-TR")
    assert client.get(
        f"/api/transport/trips/{trip.id}", headers=_login(client, admin.email, "admin123")
    ).status_code == 200


def test_user_cannot_approve_collection(client, db_session):
    depot, _ = _depots(db_session)
    user = _person(db_session, "user.col@test.com", "user", depot.id, "U-COL")
    order = _order(db_session, "DEP-A")
    order.collection_status = "Pending"
    db_session.commit()
    resp = client.post(f"/api/orders/{order.id}/approve-collection", headers=_login(client, user.email))
    assert resp.status_code == 403
