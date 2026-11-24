# Archived Alembic revisions

Files in this directory are not on the Alembic upgrade path. `script_location`
loads only `alembic/versions`.

`001_platform_baseline.py` was the previous root. Its upgrade executes
`db/migrations/001_platform_hardening.sql`, which alters columns that already
exist and then updates `orders.delivery_status`. That is not a baseline for an
empty database, and it is not safe to apply to `swift_distro_hub`.

The active root is `versions/d2_reconciled_baseline.py` (`d2_baseline`).
Do not move `001_platform` back into `versions/` alongside it. Two roots would
create a second Alembic head.
