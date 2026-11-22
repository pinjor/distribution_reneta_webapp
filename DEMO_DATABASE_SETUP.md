# Demo Database Setup

The application database in Docker Compose is `swift_distro_hub`. Do not seed, truncate, or drop it. The commands below create a separate database named `swift_distro_demo` on the same PostgreSQL server. They were not run as part of the analysis, because that database did not exist and the task forbids executing the seed until a disposable target is confirmed.

Credentials below are the Compose development defaults already in `docker-compose.yml` (`swift_user` / `swift_password`). Do not copy a production password into the shell history if this server is not the local Compose instance.

## 1. Confirm the target

```bash
docker exec swift_distro_postgres psql -U swift_user -d postgres -c '\l'
```

Proceed only when `swift_distro_hub` is the existing application database and `swift_distro_demo` is absent or is a database you created for this purpose and can drop.

## 2. Create the empty demo database

```bash
docker exec swift_distro_postgres createdb -U swift_user swift_distro_demo
```

If the name already exists and you are certain it is disposable:

```bash
docker exec swift_distro_postgres psql -U swift_user -d postgres -c \
  "SELECT datname FROM pg_database WHERE datname = 'swift_distro_demo';"
```

Drop it only after that query returns `swift_distro_demo` and you have confirmed it is not the hub database:

```bash
docker exec swift_distro_postgres dropdb -U swift_user swift_distro_demo
docker exec swift_distro_postgres createdb -U swift_user swift_distro_demo
```

Never substitute `swift_distro_hub` in `dropdb`.

## 3. Copy schema only

Alembic revision `001_platform` alters an existing schema. It does not create the base tables. Dump schema from the hub database and load that schema into the demo database. This does not copy rows.

```bash
docker exec swift_distro_postgres pg_dump -U swift_user -d swift_distro_hub \
  --schema-only --no-owner --no-privileges \
  | docker exec -i swift_distro_postgres psql -U swift_user -d swift_distro_demo
```

Check:

```bash
docker exec swift_distro_postgres psql -U swift_user -d swift_distro_demo -c \
  "SELECT count(*) AS companies FROM companies; SELECT count(*) AS orders FROM orders;"
```

Expect `companies` 0 and `orders` 0. If either count is large, stop. The dump was not schema-only, or the demo database already had data.

## 4. Seed

From the API container (the backend tree is mounted at `/app`). Both variables are required. The database name in the URL must equal `DEMO_DATABASE_CONFIRM` and must contain `demo`.

```bash
docker exec -w /app \
  -e DEMO_DATABASE_URL=postgresql://swift_user:swift_password@postgres:5432/swift_distro_demo \
  -e DEMO_DATABASE_CONFIRM=swift_distro_demo \
  swift_distro_api python -m db.seed_demo_environment
```

The script sets `DATABASE_URL` to the demo URL inside that process only. It does not edit `.env` or `docker-compose.yml`. The already running API process keeps using `swift_distro_hub`.

Login after a successful seed: `admin@swiftdistro.com` / `admin123`.

## 5. Rerun and validate

Rerun the same command. Workflow numbers (`88001001`, `DEMO-REC-*`, `DEMO-DT-*`, `DEMO-DEP-*`) are skipped when present. Opening stock is not reset once `product_item_stock` has rows.

Read-only check:

```bash
docker exec -w /app \
  -e DEMO_DATABASE_URL=postgresql://swift_user:swift_password@postgres:5432/swift_distro_demo \
  -e DEMO_DATABASE_CONFIRM=swift_distro_demo \
  swift_distro_api python -m db.validate_demo_inventory
```

The validator exits non-zero if any batch or ledger row breaks `quantity = available_quantity + reserved_quantity`, if reserved quantity disagrees with `RESERVED` allocations, or if the session is `swift_distro_hub`.

## 6. Reset the demo database

Use section 2 (`dropdb` / `createdb` on `swift_distro_demo` only), then repeat sections 3 and 4. Do not use `TRUNCATE` against `swift_distro_hub`. Do not run `python -m db.seed_all_data` on the demo database. That older entrypoint inserts approved receipts, approved adjustments, and received transfers without the posting rules in `seed_consistent_workflows.py`.

## 7. Launch the app against the demo database

The Compose backend service hardcodes `DATABASE_URL` to `swift_distro_hub`. This repository was not changed to point the running stack at the demo database.

To try the API against demo data without editing Compose, stop is not required for the hub. Start a second API process only if you intend to look at demo data, and pass the demo URL explicitly:

```bash
docker compose run --no-deps --service-ports \
  -e DATABASE_URL=postgresql://swift_user:swift_password@postgres:5432/swift_distro_demo \
  backend
```

`--service-ports` publishes `8000` only if that mapping is enabled in Compose. The current file comments the host port out, so this may not be reachable from the browser until a port is published. Do that in a local override you control. Do not change the shared Compose file as part of a casual demo.

The frontend on port `9080` (nginx on `9081`) talks to the API that is already running, which still uses `swift_distro_hub`. Pointing the UI at demo data means the API process it calls must use the demo URL. Until that is done on purpose, the UI shows hub data: master data and batch stock, and no orders or receipts.

## 8. Automated tests that do not need the demo database

```bash
docker exec -w /app -e DATABASE_URL=sqlite:///:memory: -e SECRET_KEY=test-secret \
  swift_distro_api python -m pytest tests -q --tb=line
```

```bash
npx vitest run
```

These were run during implementation. Results are in `DEMO_SEED_IMPLEMENTATION_REPORT.md`.
