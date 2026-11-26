# LogiCollect Pro — Mobile API developer handover

**Audience:** Flutter developers  
**Runtime:** isolated development only — **not** the live RENATA web API  
**Verified:** 26 November 2026 against disposable PostgreSQL `logicollect_dev`

This API is **not** mounted on production `main:app`. Do not point the Flutter app at the live Compose URL or `swift_distro_hub`.

There is **no public hostname**. The process is bound to **127.0.0.1:18040** on the machine that starts it. Another developer on a different computer cannot reach it unless you add an SSH tunnel or you deliberately re-bind to a LAN address.

---

## Base URL (this workstation)

```
http://127.0.0.1:18040/api/logicollect/v1
```

| Resource | URL |
|---|---|
| Health | `http://127.0.0.1:18040/health` → `{"status":"healthy","logicollect":true,"production":false}` |
| Swagger UI | `http://127.0.0.1:18040/docs` |
| OpenAPI JSON | `http://127.0.0.1:18040/openapi.json` |
| Checked-in OpenAPI snapshot | `docs/logicollect-openapi.json` (exported from the running isolated app) |
| Postman collection | `docs/LogiCollect_Pro_Mobile_API.postman_collection.json` |
| Postman environment | `docs/LogiCollect_Pro_Development.postman_environment.json` |

Set Flutter `baseUrl` to `http://127.0.0.1:18040/api/logicollect/v1` so spec paths (`/auth/login`, `/memos`, …) append unchanged.

Android emulator: `http://10.0.2.2:18040/api/logicollect/v1` (host loopback).  
Physical device: SSH tunnel to this host, or start uvicorn with `--host 0.0.0.0` **and** bind Docker `-p 0.0.0.0:18040:18040` (not the default). Do not expose this API on the public internet.

---

## Startup (backend engineer — disposable PostgreSQL)

Never `swift_distro_hub`. Commercial Alembic head stays `f3_export_draft`. LogiCollect tables use a **separate** config so `alembic upgrade head` on the main tree cannot create `lc_*` tables.

```bash
# 1) Disposable Postgres (container logicollect_dev_pg, DB logicollect_dev)
LOGICOLLECT_DOCKER_NETWORK=<compose_network> backend/scripts/logicollect_dev_bootstrap.sh

# 2) If bootstrap already created commercial tables, apply lc_* (idempotent):
#    DATABASE_URL=postgresql://lc_dev:lc_dev_pass@logicollect_dev_pg:5432/logicollect_dev
#    alembic upgrade f3_export_draft
#    alembic -c alembic_logicollect.ini upgrade head
#    python db/seed_logicollect_dev.py   # safe to repeat

# 3) Isolated API (example; bind loopback only)
docker run --rm --name logicollect_dev_api \
  --network <compose_network> -p 127.0.0.1:18040:18040 \
  -e DATABASE_URL=postgresql://lc_dev:lc_dev_pass@logicollect_dev_pg:5432/logicollect_dev \
  -e SECRET_KEY=dev-logicollect-not-production -e REQUIRE_AUTH=true \
  --volumes-from swift_distro_api -w /app \
  <backend_image> uvicorn logicollect_app:app --host 0.0.0.0 --port 18040
```

PostgreSQL startup **refuses** to use `Base.metadata.create_all`. Missing `lc_sessions` fails fast with the Alembic commands above.

`alembic upgrade logicollect@head` on the **main** `alembic.ini` is **not** valid: `lc_field_api` was removed from `alembic/versions/` so production `alembic heads` is only `f3_export_draft`.

---

## Authentication

1. `POST /auth/login` with `{ "employeeId": "D001", "password": "demo123" }`.  
   `employeeId` may be employee code **or** phone.
2. Send `Authorization: Bearer <accessToken>` on every other call.
3. `POST /auth/refresh` with `{ "refreshToken" }` rotates tokens and **revokes** the previous session. Replaying the old refresh token returns `401`.
4. `POST /auth/logout` revokes the current session.

Web RENATA email login is a different token. Do not mix them.

### Synthetic accounts (disposable DB only)

| employeeId | Phone | Password | Role |
|---|---|---|---|
| `D001` | `01711111111` | `demo123` | DSR (memo `2500001`) |
| `D002` | `01711111113` | `demo123` | Same-depot DSR (cannot see D001 memos) |
| `FIN1` | `01800000001` | `demo123` | Finance (credit-clear still policy-blocked) |

Inactive employees receive `403` `ACCOUNT_INACTIVE`.

---

## Conventions

- JSON **camelCase**
- Money **integer BDT** (no silent rounding)
- Timestamps ISO-8601 with `Asia/Dhaka` offset
- Dates `YYYY-MM-DD`
- Errors `{ "code": "...", "message": "..." }`
- Validation failures: `422` `{ "code": "VALIDATION_ERROR", "message": "Request failed schema validation" }`
- Retry writes: header `Idempotency-Key`. Same key + same body replays the stored result. Same key + different body → `409` `IDEMPOTENCY_CONFLICT`. Keys are namespaced `{employeeId}:{operation}:{key}`.

Memo `id` is commercial `memo_number` (example `2500001`). Internal SQL `orders.id` is not the Flutter id.

---

## Integration sequence

1. Login → store tokens  
2. `GET /memos`  
3. `GET /memos/{id}`  
4. `POST /memos/{id}/accept`  
5. `POST /memos/{id}/check-in` (`Idempotency-Key`)  
6. `POST /memos/{id}/deliver` `{ "type": "full"|"partial", "items": [{ "id", "deliveredQty", "shortReason" }] }`  
   Line `id` values come from memo details. `deliveredQty` cannot exceed ordered qty.  
7. `GET /memos?needsCollection=true`  
8. `POST /memos/{id}/collect`  
9. `GET /wallet` then `POST /wallet/deposits` (multipart: `method`, `amount`, `transactionId`, optional `file`)  
10. Partial delivery → `GET /returns/pending` → `POST /returns/{id}/adjust`

---

## Example login

`POST /auth/login`

```json
{ "employeeId": "D001", "password": "demo123" }
```

```json
{
  "accessToken": "…",
  "refreshToken": "…",
  "expiresIn": 86400,
  "user": {
    "id": "D001",
    "name": "Shamim Sarwar",
    "phone": "01711111111",
    "profilePictureUrl": null
  }
}
```

Refresh: `POST /auth/refresh` `{ "refreshToken": "…" }`  
Logout: `POST /auth/logout` with Bearer access token.

---

## Cash / credit example (verified)

Ordered: 100 × 50 = 5,000 BDT  
Delivered: 70 × 50 = 3,500 BDT  
Cash collected: 1,000 BDT  
Collectible due: 2,500 BDT  
Wallet cash: 1,000 BDT  
Deposit 600 BDT → remaining cash 400 BDT  

Credit collection does **not** increase `cashBalance`. A later full cash collection settles credit (`creditBalance` down, `cashBalance` up). Deposit methods: `brac` | `bkash` | `rocket` (not Nagad).

---

## Enums

Delivery `status`: `pending` `accepted` `inTransit` `fullDelivered` `partialDelivered` `postponed` `canceled`  
`paymentStatus`: `due` `partialCollected` `fullCollected` `postponed` `canceled`  
Stop: `pending` `checkedIn` `delivered` `postponed` `canceled`  
Storage: `coldChain` `general`  
Deposit `method`: `brac` `bkash` `rocket`  
Collect `mode`: `cash` `credit`

---

## Known limitations (read before coding screens)

| Topic | Behavior |
|---|---|
| Production mount | **Not available** on live RENATA |
| `POST /telemetry/location` | **Deferred** — HTTP 404. Do not build GPS screens against this API. |
| `POST /credit-chemists/{id}/clear` | DSR `403` `CREDIT_CLEAR_FORBIDDEN`. Finance/admin `409` `CREDIT_CLEAR_POLICY_PENDING`. **No write-off.** Finance must approve policy before this becomes EXACT. |
| Field chemists | Stored in `lc_chemists`. Creating a chemist **does not** create a commercial `Customer` or assigned memo. Duplicate `legacyCode` → `400` `DUPLICATE_LEGACY_CODE`. |
| Credit chemist list | May display amounts using memo credit-due and matching `legacyCode` or phone. That is **not** a Customer FK link. |
| Returns adjust | DSR-reported only. `warehouseReceipt: false`. No stock restock. |
| Collection postpone (no date) | `creditDueAt` = next Asia/Dhaka calendar day. |
| Collection cancel | `paymentStatus=canceled` only. Paid cash is **not** written off. |
| Performance targets | `targetsConfigured: false` until `lc_performance_targets` is seeded. |
| Web `/api/mobile/*` | Legacy depot-wide accept API. Do **not** call it from LogiCollect. |

---

## Endpoint list (prefix `/api/logicollect/v1`)

Auth: `POST /auth/login`, `GET|PATCH /auth/me`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/me/photo`, `DELETE /auth/me/photo`, `POST /auth/change-password`, `GET /media/{id}`  
Memos: `GET /memos`, `GET /memos/{id}`, `POST /memos/{id}/accept`, `POST /memos/accept-batch`, `POST /memos/{id}/check-in`, `POST /memos/{id}/deliver`, `POST /memos/{id}/postpone`, `POST /memos/{id}/cancel`, `POST /memos/{id}/collect`  
Route/wallet: `GET /routes/today`, `GET /wallet`, `GET /wallet/movements`, `POST|GET /wallet/deposits`  
Returns: `GET /returns/pending`, `GET /returns`, `POST /returns/{id}/adjust`  
Chemists: `GET|POST /chemists`, `PATCH /chemists/{id}`, `POST|DELETE /chemists/{id}/photo`, `POST /chemists/{id}/active`, `GET /credit-chemists`, `POST /credit-chemists/{id}/clear`  
Other: `GET /exceptions`, `GET /performance`, `GET /activity`
