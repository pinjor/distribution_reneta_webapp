import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine.url import make_url

from alembic import context

# Ensure backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings
from app.database import Base
import app.models  # noqa: F401
import app.models_platform  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Approved application configuration. Percent signs are escaped for ConfigParser.
database_url = get_settings().database_url.replace("%", "%%")
config.set_main_option("sqlalchemy.url", database_url)

target_metadata = Base.metadata

LIVE_DATABASE = "swift_distro_hub"

# Present in PostgreSQL and intentionally absent from SQLAlchemy metadata.
# Autogenerate must not propose dropping them.
LEGACY_UNMAPPED_TABLES = {
    "doctors",
    "chemist_shops",
    "delivery_allocation_outcomes",
    "return_verifications",
}


def include_object(obj, name, type_, reflected, compare_to):
    """Keep unmapped legacy tables out of autogenerate drop proposals."""
    if type_ == "table" and name in LEGACY_UNMAPPED_TABLES:
        if reflected and compare_to is None:
            return False
    if type_ == "table" and name == "alembic_version":
        return False
    return True


def _refuse_live_database(url: str) -> None:
    """Online commands against the live database require an explicit override."""
    database = make_url(url).database
    if database == LIVE_DATABASE and os.getenv("ALLOW_LIVE_ALEMBIC") != "yes":
        raise RuntimeError(
            "Refusing to run Alembic against the live database swift_distro_hub. "
            "Set DATABASE_URL to a disposable PostgreSQL database. "
            "A live stamp or upgrade also requires ALLOW_LIVE_ALEMBIC=yes "
            "and explicit approval. This override was not used."
        )


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    _refuse_live_database(url)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = config.get_main_option("sqlalchemy.url")
    _refuse_live_database(url)
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
