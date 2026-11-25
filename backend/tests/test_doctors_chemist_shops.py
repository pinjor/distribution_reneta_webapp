"""Doctor and chemist shop CRUD, auth, and persistence tests."""
from app.auth import get_password_hash
from app.models import ChemistShop, Doctor, Employee


def _create_doctor(client, headers, **overrides):
    payload = {
        "name": "Dr. Test Rahman",
        "specialization": "Cardiology",
        "registration_number": "BMDC-TEST-1",
        "qualification": "MBBS",
        "email": "dr.test@example.com",
        "phone": "+880111",
        "address": "Test Address",
        "city": "Dhaka",
        "is_active": True,
    }
    payload.update(overrides)
    return client.post("/api/doctors", json=payload, headers=headers)


def _create_shop(client, headers, **overrides):
    payload = {
        "name": "Test Pharmacy",
        "owner_name": "Owner Name",
        "license_number": "LIC-TEST-1",
        "email": "shop@example.com",
        "phone": "+880222",
        "address": "Shop Address",
        "city": "Dhaka",
        "is_active": True,
    }
    payload.update(overrides)
    return client.post("/api/chemist-shops", json=payload, headers=headers)


def test_doctors_require_auth(client):
    assert client.get("/api/doctors").status_code == 401
    assert client.post("/api/doctors", json={"name": "X"}).status_code == 401


def test_chemist_shops_require_auth(client):
    assert client.get("/api/chemist-shops").status_code == 401
    assert client.post("/api/chemist-shops", json={"name": "X"}).status_code == 401


def test_doctor_list_and_detail(client, auth_headers, db_session):
    created = _create_doctor(client, auth_headers)
    assert created.status_code == 201
    doctor_id = created.json()["id"]

    listed = client.get("/api/doctors", headers=auth_headers)
    assert listed.status_code == 200
    assert any(row["id"] == doctor_id for row in listed.json())

    detail = client.get(f"/api/doctors/{doctor_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["name"] == "Dr. Test Rahman"
    assert db_session.query(Doctor).filter(Doctor.id == doctor_id).first() is not None


def test_doctor_create_update_delete(client, auth_headers, db_session):
    created = _create_doctor(client, auth_headers, code="DOC-9001")
    assert created.status_code == 201
    assert created.json()["code"] == "DOC-9001"
    doctor_id = created.json()["id"]

    updated = client.put(
        f"/api/doctors/{doctor_id}",
        json={"city": "Chittagong", "is_active": False},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["city"] == "Chittagong"
    assert updated.json()["is_active"] is False

    db_session.expire_all()
    stored = db_session.query(Doctor).filter(Doctor.id == doctor_id).first()
    assert stored.city == "Chittagong"
    assert stored.is_active is False

    deleted = client.delete(f"/api/doctors/{doctor_id}", headers=auth_headers)
    assert deleted.status_code == 200
    db_session.expire_all()
    assert db_session.query(Doctor).filter(Doctor.id == doctor_id).first() is None


def test_doctor_duplicate_code(client, auth_headers):
    first = _create_doctor(client, auth_headers, code="DOC-DUP1")
    assert first.status_code == 201
    second = _create_doctor(client, auth_headers, code="DOC-DUP1", registration_number="OTHER")
    assert second.status_code == 400
    assert "already exists" in second.json()["detail"].lower()
    other = _create_doctor(client, auth_headers, code="DOC-DUP2", registration_number="OTHER2")
    assert other.status_code == 201
    clash = client.put(
        f"/api/doctors/{other.json()['id']}",
        json={"code": "DOC-DUP1"},
        headers=auth_headers,
    )
    assert clash.status_code == 400


def test_doctor_invalid_input(client, auth_headers):
    resp = client.post("/api/doctors", json={"name": ""}, headers=auth_headers)
    assert resp.status_code == 422


def test_doctor_missing_record(client, auth_headers):
    assert client.get("/api/doctors/99999", headers=auth_headers).status_code == 404
    assert client.put("/api/doctors/99999", json={"name": "X"}, headers=auth_headers).status_code == 404
    assert client.delete("/api/doctors/99999", headers=auth_headers).status_code == 404


def test_doctor_write_forbidden_for_user_role(client, user_auth_headers):
    listed = client.get("/api/doctors", headers=user_auth_headers)
    assert listed.status_code == 200
    created = _create_doctor(client, user_auth_headers)
    assert created.status_code == 403


def test_chemist_shop_list_and_detail(client, auth_headers, db_session):
    created = _create_shop(client, auth_headers)
    assert created.status_code == 201
    shop_id = created.json()["id"]

    listed = client.get("/api/chemist-shops", headers=auth_headers)
    assert listed.status_code == 200
    assert any(row["id"] == shop_id for row in listed.json())

    detail = client.get(f"/api/chemist-shops/{shop_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["owner_name"] == "Owner Name"
    assert db_session.query(ChemistShop).filter(ChemistShop.id == shop_id).first() is not None


def test_chemist_shop_create_update_delete(client, auth_headers, db_session):
    created = _create_shop(client, auth_headers, code="CHEM-9001")
    assert created.status_code == 201
    shop_id = created.json()["id"]

    updated = client.put(
        f"/api/chemist-shops/{shop_id}",
        json={"city": "Khulna"},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["city"] == "Khulna"

    db_session.expire_all()
    stored = db_session.query(ChemistShop).filter(ChemistShop.id == shop_id).first()
    assert stored.city == "Khulna"

    deleted = client.delete(f"/api/chemist-shops/{shop_id}", headers=auth_headers)
    assert deleted.status_code == 200
    db_session.expire_all()
    assert db_session.query(ChemistShop).filter(ChemistShop.id == shop_id).first() is None


def test_chemist_shop_duplicate_code(client, auth_headers):
    first = _create_shop(client, auth_headers, code="CHEM-DUP1")
    assert first.status_code == 201
    second = _create_shop(client, auth_headers, code="CHEM-DUP1", name="Other Shop")
    assert second.status_code == 400
    assert "already exists" in second.json()["detail"].lower()
    other = _create_shop(client, auth_headers, code="CHEM-DUP2", name="Second Shop")
    assert other.status_code == 201
    clash = client.put(
        f"/api/chemist-shops/{other.json()['id']}",
        json={"code": "CHEM-DUP1"},
        headers=auth_headers,
    )
    assert clash.status_code == 400


def test_chemist_shop_invalid_input(client, auth_headers):
    resp = client.post("/api/chemist-shops", json={"name": "Only Name"}, headers=auth_headers)
    assert resp.status_code == 422


def test_chemist_shop_missing_record(client, auth_headers):
    assert client.get("/api/chemist-shops/99999", headers=auth_headers).status_code == 404
    assert client.put("/api/chemist-shops/99999", json={"name": "X"}, headers=auth_headers).status_code == 404
    assert client.delete("/api/chemist-shops/99999", headers=auth_headers).status_code == 404


def test_chemist_shop_write_forbidden_for_user_role(client, user_auth_headers):
    listed = client.get("/api/chemist-shops", headers=user_auth_headers)
    assert listed.status_code == 200
    created = _create_shop(client, user_auth_headers)
    assert created.status_code == 403


def test_manager_can_write_doctors(client, db_session):
    manager = Employee(
        employee_id="MGR001",
        first_name="Manager",
        last_name="User",
        email="manager@test.com",
        hashed_password=get_password_hash("manager123"),
        role="manager",
        is_active=True,
        is_blocked=False,
    )
    db_session.add(manager)
    db_session.commit()
    login = client.post(
        "/api/auth/login",
        json={"email": "manager@test.com", "password": "manager123", "remember_me": False},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    created = _create_doctor(client, headers, code="DOC-MGR1")
    assert created.status_code == 201
