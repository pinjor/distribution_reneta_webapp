"""Phase C.2 depot isolation. SQLite only. No new permission codes."""
from datetime import date
from decimal import Decimal

from app.auth import get_password_hash
from app.models import (
    CollectionTransaction,
    CollectionTypeEnum,
    Company,
    Depot,
    Driver,
    Employee,
    Order,
    OrderDelivery,
    OrderStatusEnum,
    PickingOrder,
    Route,
    RouteStop,
    TransportExpense,
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


def _order_with_delivery(db, depot_code, loading_number):
    order = Order(
        order_number=f"ORD-{loading_number}",
        customer_id="C1",
        customer_name="Chemist",
        pso_id="P1",
        pso_name="PSO",
        depot_code=depot_code,
        loading_number=loading_number,
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
    )
    db.add(order)
    db.flush()
    delivery = OrderDelivery(
        order_id=order.id,
        delivery_number=f"DEL-{loading_number}",
        delivery_date=date.today(),
    )
    db.add(delivery)
    db.commit()
    db.refresh(order)
    db.refresh(delivery)
    return order, delivery


def test_picking_requires_a_loading_number_in_the_callers_depot(client, db_session):
    depot_a, depot_b = _depots(db_session)
    user_a = _person(db_session, "pick-a@example.com", "user", depot_a.id, "PK-A")
    _person(db_session, "pick-b@example.com", "user", depot_b.id, "PK-B")
    admin = _person(db_session, "pick-admin@example.com", "admin", None, "PK-ADM")
    _, delivery = _order_with_delivery(db_session, "DEP-A", "LD-A")
    _, foreign_delivery = _order_with_delivery(db_session, "DEP-B", "LD-B")

    headers_a = _login(client, user_a.email)
    headers_b = _login(client, "pick-b@example.com")
    headers_admin = _login(client, admin.email, "admin123")

    missing = client.post("/api/picking-orders", headers=headers_a, json={
        "loading_no": "LD-MISSING",
        "deliveries": [{"delivery_id": delivery.id}],
    })
    assert missing.status_code == 404, missing.text

    created = client.post("/api/picking-orders", headers=headers_a, json={
        "loading_no": "LD-A",
        "deliveries": [{"delivery_id": delivery.id}],
    })
    assert created.status_code == 201, created.text
    picking_id = created.json()["id"]

    assert client.get(f"/api/picking-orders/{picking_id}", headers=headers_a).status_code == 200
    assert client.get(f"/api/picking-orders/{picking_id}", headers=headers_b).status_code == 404
    foreign = client.post("/api/picking-orders", headers=headers_a, json={
        "loading_no": "LD-B",
        "deliveries": [{"delivery_id": foreign_delivery.id}],
    })
    assert foreign.status_code == 404, foreign.text

    orphan = PickingOrder(order_number="PCK-ORPHAN", loading_no="LD-NONE", status="Draft")
    db_session.add(orphan)
    db_session.commit()
    db_session.refresh(orphan)
    assert client.get(f"/api/picking-orders/{orphan.id}", headers=headers_a).status_code == 404
    assert client.get(f"/api/picking-orders/{orphan.id}", headers=headers_admin).status_code == 200

    listed = client.get("/api/picking-orders", headers=headers_a)
    assert listed.status_code == 200
    numbers = [row["order_number"] for row in listed.json()["data"]]
    assert "PCK-ORPHAN" not in numbers
    assert created.json()["order_number"] in numbers


def test_transport_reads_follow_vehicle_or_route_depot(client, db_session):
    depot_a, depot_b = _depots(db_session)
    user_a = _person(db_session, "tr-a@example.com", "transport", depot_a.id, "TR-A")
    _person(db_session, "tr-admin@example.com", "admin", None, "TR-ADM")
    route_a = Route(route_id="RT-A", name="Route A", depot_id=depot_a.id)
    route_b = Route(route_id="RT-B", name="Route B", depot_id=depot_b.id)
    db_session.add_all([route_a, route_b])
    db_session.flush()
    db_session.add(RouteStop(route_id=route_b.id, stop_sequence=1, customer_name="Foreign stop"))
    vehicle_b = Vehicle(
        vehicle_id="VH-B",
        vehicle_type="Truck",
        registration_number="REG-B",
        depot_id=depot_b.id,
    )
    vehicle_a = Vehicle(
        vehicle_id="VH-A",
        vehicle_type="Truck",
        registration_number="REG-A",
        depot_id=depot_a.id,
    )
    driver = Driver(driver_id="DR-1", first_name="Karim", license_number="LIC-1")
    db_session.add_all([vehicle_a, vehicle_b, driver])
    db_session.flush()
    trip_b = Trip(
        trip_number="TRIP-B",
        vehicle_id=vehicle_b.id,
        driver_id=driver.id,
        route_id=route_b.id,
        trip_date=date.today(),
    )
    trip_a = Trip(
        trip_number="TRIP-A",
        vehicle_id=vehicle_a.id,
        driver_id=driver.id,
        route_id=route_a.id,
        trip_date=date.today(),
    )
    db_session.add_all([trip_a, trip_b])
    db_session.flush()
    db_session.add_all([
        TransportExpense(
            trip_id=trip_b.id,
            trip_number="TRIP-B",
            route_id=route_b.id,
            expense_type="fuel",
            amount=Decimal("10.00"),
            expense_date=date.today(),
        ),
        TransportExpense(
            trip_id=trip_a.id,
            trip_number="TRIP-A",
            route_id=route_a.id,
            expense_type="toll",
            amount=Decimal("5.00"),
            expense_date=date.today(),
        ),
    ])
    db_session.commit()

    headers = _login(client, user_a.email)
    admin_headers = _login(client, "tr-admin@example.com", "admin123")

    assert client.get(f"/api/transport/routes/{route_b.id}/stops", headers=headers).status_code == 404
    own_stops = client.get(f"/api/transport/routes/{route_a.id}/stops", headers=headers)
    assert own_stops.status_code == 200, own_stops.text
    assert client.get(f"/api/transport/routes/{route_b.id}/distance", headers=headers).status_code == 404
    assert client.get(f"/api/transport/routes/{route_a.id}/distance", headers=headers).status_code == 200
    assert client.get(f"/api/transport/trips/{trip_b.id}", headers=headers).status_code == 404
    assert client.get(f"/api/transport/trips/{trip_a.id}", headers=headers).status_code == 200

    expenses = client.get("/api/transport/expenses", headers=headers)
    assert expenses.status_code == 200, expenses.text
    numbers = {row["trip_number"] for row in expenses.json()}
    assert numbers == {"TRIP-A"}

    report = client.get("/api/transport/reports/vehicle-expenses", headers=headers)
    assert report.status_code == 200, report.text
    vehicle_ids = {row["vehicle_id"] for row in report.json()["vehicles"]}
    assert "VH-B" not in vehicle_ids
    assert "VH-A" in vehicle_ids

    blocked = client.post("/api/transport/expenses", headers=headers, json={
        "trip_number": "TRIP-B",
        "expense_type": "fuel",
        "amount": "3.00",
        "expense_date": date.today().isoformat(),
    })
    assert blocked.status_code == 404, blocked.text
    assert client.get(f"/api/transport/trips/{trip_b.id}", headers=admin_headers).status_code == 200
    assert client.get("/api/drivers/", headers=headers).status_code == 200


def test_collection_person_report_is_depot_scoped(client, db_session):
    depot_a, depot_b = _depots(db_session)
    reader = _person(db_session, "bill-a@example.com", "billing", depot_a.id, "BL-A")
    collector_a = _person(db_session, "col-a@example.com", "user", depot_a.id, "COL-A")
    collector_b = _person(db_session, "col-b@example.com", "user", depot_b.id, "COL-B")
    admin = _person(db_session, "bill-admin@example.com", "admin", None, "BL-ADM")
    order = Order(
        order_number="ORD-COL",
        customer_id="C1",
        customer_name="Chemist",
        pso_id="P1",
        pso_name="PSO",
        depot_code="DEP-B",
        delivery_date=date.today(),
        status=OrderStatusEnum.DRAFT,
    )
    db_session.add(order)
    db_session.flush()
    db_session.add(CollectionTransaction(
        order_id=order.id,
        collection_person_id=collector_b.id,
        collection_date=date.today(),
        collection_type=CollectionTypeEnum.FULLY_COLLECTED,
        collected_amount=Decimal("20.00"),
        pending_amount=Decimal("0.00"),
        total_amount=Decimal("20.00"),
    ))
    db_session.add(CollectionTransaction(
        order_id=order.id,
        collection_person_id=collector_a.id,
        collection_date=date.today(),
        collection_type=CollectionTypeEnum.PARTIAL_COLLECTION,
        collected_amount=Decimal("8.00"),
        pending_amount=Decimal("2.00"),
        total_amount=Decimal("10.00"),
    ))
    db_session.commit()

    headers = _login(client, reader.email)
    admin_headers = _login(client, admin.email, "admin123")

    foreign = client.get(f"/api/billing/reports/collection-person/{collector_b.id}", headers=headers)
    assert foreign.status_code == 404, foreign.text
    own = client.get(f"/api/billing/reports/collection-person/{collector_a.id}", headers=headers)
    assert own.status_code == 200, own.text
    assert own.json()["collection_person_id"] == collector_a.id
    assert float(own.json()["total_collected"]) == 8.0
    admin_view = client.get(
        f"/api/billing/reports/collection-person/{collector_b.id}",
        headers=admin_headers,
    )
    assert admin_view.status_code == 200, admin_view.text

    summary = client.get("/api/billing/reports/all", headers=headers)
    assert summary.status_code == 200, summary.text
    person_ids = {row["collection_person_id"] for row in summary.json()}
    assert collector_a.id in person_ids
    assert collector_b.id not in person_ids
