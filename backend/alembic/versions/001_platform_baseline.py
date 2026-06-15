"""Platform baseline: legacy column alters + indexes from 001_platform_hardening.sql

Revision ID: 001_platform
Revises:
Create Date: 2026-06-15

"""
from pathlib import Path
from typing import Sequence, Union

from alembic import op

revision: str = "001_platform"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    sql_path = Path(__file__).resolve().parents[2] / "db" / "migrations" / "001_platform_hardening.sql"
    if not sql_path.exists():
        return
    sql = sql_path.read_text(encoding="utf-8")
    connection = op.get_bind()
    # PostgreSQL: run migration script statements (DDL + backfill)
    for statement in _split_sql_statements(sql):
        connection.exec_driver_sql(statement)


def downgrade() -> None:
    # Baseline hardening is additive; downgrade not supported for production safety.
    pass


def _split_sql_statements(sql: str) -> list[str]:
    statements: list[str] = []
    buffer: list[str] = []
    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        buffer.append(line)
        if stripped.endswith(";"):
            stmt = "\n".join(buffer).strip().rstrip(";")
            if stmt:
                statements.append(stmt)
            buffer = []
    if buffer:
        stmt = "\n".join(buffer).strip().rstrip(";")
        if stmt:
            statements.append(stmt)
    return statements
