"""Customer settings CRUD, duplicate codes, and referential delete guards."""
from datetime import date

from app.models import Customer, Invoice, Order, OrderStatusEnum


def test_customer_list_create_update_delete(client, auth_headers, db_session):
    created = client.post(
        "/api/customers",
        json={"name": "E3 Customer", "code": "CUST-E3-1", "city": "Dhaka", "type": "Retailer"},
        headers=auth_headers,
    )
    assert created.status_code == 200
    cid = created.json()["id"]
    listed = client.get("/api/customers", headers=auth_headers)
    assert listed.status_code == 200
    assert any(row["id"] == cid for row in listed.json())
    detail = client.get(f"/api/customers/{cid}", headers=auth_headers)
    assert detail.status_code == 200
    updated = client.put(
        f"/api/customers/{cid}",
        json={"name": "E3 Customer", "city": "Khulna"},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["city"] == "Khulna"
    db_session.expire_all()
    assert db_session.query(Customer).filter(Customer.id == cid).first().city == "Khulna"
    deleted = client.delete(f"/api/customers/{cid}", headers=auth_headers)
    assert deleted.status_code == 200
    db_session.expire_all()
    assert db_session.query(Customer).filter(Customer.id == cid).first() is None


def test_customer_duplicate_code_and_missing(client, auth_headers):
    first = client.post(
        "/api/customers", json={"name": "A", "code": "CUST-DUP-E3"}, headers=auth_headers
    )
    assert first.status_code == 200
    second = client.post(
        "/api/customers", json={"name": "B", "code": "CUST-DUP-E3"}, headers=auth_headers
    )
    assert second.status_code == 400
    assert client.get("/api/customers/99999", headers=auth_headers).status_code == 404
    assert client.post("/api/customers", json={}, headers=auth_headers).status_code == 422


def test_customer_delete_blocked_by_order(client, auth_headers, db_session):
    created = client.post(
        "/api/customers", json={"name": "Linked", "code": "CUST-ORD-E3"}, headers=auth_headers
    )
    assert created.status_code == 200
    db_session.add(
        Order(
            order_number="ORD-E3-C",
            customer_id="CUST-ORD-E3",
            customer_name="Linked",
            pso_id="P1",
            pso_name="PSO",
            delivery_date=date.today(),
            status=OrderStatusEnum.DRAFT,
            validated=False,
        )
    )
    db_session.commit()
    blocked = client.delete(f"/api/customers/{created.json()['id']}", headers=auth_headers)
    assert blocked.status_code == 409


def test_customer_delete_blocked_by_invoice(client, auth_headers, db_session):
    created = client.post(
        "/api/customers", json={"name": "Invoiced", "code": "CUST-INV-E3"}, headers=auth_headers
    )
    cid = created.json()["id"]
    db_session.add(
        Invoice(
            invoice_number="INV-E3",
            invoice_date=date.today(),
            customer_id=cid,
            amount=10,
        )
    )
    db_session.commit()
    assert client.delete(f"/api/customers/{cid}", headers=auth_headers).status_code == 409
