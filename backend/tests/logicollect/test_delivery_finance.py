from tests.logicollect.conftest import auth_header, login


def _prep_deliver(lc_client, tokens, memo="2500001", item_qty=100):
    lc_client.post(f"/api/logicollect/v1/memos/{memo}/accept", headers=auth_header(tokens))
    check = lc_client.post(
        f"/api/logicollect/v1/memos/{memo}/check-in",
        headers={**auth_header(tokens), "Idempotency-Key": "ck-1"},
    )
    assert check.status_code == 200
    detail = lc_client.get(f"/api/logicollect/v1/memos/{memo}", headers=auth_header(tokens)).json()
    return detail["items"][0]["id"]


def test_partial_delivery_collect_deposit(lc_client, dsr_a, memo_order):
    tokens = login(lc_client)
    item_id = _prep_deliver(lc_client, tokens)
    body = {
        "type": "partial",
        "items": [{"id": item_id, "deliveredQty": 70, "shortReason": "shop short"}],
    }
    delivered = lc_client.post(
        "/api/logicollect/v1/memos/2500001/deliver",
        headers={**auth_header(tokens), "Idempotency-Key": "del-1"},
        json=body,
    )
    assert delivered.status_code == 200, delivered.text
    memo = delivered.json()
    assert memo["status"] == "partialDelivered"
    assert memo["deliveredAmount"] == 3500
    assert memo["paidAmount"] == 0
    assert memo["collectibleDue"] == 3500
    collect = lc_client.post(
        "/api/logicollect/v1/memos/2500001/collect",
        headers={**auth_header(tokens), "Idempotency-Key": "col-1"},
        json={"type": "partial", "mode": "cash", "amount": 1000},
    )
    assert collect.status_code == 200, collect.text
    payload = collect.json()
    assert payload["memo"]["paidAmount"] == 1000
    assert payload["memo"]["collectibleDue"] == 2500
    assert payload["wallet"]["cashBalance"] == 1000
    assert payload["wallet"]["currentBalance"] == 1000
    dep = lc_client.post(
        "/api/logicollect/v1/wallet/deposits",
        headers={**auth_header(tokens), "Idempotency-Key": "dep-1"},
        data={"method": "bkash", "amount": "600", "transactionId": "TX-1"},
    )
    assert dep.status_code == 200, dep.text
    assert dep.json()["wallet"]["cashBalance"] == 400
    over = lc_client.post(
        "/api/logicollect/v1/wallet/deposits",
        headers=auth_header(tokens),
        data={"method": "brac", "amount": "401", "transactionId": "TX-2"},
    )
    assert over.status_code == 400


def test_credit_does_not_increase_cash(lc_client, dsr_a, memo_order):
    from app.services.logicollect.util import business_date, next_business_day

    tokens = login(lc_client)
    item_id = _prep_deliver(lc_client, tokens)
    lc_client.post(
        "/api/logicollect/v1/memos/2500001/deliver",
        headers={**auth_header(tokens), "Idempotency-Key": "del-full"},
        json={"type": "full", "items": [{"id": item_id, "deliveredQty": 100, "shortReason": None}]},
    )
    due = next_business_day().isoformat()
    credit = lc_client.post(
        "/api/logicollect/v1/memos/2500001/collect",
        headers={**auth_header(tokens), "Idempotency-Key": "cred-1"},
        json={"type": "full", "mode": "credit", "creditDueAt": due},
    )
    assert credit.status_code == 200, credit.text
    wallet = credit.json()["wallet"]
    assert wallet["cashBalance"] == 0
    assert wallet["creditBalance"] == 5000
    assert credit.json()["memo"]["paymentStatus"] == "postponed"
    listed = lc_client.get("/api/logicollect/v1/memos", params={"needsCollection": True}, headers=auth_header(tokens)).json()
    if due == business_date().isoformat():
        assert listed
    else:
        assert listed == []


def test_check_in_required_and_idempotent(lc_client, dsr_a, memo_order):
    tokens = login(lc_client)
    lc_client.post("/api/logicollect/v1/memos/2500001/accept", headers=auth_header(tokens))
    detail = lc_client.get("/api/logicollect/v1/memos/2500001", headers=auth_header(tokens)).json()
    item_id = detail["items"][0]["id"]
    early = lc_client.post(
        "/api/logicollect/v1/memos/2500001/deliver",
        headers=auth_header(tokens),
        json={"type": "full", "items": [{"id": item_id, "deliveredQty": 100}]},
    )
    assert early.status_code == 409
    headers = {**auth_header(tokens), "Idempotency-Key": "same"}
    first = lc_client.post("/api/logicollect/v1/memos/2500001/check-in", headers=headers)
    second = lc_client.post("/api/logicollect/v1/memos/2500001/check-in", headers=headers)
    assert first.status_code == second.status_code == 200
    deliver_headers = {**auth_header(tokens), "Idempotency-Key": "del-dup"}
    payload = {"type": "full", "items": [{"id": item_id, "deliveredQty": 100}]}
    d1 = lc_client.post("/api/logicollect/v1/memos/2500001/deliver", headers=deliver_headers, json=payload)
    d2 = lc_client.post("/api/logicollect/v1/memos/2500001/deliver", headers=deliver_headers, json=payload)
    assert d1.status_code == d2.status_code == 200
    conflict = lc_client.post(
        "/api/logicollect/v1/memos/2500001/deliver",
        headers=deliver_headers,
        json={"type": "partial", "items": [{"id": item_id, "deliveredQty": 1, "shortReason": "x"}]},
    )
    assert conflict.status_code == 409


def test_returns_flow(lc_client, dsr_a, memo_order):
    tokens = login(lc_client)
    item_id = _prep_deliver(lc_client, tokens)
    lc_client.post(
        "/api/logicollect/v1/memos/2500001/deliver",
        headers={**auth_header(tokens), "Idempotency-Key": "del-ret"},
        json={"type": "partial", "items": [{"id": item_id, "deliveredQty": 70, "shortReason": "short"}]},
    )
    pending = lc_client.get("/api/logicollect/v1/returns/pending", headers=auth_header(tokens)).json()
    assert pending[0]["remainingQty"] == 30
    adj = lc_client.post(f"/api/logicollect/v1/returns/{pending[0]['id']}/adjust", headers=auth_header(tokens))
    assert adj.status_code == 200
    assert adj.json()["returnMemoNo"].startswith("R")
    assert adj.json()["warehouseReceipt"] is False
