# LogiCollect Pro — Final API contract compliance matrix

**Scored runtime:** isolated `logicollect_app` (`http://127.0.0.1:18040/api/logicollect/v1`) against disposable PostgreSQL `logicollect_dev` plus SQLite HTTP pytest.  
**Production `main:app`:** none of these routes exist (`lc_on_main False`).

Statuses: **EXACT** only when an HTTP test covers request, response and the required rule. **PARTIAL** = implemented as a blocked mutation. **DEFERRED** = not built.

| # | Method | Spec path | Implemented path | Auth | Tests | Isolated status | main:app |
|---|---|---|---|---|---|---|---|
| 1 | POST | `/auth/login` | `/api/logicollect/v1/auth/login` | public | `test_auth_and_memos`, `test_http_contract` (inactive) | EXACT | missing |
| 2 | GET | `/auth/me` | `.../auth/me` | LC JWT | `test_auth_and_memos` | EXACT | missing |
| 3 | POST | `/auth/logout` | `.../auth/logout` | LC JWT | `test_auth_and_memos` | EXACT | missing |
| 4 | PATCH | `/auth/me` | `.../auth/me` | LC JWT | `test_auth_and_memos` | EXACT | missing |
| 5 | POST | `/auth/me/photo` | `.../auth/me/photo` | LC JWT | `test_http_contract` JPEG + reject PNG | EXACT | missing |
| 6 | DELETE | `/auth/me/photo` | `.../auth/me/photo` | LC JWT | `test_http_contract` | EXACT | missing |
| 7 | POST | `/auth/change-password` | `.../auth/change-password` | LC JWT | `test_auth_and_memos` | EXACT | missing |
| 8 | GET | `/memos` | `.../memos` | LC JWT | `test_auth_and_memos` assignee scope | EXACT | missing |
| 9 | GET | `/memos/{id}` | `.../memos/{id}` | LC JWT | `test_auth_and_memos` 404 foreign | EXACT | missing |
| 10 | POST | `/memos/{id}/accept` | same | LC JWT | `test_auth_and_memos` | EXACT | missing |
| 11 | POST | `/memos/accept-batch` | same | LC JWT | `test_auth_and_memos` skips foreign | EXACT | missing |
| 12 | POST | `/memos/{id}/check-in` | same | LC JWT | `test_delivery_finance` idempotent | EXACT | missing |
| 13 | POST | `/memos/{id}/deliver` | same | LC JWT | `test_delivery_finance`, qty cap `test_http_contract` | EXACT | missing |
| 14 | POST | `/memos/{id}/postpone` | same | LC JWT | `test_http_contract` terminal + route stop | EXACT | missing |
| 15 | POST | `/memos/{id}/cancel` | same | LC JWT | `test_http_contract` | EXACT | missing |
| 16 | POST | `/memos/{id}/collect` | same | LC JWT | `test_delivery_finance`, credit→cash `test_http_contract`, PG concurrent | EXACT | missing |
| 17 | GET | `/routes/today` | same | LC JWT | `test_chemists_security`, postpone sync `test_http_contract` | EXACT | missing |
| 18 | GET | `/wallet` | same | LC JWT | `test_delivery_finance`, `test_pg_concurrency` HTTP | EXACT | missing |
| 19 | GET | `/wallet/movements` | same | LC JWT | `test_http_contract` | EXACT | missing |
| 20 | POST | `/wallet/deposits` | same (multipart) | LC JWT | `test_delivery_finance`, duplicate txn, PG concurrent | EXACT | missing |
| 21 | GET | `/wallet/deposits` | same | LC JWT | `test_http_contract` | EXACT | missing |
| 22 | GET | `/returns/pending` | same | LC JWT | `test_delivery_finance` remainingQty | EXACT | missing |
| 23 | POST | `/returns/{id}/adjust` | same | LC JWT | `test_delivery_finance` no warehouse receipt | EXACT | missing |
| 24 | GET | `/returns?status=adjusted` | `.../returns` | LC JWT | `test_http_contract` | EXACT | missing |
| 25 | GET | `/chemists` | same | LC JWT | `test_chemists_security` employee isolation | EXACT | missing |
| 26 | POST | `/chemists` | same (form) | LC JWT | `test_chemists_security`, duplicate code `test_http_contract` | EXACT | missing |
| 27 | PATCH | `/chemists/{id}` | same | LC JWT | `test_chemists_security` | EXACT | missing |
| 28 | POST | `/chemists/{id}/photo` | same | LC JWT | `test_http_contract` JPEG | EXACT | missing |
| 29 | DELETE | `/chemists/{id}/photo` | same | LC JWT | `test_http_contract` | EXACT | missing |
| 30 | POST | `/chemists/{id}/active` | same | LC JWT | `test_chemists_security` | EXACT | missing |
| 31 | GET | `/credit-chemists` | same | LC JWT | `test_http_contract` HTTP 200 | EXACT | missing |
| 32 | POST | `/credit-chemists/{id}/clear` | same | LC JWT | `test_chemists_security` DSR 403 / finance 409 | **PARTIAL** | missing |
| 33 | GET | `/exceptions` | same | LC JWT | `test_chemists_security` | EXACT | missing |
| 34 | GET | `/performance` | same | LC JWT | `test_chemists_security` | EXACT | missing |
| 35 | GET | `/activity` | same | LC JWT | `test_chemists_security` | EXACT | missing |
| 36 | POST | `/telemetry/location` | — | — | `test_http_contract` HTTP 404 | **DEFERRED** | missing |

Extra documented (not in the original 36): `POST /auth/refresh` (rotation + replay 401), `GET /media/{id}`, `GET /health`, `GET /`.

**Isolated HTTP-verified:** 34 EXACT / 1 PARTIAL / 1 DEFERRED.  
**Production contract:** 0%. Prior “34 EXACT” scores that listed photo/postpone/cancel/movements without HTTP tests were **overstated**; this matrix replaces them.
