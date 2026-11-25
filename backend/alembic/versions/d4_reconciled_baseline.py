"""Reconciled schema baseline for the current 78-table PostgreSQL catalog.

Revision ID: d4_baseline
Revises:
Create Date: 2026-11-25

Creates the 78 public tables present in swift_distro_hub as of Phase D.4,
including doctors and chemist_shops (no SQLAlchemy model yet) and the five
rejection columns on orders and collection_deposits.

It does not create delivery_allocation_outcomes or return_verifications.
Those tables are absent from the live catalog and unused by the application.

This is the only active root revision. d2_baseline is archived under
alembic/historical and is not on this chain.

Do not upgrade or stamp swift_distro_hub with this revision until the
disposable-database diff has been reviewed and the stamp is explicitly approved.
"""
from pathlib import Path
from typing import Sequence, Union

from alembic import op

revision: str = "d4_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1] / "sql" / "d4_reconciled_baseline.sql"
    sql = sql_path.read_text(encoding="utf-8")
    connection = op.get_bind()
    raw = connection.connection
    dbapi = getattr(raw, "driver_connection", raw)
    cursor = dbapi.cursor()
    try:
        cursor.execute(sql)
    finally:
        cursor.close()


def downgrade() -> None:
    raise RuntimeError(
        "Downgrade of d4_baseline is not supported. "
        "Restoring a database is a backup restore, not a drop of the public schema."
    )
