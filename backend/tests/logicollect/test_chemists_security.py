from tests.logicollect.conftest import auth_header, login, make_order


def test_chemists_crud(lc_client, dsr_a):
    tokens = login(lc_client)
    created = lc_client.post(
        "/api/logicollect/v1/chemists",
        headers=auth_header(tokens),
        data={
            "legacyCode": "0500726",
            "name": "Chowdhury Drugs",
            "division": "Dhaka",
            "district": "Dhaka",
            "thana": "Dhanmondi",
            "phone": "01911111114",
        },
    )
    assert created.status_code == 200, created.text
    chemist_id = created.json()["id"]
    patched = lc_client.patch(
        f"/api/logicollect/v1/chemists/{chemist_id}",
        headers=auth_header(tokens),
        json={"name": "Chowdhury Drugs Ltd"},
    )
    assert patched.json()["name"] == "Chowdhury Drugs Ltd"
    flag = lc_client.post(
        f"/api/logicollect/v1/chemists/{chemist_id}/active",
        headers=auth_header(tokens),
        json={"active": False},
    )
    assert flag.json()["active"] is False
    listed = lc_client.get("/api/logicollect/v1/chemists", headers=auth_header(tokens)).json()
    assert listed[0]["legacyCode"] == "0500726"


def test_credit_clear_blocked(lc_client, dsr_a, finance_user):
    dsr = login(lc_client, "D001")
    forbidden = lc_client.post("/api/logicollect/v1/credit-chemists/x/clear", headers=auth_header(dsr))
    assert forbidden.status_code == 403
    fin = login(lc_client, "FIN1")
    pending = lc_client.post("/api/logicollect/v1/credit-chemists/x/clear", headers=auth_header(fin))
    assert pending.status_code == 409
    assert pending.json()["code"] == "CREDIT_CLEAR_POLICY_PENDING"


def test_foreign_and_same_depot_isolation(lc_client, db_session, dsr_a, dsr_foreign, customer, product_general, memo_order):
    make_order(db_session, dsr_foreign, customer, product_general, memo="2500099")
    tokens = login(lc_client, "D001")
    assert lc_client.get("/api/logicollect/v1/memos/2500099", headers=auth_header(tokens)).status_code == 404
    foreign = login(lc_client, "D009")
    assert lc_client.get("/api/logicollect/v1/memos/2500001", headers=auth_header(foreign)).status_code == 404


def test_exceptions_and_route_and_performance(lc_client, db_session, dsr_a, customer, product_cold, memo_order):
    make_order(db_session, dsr_a, customer, product_cold, memo="2500008", qty=5, price=100)
    tokens = login(lc_client)
    exc = lc_client.get("/api/logicollect/v1/exceptions", headers=auth_header(tokens)).json()
    assert any(row["memoId"] == "2500008" for row in exc)
    route = lc_client.get("/api/logicollect/v1/routes/today", headers=auth_header(tokens)).json()
    assert route["id"].endswith("D001")
    assert {s["memoId"] for s in route["stops"]} >= {"2500001", "2500008"}
    perf = lc_client.get("/api/logicollect/v1/performance", params={"month": "2026-11"}, headers=auth_header(tokens))
    assert perf.status_code == 200
    assert perf.json()["targetsConfigured"] is False
    act = lc_client.get("/api/logicollect/v1/activity", headers=auth_header(tokens))
    assert act.status_code == 200


def test_main_app_does_not_mount_logicollect(client):
    resp = client.get("/api/logicollect/v1/auth/me")
    assert resp.status_code in (401, 404)
    listed = [getattr(r, "path", "") for r in client.app.routes]
    assert not any(path.startswith("/api/logicollect") for path in listed)
