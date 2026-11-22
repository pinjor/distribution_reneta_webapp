"""Refuse writes unless the target is an explicitly confirmed demo database.

Never treats localhost, Docker, or an unset DATABASE_URL as permission to
touch swift_distro_hub.
"""

from __future__ import annotations

import os
import sys
from urllib.parse import urlsplit

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

FORBIDDEN_NAMES = frozenset(
    {"swift_distro_hub", "postgres", "template0", "template1", ""}
)


class DemoDatabaseRefused(SystemExit):
    """Raised as SystemExit so CLI callers stop before any write."""


def database_name(url: str) -> str:
    path = urlsplit(url).path.lstrip("/")
    return path.split("?", 1)[0].split("/", 1)[0]


def require_demo_database_url() -> str:
    url = os.environ.get("DEMO_DATABASE_URL", "").strip()
    if not url:
        raise DemoDatabaseRefused(
            "Refusing to write. Set DEMO_DATABASE_URL to a database whose "
            "name contains 'demo' (expected: swift_distro_demo). "
            "swift_distro_hub is never a valid target."
        )
    name = database_name(url)
    confirm = os.environ.get("DEMO_DATABASE_CONFIRM", "").strip()
    if name in FORBIDDEN_NAMES or "demo" not in name.lower():
        raise DemoDatabaseRefused(
            f"Refusing to write. Database name {name!r} is not an explicit demo database."
        )
    if confirm != name:
        raise DemoDatabaseRefused(
            "Refusing to write. DEMO_DATABASE_CONFIRM must exactly equal the "
            f"database name ({name!r})."
        )
    app_url = os.environ.get("DATABASE_URL", "")
    if app_url and database_name(app_url) == "swift_distro_hub" and name == "swift_distro_hub":
        raise DemoDatabaseRefused("Refusing to write to swift_distro_hub.")
    return url


def connect_verified_demo(url: str | None = None) -> Engine:
    """Open the demo database and prove the session is not on the hub database."""
    url = url or require_demo_database_url()
    expected = database_name(url)
    engine = create_engine(url, pool_pre_ping=True)
    with engine.connect() as conn:
        current = conn.execute(text("SELECT current_database()")).scalar()
        if current != expected or current in FORBIDDEN_NAMES or "demo" not in str(current).lower():
            engine.dispose()
            raise DemoDatabaseRefused(
                f"Connected database {current!r} failed the demo safety check."
            )
        companies = conn.execute(text("SELECT to_regclass('public.companies')")).scalar()
        if not companies:
            engine.dispose()
            raise DemoDatabaseRefused(
                "Demo database has no companies table. Load the schema with "
                "pg_dump --schema-only from the app database, or run the "
                "documented migration path. Refusing Base.metadata.create_all()."
            )
    return engine


def bind_process_to_demo_url() -> str:
    """Point DATABASE_URL at the demo database before app.database is imported."""
    if "app.database" in sys.modules:
        raise DemoDatabaseRefused(
            "app.database is already imported, so its engine may point at "
            "swift_distro_hub. Start the seed from a fresh Python process."
        )
    url = require_demo_database_url()
    os.environ["DATABASE_URL"] = url
    return url
