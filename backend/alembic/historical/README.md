# Archived Alembic revisions

Files in this directory are not on the Alembic upgrade path. `script_location`
loads only `alembic/versions`.

`001_platform_baseline.py` was an early root. Its upgrade executes
`db/migrations/001_platform_hardening.sql`, which alters columns that already
exist and then updates `orders.delivery_status`. That is not a baseline for an
empty database, and it is not safe to apply to `swift_distro_hub`.

`d2_reconciled_baseline.py` and `d2_reconciled_baseline.sql` were the 80-table
root (`d2_baseline`) taken from the catalog on 23 November 2026. Phase D.3C
found the live database had 78 tables and five extra rejection columns. Stamping
or upgrading `d2_baseline` on live `swift_distro_hub` is not safe.

The active root is `versions/d4_reconciled_baseline.py` (`d4_baseline`).
Do not move archived revisions back into `versions/` alongside it. Two roots
would create a second Alembic head.
