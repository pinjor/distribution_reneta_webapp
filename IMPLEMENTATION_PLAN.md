# DMS Production Hardening — Implementation Plan

**Generated:** Phase 1 codebase re-scan  
**Stack:** FastAPI + SQLAlchemy + PostgreSQL + React/Vite + TanStack Query

---

## Codebase Snapshot

| Layer | Location | Notes |
|-------|----------|-------|
| Backend entry | `backend/main.py` | 32 routers, `create_all()` on startup |
| Auth | `backend/app/auth.py`, `routers/auth.py` | JWT; `get_current_user` only on `/auth/me` |
| Models | `backend/app/models.py` | 43 tables, ~990 lines |
| Schemas | `backend/app/schemas.py` | Pydantic DTOs |
| Orders | `backend/app/routers/orders.py` | ~2900 lines, selection-only validation |
| FEFO | `order_deliveries.py`, `stock_maintenance.py` | Not used at validation |
| Mobile API | `backend/app/routers/mobile.py` | 4 endpoints (separate DEX repo) |
| Frontend API | `src/lib/api.ts` | JWT in headers; 401 clears token |
| Migrations | `backend/db/migrations/` | Manual SQL (Alembic in deps, not configured) |
| Tests | `test_backend.py` only | No pytest suite |

---

## Gap-to-Task Mapping

| Gap | Existing Evidence | Required Fix | Files to Modify | New Files | Migration | Test | Priority |
|-----|-------------------|--------------|-----------------|-----------|-----------|------|----------|
| Open APIs | `main.py` no router deps | Global `require_auth` on business routers | `main.py`, all routers | `core/deps.py`, `core/config.py` | No | Yes | P1 |
| No RBAC | `employees.role` string unused | Permissions tables + `require_permission` | `models.py`, `auth.py` | `core/permissions.py`, `routers/permissions.py` | Yes | Yes | P1 |
| No depot isolation | Queries unscoped | `require_depot_access` + query filters | Routers, services | `core/deps.py` | No | Yes | P1 |
| Default SECRET_KEY | `auth.py:10` | Fail in production if default | `core/config.py` | — | No | Yes | P1 |
| No audit log | Not Found | `audit_logs` table + service | Write routers | `services/audit_service.py`, `routers/audit_logs.py` | Yes | Yes | P1 |
| Selection-only validation | `orders.py:validate_orders` | Rules engine + tables | `orders.py` | `services/order_validation_service.py`, `routers/validation.py` | Yes | Yes | P1 |
| Status conflation | `collection_status` as delivery proxy | Separate enums + history | `models.py`, `orders.py` | `services/status_service.py` | Yes | Yes | P1 |
| No promotions | Not Found | Engine + CRUD + approval | — | `services/promotion_service.py`, `routers/promotions.py` | Yes | Yes | P2 |
| Mock reconciliation | `Reconciliation.tsx` mock | Real API + tables | `Reconciliation.tsx` | `services/reconciliation_service.py`, `routers/reconciliation.py` | Yes | Yes | P2 |
| No refund liability | Not Found | Tables + settlement API | — | `services/refund_service.py`, `routers/refunds.py` | Yes | Yes | P2 |
| No integrations | UI toast only | Adapter framework + job queue | — | `services/integration/*`, `routers/integrations.py` | Yes | Yes | P3 |
| No device binding | Not Found | `mobile_devices` + APIs | `mobile.py` | `services/device_service.py`, `routers/devices.py` | Yes | Yes | P3 |
| No sync queue | Not Found | Push/pull + idempotency | — | `services/sync_service.py`, `routers/sync.py` | Yes | Yes | P3 |
| 57 missing reports | ~8 real queries | Report registry + 65 endpoints | — | `services/reports/*`, `routers/reports.py` | Partial | Yes | P4 |
| Weak DB | Missing FKs/indexes | Migration SQL + Alembic init | `database.py` | `db/migrations/001_platform_hardening.sql` | Yes | No | P4 |
| No frontend tests | No vitest | Vitest + RTL setup | `package.json` | `src/**/*.test.tsx` | No | Yes | P5 |
| No backend tests | Smoke only | pytest + fixtures | `requirements.txt` | `backend/tests/*` | No | Yes | P5 |

---

## Implementation Order

### Priority 1 (this sprint)
1. `core/config.py`, `core/deps.py`, `core/permissions.py`
2. Platform models + `001_platform_hardening.sql`
3. Audit service + router + hook into order writes
4. Order validation service + new APIs (keep legacy `/validate`)
5. Status service + `delivery_status` / new collection enum + history
6. Protect all routers in `main.py`
7. Frontend: 401/403, permissions context, audit page, validation results
8. pytest: auth, audit, validation, status

### Priority 2
- Promotion engine + frontend
- Reconciliation + day-end + replace mock UI
- Refund liability + settlement

### Priority 3
- Integration framework (adapters + job queue)
- Device binding backend
- Sync queue APIs

### Priority 4
- Report registry (65 reports)
- Report Center frontend
- Dashboard depot filters

### Priority 5
- Performance, expanded tests, QA documentation

---

## Public vs Protected Routes (Target)

**Public:** `GET /`, `GET /health`, `POST /api/auth/login`, `POST /api/auth/signup`  
**Auth required:** All other `/api/*` routes  
**Permission-gated:** Writes by module (orders.write, billing.approve, etc.)

---

## Compatibility Notes

- Legacy `POST /api/orders/validate` delegates to new engine (backward compatible response shape)
- Legacy `collection_status` string synced from new enum for existing screens
- Mobile APIs in this repo remain compatible; DEX repo consumes new endpoints additively
