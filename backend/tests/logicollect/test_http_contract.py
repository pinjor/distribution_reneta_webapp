"""HTTP contract coverage for previously untested LogiCollect routes."""
import io

from tests.logicollect.conftest import auth_header, login, make_order

JPEG = b"\xff\xd8\xff\xdb" + b"\x00" * 32


def test_inactive_employee_login(lc_client, db_session, dsr_a):
    dsr_a.is_active = False
    db_session.commit()
    resp = lc_client.post("/api/logicollect/v1/auth/login", json={"employeeId": "D001", "password": "demo123"})
    assert resp.status_code == 403
    assert resp.json()["code"] == "ACCOUNT_INACTIVE"


def test_refresh_replay_and_malformed(lc_client, dsr_a):
    tokens = login(lc_client)
    first = lc_client.post("/api/logicollect/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]})
    assert first.status_code == 200
    replay = lc_client.post("/api/logicollect/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]})
    assert replay.status_code == 401
    malformed = lc_client.post("/api/logicollect/v1/auth/login", json=["not", "an", "object"])
    assert malformed.status_code == 422
    assert malformed.json()["code"] == "VALIDATION_ERROR"


def test_profile_photo_upload_and_remove(lc_client, dsr_a):
    tokens = login(lc_client)
    bad = lc_client.post(
        "/api/logicollect/v1/auth/me/photo",
        headers=auth_header(tokens),
        files={"file": ("x.png", io.BytesIO(b"not-jpeg"), "image/png")},
    )
    assert bad.status_code == 400
    ok = lc_client.post(
        "/api/logicollect/v1/auth/me/photo",
        headers=auth_header(tokens),
        files={"file": ("me.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )
    assert ok.status_code == 200, ok.text
    url = ok.json()["profilePictureUrl"]
    assert url.startswith("/api/logicollect/v1/media/")
    media_id = url.rsplit("/", 1)[-1]
    got = lc_client.get(f"/api/logicollect/v1/media/{media_id}", headers=auth_header(tokens))
    assert got.status_code == 200
    assert got.content[:3] == b"\xff\xd8\xff"
    deleted = lc_client.delete("/api/logicollect/v1/auth/me/photo", headers=auth_header(tokens))
    assert deleted.status_code == 200
    assert deleted.json()["profilePictureUrl"] is None


def test_postpone_and_cancel_terminal(lc_client, db_session, dsr_a, customer, product_general):
    make_order(db_session, dsr_a, customer, product_general, memo="2500101")
    make_order(db_session, dsr_a, customer, product_general, memo="2500102")
    tokens = login(lc_client)
    lc_client.post("/api/logicollect/v1/memos/2500101/accept", headers=auth_header(tokens))
    postponed = lc_client.post(
        "/api/logicollect/v1/memos/2500101/postpone",
        headers=auth_header(tokens),
        json={"reason": "shop closed"},
    )
    assert postponed.status_code == 200
    assert postponed.json()["status"] == "postponed"
    route = lc_client.get("/api/logicollect/v1/routes/today", headers=auth_header(tokens)).json()
    stop = next(s for s in route["stops"] if s["memoId"] == "2500101")
    assert stop["status"] == "postponed"
    detail = lc_client.get("/api/logicollect/v1/memos/2500101", headers=auth_header(tokens)).json()
    item_id = detail["items"][0]["id"]
    late = lc_client.post(
        "/api/logicollect/v1/memos/2500101/deliver",
        headers=auth_header(tokens),
        json={"type": "full", "items": [{"id": item_id, "deliveredQty": 100}]},
    )
    assert late.status_code == 409
    lc_client.post("/api/logicollect/v1/memos/2500102/accept", headers=auth_header(tokens))
    canceled = lc_client.post(
        "/api/logicollect/v1/memos/2500102/cancel",
        headers=auth_header(tokens),
        json={"reason": "order withdrawn"},
    )
    assert canceled.status_code == 200
    assert canceled.json()["status"] == "canceled"


def test_wallet_movements_deposits_list_and_credit_cash_settlement(lc_client, dsr_a, memo_order):
    from app.services.logicollect.util import next_business_day

    tokens = login(lc_client)
    lc_client.post("/api/logicollect/v1/memos/2500001/accept", headers=auth_header(tokens))
    lc_client.post("/api/logicollect/v1/memos/2500001/check-in", headers={**auth_header(tokens), "Idempotency-Key": "ck-w"})
    detail = lc_client.get("/api/logicollect/v1/memos/2500001", headers=auth_header(tokens)).json()
    item_id = detail["items"][0]["id"]
    lc_client.post(
        "/api/logicollect/v1/memos/2500001/deliver",
        headers={**auth_header(tokens), "Idempotency-Key": "del-w"},
        json={"type": "full", "items": [{"id": item_id, "deliveredQty": 100}]},
    )
    due = next_business_day().isoformat()
    credit = lc_client.post(
        "/api/logicollect/v1/memos/2500001/collect",
        headers={**auth_header(tokens), "Idempotency-Key": "cred-w"},
        json={"type": "full", "mode": "credit", "creditDueAt": due},
    )
    assert credit.json()["wallet"]["cashBalance"] == 0
    cash = lc_client.post(
        "/api/logicollect/v1/memos/2500001/collect",
        headers={**auth_header(tokens), "Idempotency-Key": "cash-w"},
        json={"type": "full", "mode": "cash"},
    )
    assert cash.status_code == 200, cash.text
    assert cash.json()["memo"]["paymentStatus"] == "fullCollected"
    assert cash.json()["wallet"]["cashBalance"] == 5000
    assert cash.json()["wallet"]["creditBalance"] == 0
    moves = lc_client.get("/api/logicollect/v1/wallet/movements", params={"kind": "collect"}, headers=auth_header(tokens))
    assert moves.status_code == 200
    assert len(moves.json()) >= 2
    dep = lc_client.post(
        "/api/logicollect/v1/wallet/deposits",
        headers={**auth_header(tokens), "Idempotency-Key": "dep-w"},
        data={"method": "rocket", "amount": "1000", "transactionId": "TX-W1"},
    )
    assert dep.status_code == 200
    listed = lc_client.get("/api/logicollect/v1/wallet/deposits", headers=auth_header(tokens)).json()
    assert listed["total"] == 1000
    assert listed["records"][0]["transactionId"] == "TX-W1"
    dup = lc_client.post(
        "/api/logicollect/v1/wallet/deposits",
        headers=auth_header(tokens),
        data={"method": "rocket", "amount": "1000", "transactionId": "TX-W1"},
    )
    assert dup.status_code == 409
    nagad = lc_client.post(
        "/api/logicollect/v1/wallet/deposits",
        headers=auth_header(tokens),
        data={"method": "nagad", "amount": "100", "transactionId": "TX-N"},
    )
    assert nagad.status_code == 422 or nagad.status_code == 400


def test_chemist_photo_duplicate_and_credit_list(lc_client, dsr_a, dsr_b):
    tokens = login(lc_client)
    created = lc_client.post(
        "/api/logicollect/v1/chemists",
        headers=auth_header(tokens),
        data={"legacyCode": "0500999", "name": "Photo Chemist", "division": "Dhaka", "district": "Dhaka", "thana": "Gulshan", "phone": "01900000001"},
    )
    chemist_id = created.json()["id"]
    photo = lc_client.post(
        f"/api/logicollect/v1/chemists/{chemist_id}/photo",
        headers=auth_header(tokens),
        files={"file": ("c.jpg", io.BytesIO(JPEG), "image/jpeg")},
    )
    assert photo.status_code == 200, photo.text
    assert photo.json()["imageUrl"]
    removed = lc_client.delete(f"/api/logicollect/v1/chemists/{chemist_id}/photo", headers=auth_header(tokens))
    assert removed.json()["imageUrl"] is None
    dup = lc_client.post(
        "/api/logicollect/v1/chemists",
        headers=auth_header(tokens),
        data={"legacyCode": "0500999", "name": "Other", "division": "Dhaka", "district": "Dhaka", "thana": "Gulshan"},
    )
    assert dup.status_code in (400, 409)
    other = login(lc_client, "D002")
    hidden = lc_client.get("/api/logicollect/v1/chemists", headers=auth_header(other)).json()
    assert hidden == []
    credits = lc_client.get("/api/logicollect/v1/credit-chemists", headers=auth_header(tokens))
    assert credits.status_code == 200


def test_adjusted_returns_list(lc_client, dsr_a, memo_order):
    tokens = login(lc_client)
    lc_client.post("/api/logicollect/v1/memos/2500001/accept", headers=auth_header(tokens))
    lc_client.post("/api/logicollect/v1/memos/2500001/check-in", headers={**auth_header(tokens), "Idempotency-Key": "ck-r2"})
    detail = lc_client.get("/api/logicollect/v1/memos/2500001", headers=auth_header(tokens)).json()
    item_id = detail["items"][0]["id"]
    lc_client.post(
        "/api/logicollect/v1/memos/2500001/deliver",
        headers={**auth_header(tokens), "Idempotency-Key": "del-r2"},
        json={"type": "partial", "items": [{"id": item_id, "deliveredQty": 70, "shortReason": "short"}]},
    )
    pending = lc_client.get("/api/logicollect/v1/returns/pending", headers=auth_header(tokens)).json()
    lc_client.post(f"/api/logicollect/v1/returns/{pending[0]['id']}/adjust", headers=auth_header(tokens))
    adjusted = lc_client.get("/api/logicollect/v1/returns", params={"status": "adjusted"}, headers=auth_header(tokens)).json()
    assert adjusted
    assert adjusted[0]["adjusted"] is True
    again = lc_client.post(f"/api/logicollect/v1/returns/{pending[0]['id']}/adjust", headers=auth_header(tokens))
    assert again.status_code == 200


def test_telemetry_absent(lc_client, dsr_a):
    tokens = login(lc_client)
    resp = lc_client.post("/api/logicollect/v1/telemetry/location", headers=auth_header(tokens), json={"lat": 1, "lng": 2})
    assert resp.status_code == 404


def test_qty_over_order_rejected(lc_client, dsr_a, memo_order):
    tokens = login(lc_client)
    lc_client.post("/api/logicollect/v1/memos/2500001/accept", headers=auth_header(tokens))
    lc_client.post("/api/logicollect/v1/memos/2500001/check-in", headers=auth_header(tokens))
    detail = lc_client.get("/api/logicollect/v1/memos/2500001", headers=auth_header(tokens)).json()
    item_id = detail["items"][0]["id"]
    over = lc_client.post(
        "/api/logicollect/v1/memos/2500001/deliver",
        headers=auth_header(tokens),
        json={"type": "partial", "items": [{"id": item_id, "deliveredQty": 101, "shortReason": "x"}]},
    )
    assert over.status_code == 400
