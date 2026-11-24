# Phase B Implementation Report

Date: 23 November 2026  
Scope: FastAPI configuration, CORS, Redis, and production startup checks. Phases C through G were not started. No migration, table drop, or data reset was run.

## 1. Files modified

| File | Change |
|---|---|
| `backend/app/core/config.py` | Single settings object for database, Redis, secret, environment, CORS, auth flag, and token lifetime. Production validation expanded |
| `backend/app/database.py` | Engine URL comes from `get_settings().database_url` |
| `backend/app/redis_cache.py` | Client uses `get_settings().redis_url`. Connection failures are swallowed so the API stays up. Cache key and TTL arguments are unchanged |
| `backend/main.py` | CORS list and lifespan Redis client come from settings. Startup pings Redis and continues if it fails. Error responses no longer send `Access-Control-Allow-Origin: *` |
| `docker-compose.yml` | API service receives `ENVIRONMENT`, `REQUIRE_AUTH`, `ACCESS_TOKEN_EXPIRE_MINUTES`, and the full development CORS list. `SECRET_KEY` was not changed. Ports, volumes, and Nginx routes were not changed |
| `backend/tests/test_config_security.py` | Isolated tests for defaults, comma-separated origins, and production refusals |
| `docs/PHASE_B_IMPLEMENTATION_REPORT.md` | This report |

The running stack still uses `/tmp/swift-distro-compose.override.yml` for host ports 8088 and 6380. That override’s API environment was updated to the same non-secret values so a recreate would not drop `ENVIRONMENT` or the new origins. PostgreSQL and Redis volumes were not recreated.

Existing uncommitted files (`.dockerignore` and the earlier docs) were not overwritten.

## 2. Configuration changes

`Settings` reads:

| Variable | Development behavior |
|---|---|
| `DATABASE_URL` | Used for the SQLAlchemy engine. Unset default remains the local URL on port 55432 |
| `REDIS_URL` | Used by the cache client and the lifespan ping. Unset default is `redis://localhost:6379/0`. Compose sets `redis://redis:6379/0` |
| `SECRET_KEY` | Unchanged in Compose. Still the existing development value, so current development tokens stay valid |
| `ENVIRONMENT` | Compose now sets `development` |
| `CORS_ORIGINS` | Comma-separated. Empty or unset uses the built-in localhost and 127.0.0.1 list, including ports 3000, 5173, 8080, 8088, and 9080 |
| `REQUIRE_AUTH` | Compose sets `true`. Unset still defaults to true |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Compose sets `60`. Unset still defaults to 60 |

Production requirements, enforced only when `ENVIRONMENT` is `production` or `prod`:

- `SECRET_KEY` must be non-empty and must not be the development default.
- `REQUIRE_AUTH` must not be false.
- `CORS_ORIGINS` must not contain `*`.
- `DATABASE_URL` and `REDIS_URL` must point at the deployment services.

The running container was left on `ENVIRONMENT=development`. The secret was not rotated. Employee passwords and other rows were not edited.

## 3. CORS verification

After the API container was recreated, unauthenticated `GET /api/auth/me` through Nginx (`http://localhost:8088`):

| Origin header | HTTP status | `Access-Control-Allow-Origin` |
|---|---:|---|
| `http://localhost:8088` | 401 | `http://localhost:8088` |
| `http://127.0.0.1:9080` | 401 | `http://127.0.0.1:9080` |
| `http://evil.example` | 401 | absent |

Login `POST /api/auth/login` with `Origin: http://localhost:8088` returned 200 and `Access-Control-Allow-Origin: http://localhost:8088`.

## 4. Redis verification

Startup log after recreate contained `Application startup complete` and did not contain `Redis unavailable`.

Inside the API container, after startup:

| Check | Result |
|---|---|
| `PING` through the shared client | `True` |
| `cache_set` / `cache_get` on a temporary key `phase_b_probe` with `expire=30` | Round-trip returned `{"ok": true}` |
| `cache_delete` of that key | Following `cache_get` returned `None` |

Dashboard caching still uses `dashboard_kpis:{user_id}:{depot}` and `expire=300` in `dashboard.py`. That call site was not edited. `GET /api/dashboard/kpis` with the admin token returned HTTP 200 and `total_stock` 51997.

`redis-cli ping` was not repeated as a separate command in this phase. The application ping above used `REDIS_URL=redis://redis:6379/0`. The Redis container stayed up (healthy, not recreated).

## 5. Production security validation

These ran as separate `docker exec -e ... python` processes. The long-running Uvicorn process was not switched to production.

| Isolated process | Result |
|---|---|
| `ENVIRONMENT=production`, default `SECRET_KEY`, `REQUIRE_AUTH=true` | `RuntimeError` mentioning `SECRET_KEY` |
| `ENVIRONMENT=production`, empty `SECRET_KEY` | `RuntimeError` mentioning `SECRET_KEY` |
| `ENVIRONMENT=production`, non-default secret, `REQUIRE_AUTH=false` | `RuntimeError` mentioning `REQUIRE_AUTH` |
| `ENVIRONMENT=production`, non-default secret, `CORS_ORIGINS=*` | `RuntimeError` mentioning `CORS_ORIGINS` |

Pytest covered the same cases: `backend/tests/test_config_security.py`.

## 6. Docker restart

Command:

```bash
docker compose -f docker-compose.yml -f /tmp/swift-distro-compose.override.yml up -d --no-deps --force-recreate backend
```

Only `swift_distro_api` was recreated. Postgres and Redis remained up from the previous start (about 33 minutes at the time of the check). Nginx and the frontend were not recreated.

Cold start evidence from `docker logs swift_distro_api`:

- `Uvicorn running on http://0.0.0.0:8000`
- `Application startup complete`
- `GET /health` from inside the container returned `200`

Container environment after start, without printing the secret value: `ENVIRONMENT=development`, `REQUIRE_AUTH=true`, `ACCESS_TOKEN_EXPIRE_MINUTES=60`, database target `postgres:5432/swift_distro_hub`, `REDIS_URL=redis://redis:6379/0`, CORS list includes `http://localhost:8088` and `http://127.0.0.1:9080`. The secret is still the previous development value.

## 7. Backend test results

```text
docker exec -w /app swift_distro_api python -m pytest tests -q --tb=line -p no:cacheprovider
33 passed, 73 warnings in 8.03s
```

Passed includes the previous 26 tests plus 7 configuration tests. Failed: 0. Skipped: 0. The suite still uses in-memory SQLite via `conftest.py`.

## 8. Frontend build

`npm run build` completed in 9.04s. Output sizes were unchanged: CSS 142.08 kB, JS 1,854.62 kB. No frontend source was edited. Vite again warned about chunk size and old browserslist data.

## 9. Database preservation

Counts before the API recreate and the verification login, then after:

| Table | Before | After |
|---|---:|---:|
| employees | 6 | 6 |
| products | 14 | 14 |
| customers | 8 | 8 |
| companies | 2 | 2 |
| depots | 4 | 4 |
| stock_ledger | 88 | 88 |
| orders | 0 | 0 |
| trips | 12 | 12 |
| login_audits | 43 | 44 |
| audit_logs | 42 | 43 |

The extra audit rows are from the login request used to check JWT and `/api/auth/me`. No other counted business table changed. Volumes `postgres_data` and `redis_data` were not removed.

## 10. Login and profile

| Request | Result |
|---|---|
| `POST /api/auth/login` for the seeded admin | HTTP 200, response included an access token. The token was not recorded |
| `GET /api/auth/me` with that token | HTTP 200, `admin@swiftdistro.com`, role `admin` |
| `GET /health` on the API process | HTTP 200 |

## 11. Outstanding issues

- Compose still uses the development JWT secret. That is intentional. Production must set a different `SECRET_KEY` and `ENVIRONMENT=production` before go-live. This phase did not rotate it.
- Host `pytest` is still not installed. Tests ran in the API container.
- Nginx `/health` is the proxy’s own response, not FastAPI. The FastAPI health check was made inside the API container.
- The temporary Redis key `phase_b_probe` was deleted after the round-trip. A 30-second TTL was set in case delete had failed.
- Phase C role enforcement and later API work were not started.
