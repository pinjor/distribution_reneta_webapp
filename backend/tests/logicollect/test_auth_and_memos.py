from tests.logicollect.conftest import auth_header, login, make_order


def test_login_phone_and_code(lc_client, dsr_a):
    by_code = login(lc_client, "D001")
    assert by_code["user"]["id"] == "D001"
    assert by_code["user"]["name"] == "Shamim Sarwar"
    assert "accessToken" in by_code and "refreshToken" in by_code
    assert by_code["expiresIn"] == 86400
    by_phone = login(lc_client, "01711111111")
    assert by_phone["user"]["id"] == "D001"


def test_login_rejects_bad_password(lc_client, dsr_a):
    resp = lc_client.post("/api/logicollect/v1/auth/login", json={"employeeId": "D001", "password": "wrong"})
    assert resp.status_code == 401
    assert resp.json()["code"] == "INVALID_CREDENTIALS"


def test_me_and_logout_revokes(lc_client, dsr_a):
    tokens = login(lc_client)
    me = lc_client.get("/api/logicollect/v1/auth/me", headers=auth_header(tokens))
    assert me.status_code == 200
    assert me.json()["id"] == "D001"
    out = lc_client.post("/api/logicollect/v1/auth/logout", headers=auth_header(tokens))
    assert out.status_code == 200
    again = lc_client.get("/api/logicollect/v1/auth/me", headers=auth_header(tokens))
    assert again.status_code == 401


def test_refresh_rotates(lc_client, dsr_a):
    tokens = login(lc_client)
    refreshed = lc_client.post("/api/logicollect/v1/auth/refresh", json={"refreshToken": tokens["refreshToken"]})
    assert refreshed.status_code == 200
    old = lc_client.get("/api/logicollect/v1/auth/me", headers=auth_header(tokens))
    assert old.status_code == 401
    new = lc_client.get("/api/logicollect/v1/auth/me", headers=auth_header(refreshed.json()))
    assert new.status_code == 200


def test_change_password_and_phone_login(lc_client, dsr_a):
    tokens = login(lc_client)
    bad = lc_client.post(
        "/api/logicollect/v1/auth/change-password",
        headers=auth_header(tokens),
        json={"currentPassword": "nope", "newPassword": "newpass1"},
    )
    assert bad.status_code == 400
    ok = lc_client.post(
        "/api/logicollect/v1/auth/change-password",
        headers=auth_header(tokens),
        json={"currentPassword": "demo123", "newPassword": "newpass1"},
    )
    assert ok.status_code == 200
    patch = lc_client.patch("/api/logicollect/v1/auth/me", headers=auth_header(tokens), json={"phone": "01899999999", "name": "Shamim S"})
    assert patch.status_code == 200
    lc_client.post("/api/logicollect/v1/auth/logout", headers=auth_header(tokens))
    again = login(lc_client, "01899999999", "newpass1")
    assert again["user"]["name"] == "Shamim S"


def test_memos_scoped_and_accept(lc_client, db_session, dsr_a, dsr_b, customer, product_general, memo_order):
    make_order(db_session, dsr_b, customer, product_general, memo="2500002")
    tokens_a = login(lc_client, "D001")
    tokens_b = login(lc_client, "D002")
    listed = lc_client.get("/api/logicollect/v1/memos", headers=auth_header(tokens_a)).json()
    assert [m["id"] for m in listed] == ["2500001"]
    listed_b = lc_client.get("/api/logicollect/v1/memos", headers=auth_header(tokens_b)).json()
    assert [m["id"] for m in listed_b] == ["2500002"]
    hidden = lc_client.get("/api/logicollect/v1/memos/2500002", headers=auth_header(tokens_a))
    assert hidden.status_code == 404
    acc = lc_client.post("/api/logicollect/v1/memos/2500001/accept", headers=auth_header(tokens_a))
    assert acc.status_code == 200
    assert acc.json()["status"] == "accepted"
    assert acc.json()["assignedTo"] == "D001"
    batch = lc_client.post("/api/logicollect/v1/memos/accept-batch", headers=auth_header(tokens_a), json={"ids": ["2500001", "2500002"]})
    assert batch.status_code == 200
    assert "2500002" not in batch.json()["accepted"]


def test_missing_jwt(lc_client):
    resp = lc_client.get("/api/logicollect/v1/memos")
    assert resp.status_code == 401
