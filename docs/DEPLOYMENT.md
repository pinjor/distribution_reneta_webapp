# Backend Deployment & Master Data Seeding

Follow these steps whenever you promote the updated backend to a new environment.

## 1. Build and Deploy Containers

```bash
# From the repository root
docker-compose build backend frontend nginx
docker-compose up -d backend frontend nginx
```

The new `orders` tables are created automatically on startup by SQLAlchemy. Ensure the
PostgreSQL user specified in `DATABASE_URL` has privileges to create tables and insert data.

## 2. Seed Core Master Data

The order module relies on baseline customers, PSOs, depots, and products. Seed them with:

```bash
cd backend
python -m db.seed_master_data
```

The script is idempotent—re-running updates existing entries that share the same codes and now also creates
the default company required for receive-product workflows.
Feel free to extend the payloads in `backend/db/seed_master_data.py` with your production
values or replace them with an import from your ERP.

## 3. Verify API Health

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/orders
```

Confirm you receive `200 OK` responses and that `/api/orders` lists any seeded or newly
created drafts.

## 4. Frontend Smoke Test

1. Log in to the web app.
2. Open **Order Management → Order** and confirm the dropdowns are populated with the
   seeded depots/customers/PSOs/products.
3. Create a draft order, then navigate to **Order Management → Order List** and verify the
   record appears.
4. Submit and approve an order to ensure the workflow operates end-to-end.
