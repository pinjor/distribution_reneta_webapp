"""Non-destructive PostgreSQL schema readiness checks.

SQLite (pytest) is skipped: tests build schema in fixtures with create_all.
This module never runs Alembic upgrade or CREATE/ALTER.
"""
from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.database import Base

# Source revisions that exist after d4_baseline but are not approved for live upgrade.
# Live swift_distro_hub may remain at d4_baseline until F.2 migration is approved.
PENDING_LIVE_REVISIONS = frozenset({"f2_sample_gift_draft", "f3_export_draft"})
PENDING_MODELED_TABLES = frozenset(
    {
        "sample_gift_deliveries",
        "sample_gift_delivery_items",
        "export_deliveries",
        "export_delivery_items",
        "opening_stock_requests",
        "opening_stock_request_items",
        "opening_stock_approval_history",
        "opening_stock_posting_references",
    }
)


def is_sqlite(engine: Engine) -> bool:
    return engine.dialect.name == "sqlite"


def assert_schema_ready(engine: Engine) -> None:
    if is_sqlite(engine):
        return
    current = None
    head = None
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        current = _current_revision(conn)
        head = _script_head()
        if current is None:
            raise RuntimeError(
                "PostgreSQL is not Alembic-managed (alembic_version is missing). "
                "Stamp or upgrade a reviewed revision before starting the API. "
                "The API will not run migrations."
            )
        if current != head and not _pending_revisions_only(current, head):
            raise RuntimeError(
                f"Unapplied Alembic revision. Database is at {current!r}; "
                f"head is {head!r}. Run `alembic upgrade head` against a "
                "reviewed disposable or approved database. The API will not "
                "run migrations."
            )
    missing = _missing_modeled_tables(engine)
    missing = [name for name in missing if name not in PENDING_MODELED_TABLES]
    if current != head:
        missing = [name for name in missing if name not in PENDING_MODELED_TABLES]
    if missing:
        raise RuntimeError(
            "Required application tables are missing: "
            + ", ".join(missing)
            + ". Apply Alembic migrations. The API will not create tables."
        )


def _pending_revisions_only(current: str, head: str) -> bool:
    """True when every unapplied revision is an explicitly pending live upgrade."""
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    backend_root = Path(__file__).resolve().parents[2]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    script = ScriptDirectory.from_config(config)
    unapplied = []
    for rev in script.iterate_revisions(head, current):
        if rev.revision == current:
            break
        unapplied.append(rev.revision)
    if not unapplied:
        return False
    return all(revision in PENDING_LIVE_REVISIONS for revision in unapplied)


def _script_head() -> str:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    backend_root = Path(__file__).resolve().parents[2]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    script = ScriptDirectory.from_config(config)
    heads = script.get_heads()
    if len(heads) != 1:
        raise RuntimeError(f"Expected one Alembic head, found {heads!r}")
    return heads[0]


def _current_revision(conn) -> str | None:
    from alembic.runtime.migration import MigrationContext

    context = MigrationContext.configure(conn)
    return context.get_current_revision()


def _missing_modeled_tables(engine: Engine) -> list[str]:
    existing = set(inspect(engine).get_table_names())
    required = set(Base.metadata.tables)
    return sorted(required - existing)
