"""ARCHIVED. Not loaded by Alembic. See alembic/historical/README.md.

This was the 80-table root (d2_baseline) from 23 November 2026. The live
catalog later diverged (78 tables plus five rejection columns). Do not
upgrade or stamp swift_distro_hub with this revision. The active root is
d4_baseline.

Revision ID: d2_baseline
Revises:
Create Date: 2026-11-23
"""
from pathlib import Path
from typing import Sequence, Union

from alembic import op

revision: str = "d2_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parent / "d2_reconciled_baseline.sql"
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
