# Phase F.4B.1C — E2E CI Automation and Test Hardening

Date: 25 November 2026  
Status: **Complete.** Default Draft E2E uses a disposable PostgreSQL 16 database named `reneta_e2e`, Alembic `upgrade head`, synthetic fixtures, isolated FastAPI and Vite, and Playwright Chromium. Live `swift_distro_hub` was not a write target. GitHub Actions CI is configured in-repo; remote Actions execution was not available from this environment. F.4B.2 and F.4C were not started.

---

## 1. Files changed

| File | Change |
|---|---|
| `e2e/run-isolated.sh` | One-command synthetic stack: owned `reneta_e2e_*` containers, Alembic, seed, health waits, Playwright, EXIT cleanup |
| `e2e/lib/refuse_live.py` | Rejects empty URLs, Supabase, `swift_distro_hub`, and non-allowlisted database names |
| `e2e/draft-modules/seed_isolated.py` | Allow `reneta_e2e` (CI/synthetic) and `f4b1b_iso` (optional local dump path) |
| `e2e/draft-modules/global-setup.ts` | Same allowlist; refuse live database name |
| `e2e/draft-modules/helpers.ts` | `markSampleGiftSubmitted` via owned `psql` or host Python; no `f4b1b_api` docker exec |
| `e2e/draft-modules/mark_submitted.py` | Host-path 409 helper; refuses live URL |
| `e2e/draft-modules/auth.spec.ts` | Empty lists; manager Export list |
| `e2e/draft-modules/export.spec.ts` | Duplicate document 409 after shipping fields filled |
| `e2e/draft-modules/flags-and-conflict.spec.ts` | Export flags-off; unmounted submit/approve/reject; 409 without hardcoded container |
| `e2e/draft-modules/start_isolated.sh` | Documented as optional dump-based local path, not CI |
| `e2e/draft-modules/stop_isolated.sh` | Stops `f4b1b_*` and `reneta_e2e_*` only; never drops `swift_distro_hub` |
| `playwright.config.ts` | HTML + JUnit reporters; `testMatch **/*.spec.ts`; retries 0; workers 1 |
| `package.json` | `npm run test:e2e:isolated` |
| `.gitignore` | `e2e/logs/` |
| `.github/workflows/ci.yml` | **New.** pytest, Vitest + production build, isolated Playwright on PostgreSQL 16 |

**Not changed:** Compose Draft flags; live Alembic; workflow endpoint mounts; eligibility wiring into live APIs; product flags; RBAC codes; billing; stock; production deploy workflows.

---

## 2. Existing E2E architecture

F.4B.1B used `start_isolated.sh` to restore a production dump into `f4b1b_iso` **on the live postgres container**, then ran extra API containers on `swift_network`. That path is retained for optional local dump testing. It is **not** the CI or default command.

F.4B.1C default:

1. Docker network `reneta_e2e_net` (created if missing).
2. `postgres:16-alpine` named `reneta_e2e_pg`, database `reneta_e2e`, user `e2e_user`.
3. `alembic upgrade head` (`d4_baseline` → `f2_sample_gift_draft` → `f3_export_draft`).
4. Synthetic seed: depots E2E-A / E2E-B, users `@example.com`, SKUs `E2E-SAMPLE-SKU` / `E2E-EXPORT-SKU`.
5. Isolated APIs `reneta_e2e_api` (writes yes) and `reneta_e2e_api_flags` (writes no) on host ports 18010 / 18011.
6. Vite on `127.0.0.1:15174` with `VITE_API_URL=http://127.0.0.1:18010/api`.
7. Playwright Chromium, workers 1, retries 0.
8. Cleanup of **owned** names only.

CI host runtime (`E2E_RUNTIME=host`) uses the GitHub Actions PostgreSQL 16 service and local uvicorn; it does not create Docker API containers.

---

## 3. One-command execution

```bash
npm run test:e2e:isolated
```

Runs `bash e2e/run-isolated.sh`. Steps:

1. Verify `docker` (docker runtime), `node`, `npm`, `python3`, `curl`, `npx`; `npm ci` if Playwright is missing.
2. Create disposable PostgreSQL (`reneta_e2e`) unless `E2E_RUNTIME=host` with `E2E_DATABASE_URL`.
3. Apply the current Alembic chain.
4. Seed synthetic users, depots, products.
5. Start isolated FastAPI (writes on) and flags-off FastAPI.
6. Start isolated Vite.
7. Wait for `/health` and `/login`.
8. Confirm the API `engine.url.database` is `reneta_e2e`.
9. Execute Playwright Chromium.
10. Write sanitized logs under `e2e/logs/` and Playwright HTML/JUnit under `playwright-report/` and `test-results/`.
11. `trap EXIT INT TERM` stops Vite/uvicorn and removes owned containers/network even when tests fail.

Optional local dump path (not CI): `e2e/draft-modules/start_isolated.sh` then `npx playwright test --project=chromium`, then `stop_isolated.sh`.

---

## 4. Database isolation safeguards

| Control | Behavior |
|---|---|
| Allowlist | `reneta_e2e`, `f4b1b_iso` only |
| Live name | `swift_distro_hub` rejected in `refuse_live.py`, seed, global-setup, Alembic `env.py`, runner post-start check |
| Credentials | E2E user/password/secret are test-only; not Compose `swift_user` |
| Feature flags | Isolated APIs set flags in **container env only**. Live Compose remains `SAMPLE_GIFT_DRAFT_WRITES=no` / `EXPORT_DRAFT_WRITES=no` |
| Cleanup | `docker rm` only `reneta_e2e_pg`, `reneta_e2e_api`, `reneta_e2e_api_flags`. Network `reneta_e2e_net`. Never `swift_distro_*`, never `postgres_data` |
| CI | Synthetic Alembic + seed. No production dump, no live secrets |

Host probe after this phase: live API still `swift_distro_hub`; E2E containers absent; E2E ports free.

---

## 5. CI workflow configuration

No prior CI provider files existed. Added `.github/workflows/ci.yml` (GitHub Actions).

| Job | What |
|---|---|
| `backend-pytest` | Python 3.11, pip cache, SQLite pytest (`conftest.py` forces Draft flags yes for tests only), JUnit artifact |
| `frontend-unit-and-build` | Node 20, `npm ci`, `npm test`, `npm run build` |
| `playwright-isolated` | PostgreSQL 16 service `reneta_e2e`, `E2E_RUNTIME=host`, `refuse_live.py`, `npm run test:e2e:isolated`, Playwright Chromium + OS deps, HTML/JUnit/log artifacts |

Timeouts, pip/npm caches, Postgres healthcheck, `CI=true`. No production secrets. Does not modify any production deploy workflow.

**Configuration vs execution:** workflow YAML is in the tree and was reviewed for job shape, env, and isolation. This machine did not push to GitHub or run `act`. Remote Actions has **not** been observed green.

---

## 6. Expanded Playwright coverage

The original ten F.4B.1B cases remain. Suite is **11** tests (one added: unmounted workflow routes). Additional assertions were merged into existing tests to avoid worker/auth leakage.

| Area | Coverage |
|---|---|
| Sample/Gift | Auth redirect; empty list; Sample + Gift create; product picker; qty validation; duplicate number; detail; Retry; Print disabled |
| Export | Auth; create; shipping fields; product; decimal total `41`; invalid qty/price; duplicate 409; Print disabled |
| Security | Unauthenticated → login; admin/manager read; PSO POST 403; foreign depot Not found; flags-off POST 403 for Sample/Gift and Export; submit/approve/reject **404** (unmounted) |
| Concurrency UI | PUT after SQL mark Submitted → 409, original recipient preserved |

Business APIs are the isolated FastAPI app, not mocks (list Retry still aborts one GET to prove the button).

---

## 7. Three consecutive Playwright run results

Command: `npm run test:e2e:isolated`. Playwright retries: **0**. Workers: **1**.

| Run | Result | Playwright wall time | Notes |
|---|---|---|---|
| 1 | **11 passed** | 1.3m | Alembic d4→f2→f3 on empty `reneta_e2e` |
| 2 | **11 passed** | 1.3m | Fresh database; owned containers removed after run 1 |
| 3 | **11 passed** | 1.2m | Same |

A **pre-consecutive** diagnostic run failed 1 test (export duplicate clicked Save without required ports). That was fixed by filling ports and waiting for POST **409**. It is not counted in the three consecutive green runs.

Cleanup after each run: no `reneta_e2e_*` containers; ports 15174 / 18010 / 18011 / 15432 free.

---

## 8. Test artifacts

| Artifact | Location | Git |
|---|---|---|
| Playwright HTML | `playwright-report/` | gitignored |
| JUnit | `test-results/junit.xml` | gitignored |
| Screenshots / traces | `test-results/` on failure (`retain-on-failure`) | gitignored |
| Sanitized API/Vite logs | `e2e/logs/` (passwords and `postgresql://` redacted) | gitignored |
| Isolation env | `e2e/.env.isolated`, `e2e/.isolation.json` | gitignored |

CI uploads `playwright-report`, `test-results`, `e2e/logs`, and backend JUnit when the workflow runs on GitHub.

---

## 9. Backend test results

`docker exec -e PYTHONPATH=/app -w /tmp swift_distro_api pytest /app/tests -p no:cacheprovider`

**141 passed**, 199 warnings, 130.33s.

SQLite in-memory (`conftest.py`). Includes Draft CRUD, eligibility helper, status transition helper, concurrency PUT, RBAC/depot, commercial orders, stock reservation, billing. Assertions were not weakened. Pytest did not use `swift_distro_hub`.

---

## 10. Frontend tests and build

| Command | Result |
|---|---|
| `npm test` (Vitest) | **10 passed** (2 files) |
| `npm run build` | Success, ~21s |

---

## 11. Git and deployment safety

| Item | Value |
|---|---|
| Branch | `new-version` |
| HEAD | `8511bdaa675f6f00ddfbfec6309f4e65b7f093c3` (`chore: gate F.2/F.3 writes after live upgrade`) |
| Uncommitted work | Preserved (prior phases plus this F.4B.1C set). No reset, no discard, no commit |
| CI addition | `.github/workflows/ci.yml` (untracked until committed) |
| Test deps | Existing `@playwright/test`; backend `pytest` from `requirements.txt`; CI installs Chromium with OS deps |
| Deploy | **Not performed.** Compose and live volumes were not modified |

---

## 12. Live database preservation

Read-only after E2E cleanup:

| Check | Result |
|---|---|
| Alembic | `f3_export_draft` |
| Application tables (excl. `alembic_version`) | **82** |
| `sample_gift_deliveries` | **0** |
| `export_deliveries` | **0** |
| Products | **14**; sample flags **0**; export flags **0** |
| Orders | **131** |
| Invoices | **5** |
| `product_item_stock.stock_qty` sum | **13275.00** |
| Detail available / reserved | **10635.00** / **2640.00** |
| Live API database name | `swift_distro_hub` |
| Compose Draft flags | `no` / `no` (`get_settings` writes False/False) |
| FastAPI `/health` in `swift_distro_api` | `{"status":"healthy"}` |

No live write tests. No live Alembic. No live flag changes.

---

## 13. Business approval status

`docs/PHASE_F_4_BUSINESS_POLICY_APPROVAL.md` Section E remains unsigned. All **20** decisions remain **Pending**.

Therefore this phase did **not**:

- Mount submit / approve / reject
- Wire eligibility validation into live Draft APIs
- Enable live Draft creation flags
- Change live SKU classifications
- Implement F.4C stock behavior

Isolated E2E sets write flags **only** on `reneta_e2e_*` (or host uvicorn in CI). Live Compose stays off.

---

## 14. Remaining risks

- GitHub Actions has not been executed on the remote runner.
- Optional dump-based `start_isolated.sh` still uses the live **postgres container** (database `f4b1b_iso` only). Default `npm run test:e2e:isolated` does not.
- Playwright remains serial (workers 1). Parallel workers would need per-worker databases.
- Host port 15174 must be free; the runner now stops leftover Vite bound to that host/port from this harness.
- Image reuse inspects `swift_distro_api` for a tag if `reneta_e2e_api:local` is absent (read-only). CI host path does not use that image.
- Empty-catalog test PUTs product flags on the **isolated** catalog and restores them in `finally`.

---

## 15. GO / NO-GO for the next phase

| Gate | Verdict |
|---|---|
| F.4B.1C (this work) | **GO — complete** |
| F.4B.2 workflow integration | **NO-GO** — business policy pending |
| F.4C stock / issuance | **NO-GO** — not authorized |

Engineering recommendation: keep Draft writes off in live Compose until Section E is signed. Use `npm run test:e2e:isolated` as the repeatable regression command.
