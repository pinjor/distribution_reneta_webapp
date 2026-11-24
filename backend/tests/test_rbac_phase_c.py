"""Authorization checks for Phase C. Uses the in-memory SQLite database."""
from datetime import date

from app.auth import get_password_hash
from app.models import Depot, Driver, Employee, Product, Route, Vehicle


def _login(client, email, password):
    resp = client.post("/api/auth/login", json={
        "email": email, "password": password, "remember_me": False,
    })
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _user(db_session, email, role, depot_id=None, employee_id=None):
    user = Employee(
        employee_id=employee_id or email.split("@")[0],
        first_name=role,
        last_name="Tester",
        email=email,
        hashed_password=get_password_hash("pass1234"),
        role=role,
        depot_id=depot_id,
        is_active=True,
        is_blocked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _employee_body(depot_id=None):
    return {
        "employee_id": "EMP-NEW",
        "first_name": "New",
        "last_name": "Hire",
        "email": "new.hire@test.com",
        "depot_id": depot_id,
        "is_active": True,
    }


def _adjustment_body(depot_id, product_id):
    return {
        "adjustment_date": date.today().isoformat(),
        "depot_id": depot_id,
        "adjustment_type": "Increase",
        "reason": "Count correction",
        "status": "Pending",
        "items": [{"product_id": product_id, "batch": "1001", "quantity_change": 1}],
    }


def test_unauthenticated_employee_create_is_401(client):
    resp = client.post("/api/employees", json=_employee_body())
    assert resp.status_code == 401


def test_user_cannot_create_update_or_delete_employee(client, db_session, regular_user, user_auth_headers):
    created = client.post("/api/employees", json=_employee_body(), headers=user_auth_headers)
    assert created.status_code == 403

    target = _user(db_session, "target@test.com", "user", employee_id="TGT1")
    body = _employee_body()
    body["employee_id"] = target.employee_id
    updated = client.put(f"/api/employees/{target.id}", json=body, headers=user_auth_headers)
    assert updated.status_code == 403
    deleted = client.delete(f"/api/employees/{target.id}", headers=user_auth_headers)
    assert deleted.status_code == 403


def test_user_cannot_modify_role_masters(client, user_auth_headers):
    payload = {"code": "RM-PSO", "role_type": "NSH", "name": "Head", "is_active": True}
    assert client.post("/api/role-masters/", json=payload, headers=user_auth_headers).status_code == 403
    assert client.put("/api/role-masters/1", json=payload, headers=user_auth_headers).status_code == 403
    assert client.delete("/api/role-masters/1", headers=user_auth_headers).status_code == 403


def test_user_cannot_create_stock_adjustment_or_deposit_or_trip(client, db_session, regular_user, user_auth_headers):
    product = Product(name="Med", code="RBAC-P", sku="RBAC-S", is_active=True, base_price=10)
    db_session.add(product)
    db_session.commit()
    adjustment = client.post(
        "/api/stock/adjustments",
        json=_adjustment_body(None, product.id),
        headers=user_auth_headers,
    )
    assert adjustment.status_code == 403

    deposit = client.post("/api/billing/deposits", json={
        "deposit_date": date.today().isoformat(),
        "collection_person_id": regular_user.id,
        "deposit_method": "bKash",
        "deposit_amount": 100,
        "transaction_number": "TX-1",
        "total_collection_amount": 100,
    }, headers=user_auth_headers)
    assert deposit.status_code == 403

    trip = client.post("/api/transport/trips/assign", json={
        "vehicle_id": 1, "driver_id": 1, "route_id": 1, "trip_date": date.today().isoformat(),
    }, headers=user_auth_headers)
    assert trip.status_code == 403


def test_admin_can_perform_guarded_writes(client, db_session, admin_user, auth_headers):
    created = client.post("/api/employees", json=_employee_body(), headers=auth_headers)
    assert created.status_code == 200, created.text

    role = client.post("/api/role-masters/", json={
        "code": "RM-ADMIN", "role_type": "NSH", "name": "National", "is_active": True,
    }, headers=auth_headers)
    assert role.status_code == 200, role.text

    product = Product(name="Med A", code="RBAC-A", sku="RBAC-AS", is_active=True, base_price=10)
    depot = Depot(name="Admin Depot", code="ADM-D", city="Dhaka")
    db_session.add_all([product, depot])
    db_session.commit()
    adjustment = client.post(
        "/api/stock/adjustments",
        json=_adjustment_body(depot.id, product.id),
        headers=auth_headers,
    )
    assert adjustment.status_code == 201, adjustment.text

    deposit = client.post("/api/billing/deposits", json={
        "deposit_date": date.today().isoformat(),
        "collection_person_id": admin_user.id,
        "deposit_method": "bKash",
        "deposit_amount": 50,
        "transaction_number": "TX-ADMIN",
        "total_collection_amount": 50,
    }, headers=auth_headers)
    assert deposit.status_code == 201, deposit.text

    vehicle = Vehicle(vehicle_id="RBAC-V", vehicle_type="Van", registration_number="RBAC-1", depot_id=depot.id)
    driver = Driver(driver_id="RBAC-D", first_name="Karim", license_number="LIC-RBAC")
    route = Route(route_id="RBAC-R", name="Loop", depot_id=depot.id)
    db_session.add_all([vehicle, driver, route])
    db_session.commit()
    trip = client.post("/api/transport/trips/assign", json={
        "vehicle_id": vehicle.id,
        "driver_id": driver.id,
        "route_id": route.id,
        "trip_date": date.today().isoformat(),
    }, headers=auth_headers)
    assert trip.status_code == 200, trip.text


def test_billing_cannot_assign_trip_and_transport_cannot_approve_deposit(client, db_session, admin_user):
    billing = _user(db_session, "billing@test.com", "billing", employee_id="BIL1")
    transport = _user(db_session, "transport@test.com", "transport", employee_id="TRN1")
    billing_headers = _login(client, billing.email, "pass1234")
    transport_headers = _login(client, transport.email, "pass1234")

    trip = client.post("/api/transport/trips/assign", json={
        "vehicle_id": 1, "driver_id": 1, "route_id": 1, "trip_date": date.today().isoformat(),
    }, headers=billing_headers)
    assert trip.status_code == 403

    deposit = client.post("/api/billing/deposits", json={
        "deposit_date": date.today().isoformat(),
        "collection_person_id": admin_user.id,
        "deposit_method": "BRAC",
        "deposit_amount": 10,
        "transaction_number": "TX-APR",
        "total_collection_amount": 10,
    }, headers=auth_headers_for(client, admin_user))
    assert deposit.status_code == 201, deposit.text
    approved = client.post(
        f"/api/billing/deposits/{deposit.json()['id']}/approve?approver_id={transport.id}",
        headers=transport_headers,
    )
    assert approved.status_code == 403


def auth_headers_for(client, user):
    return _login(client, user.email, "admin123" if user.email == "admin@test.com" else "pass1234")


def test_depot_isolation_on_adjustment_and_vehicle(client, db_session):
    depot_a = Depot(name="A", code="ISO-A", city="Dhaka")
    depot_b = Depot(name="B", code="ISO-B", city="Khulna")
    db_session.add_all([depot_a, depot_b])
    db_session.flush()
    manager = _user(db_session, "mgr.a@test.com", "manager", depot_id=depot_a.id, employee_id="MGR-A")
    product = Product(name="Iso", code="ISO-P", sku="ISO-S", is_active=True, base_price=5)
    vehicle = Vehicle(vehicle_id="ISO-V", vehicle_type="Van", registration_number="ISO-9", depot_id=depot_b.id)
    db_session.add_all([product, vehicle])
    db_session.commit()
    headers = _login(client, manager.email, "pass1234")

    other_depot = client.post(
        "/api/stock/adjustments",
        json=_adjustment_body(depot_b.id, product.id),
        headers=headers,
    )
    assert other_depot.status_code == 403

    own = client.post(
        "/api/stock/adjustments",
        json=_adjustment_body(depot_a.id, product.id),
        headers=headers,
    )
    assert own.status_code == 201, own.text

    moved = client.put(
        f"/api/vehicles/{vehicle.id}",
        json={"vehicle_id": vehicle.vehicle_id, "vehicle_type": "Van", "registration_number": vehicle.registration_number, "depot_id": depot_a.id},
        headers=headers,
    )
    assert moved.status_code == 404

    listed = client.get("/api/stock/adjustments", headers=headers)
    assert listed.status_code == 200
    assert all(row["depot_id"] == depot_a.id for row in listed.json())


def test_admin_lists_adjustments_across_depots(client, db_session, admin_user, auth_headers):
    depot = Depot(name="All", code="ALL-D", city="Dhaka")
    product = Product(name="All P", code="ALL-P", sku="ALL-S", is_active=True, base_price=5)
    db_session.add_all([depot, product])
    db_session.commit()
    created = client.post(
        "/api/stock/adjustments",
        json=_adjustment_body(depot.id, product.id),
        headers=auth_headers,
    )
    assert created.status_code == 201
    listed = client.get("/api/stock/adjustments", headers=auth_headers)
    assert listed.status_code == 200
    assert any(row["id"] == created.json()["id"] for row in listed.json())


def test_unassigned_user_sees_no_depot_rows(client, db_session, regular_user, user_auth_headers):
    depot = Depot(name="Hidden", code="HID", city="Dhaka")
    db_session.add(depot)
    db_session.commit()
    listed = client.get("/api/depots", headers=user_auth_headers)
    assert listed.status_code == 200
    assert listed.json() == []
