"""Reconciled schema baseline for an empty PostgreSQL database.

Revision ID: d2_baseline
Revises:
Create Date: 2026-11-23

Creates the 80 public tables present in swift_distro_hub, including the four
tables that have no SQLAlchemy model. This revision contains no data and no
historical UPDATE statements.

It is the only active root revision. The older 001_platform script is archived
under alembic/historical and is not on this chain.

Do not upgrade or stamp swift_distro_hub with this revision until the
disposable-database diff has been reviewed and the stamp is explicitly approved.
"""
from pathlib import Path
from typing import Sequence, Union

from alembic import op

revision: str = "d2_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[1] / "sql" / "d2_reconciled_baseline.sql"
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
        "Downgrade of d2_baseline is not supported. "
        "Restoring a database is a backup restore, not a drop of the public schema."
    )
