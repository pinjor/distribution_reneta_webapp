"""Alembic env for LogiCollect lc_* tables. Always refuses swift_distro_hub."""
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, inspect, pool
from sqlalchemy.engine.url import make_url

from alembic import context

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

database_url = os.environ.get("DATABASE_URL") or get_settings().database_url
config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))

target_metadata = None
LIVE_DATABASE = "swift_distro_hub"


def _refuse_live_database(url: str) -> None:
    database = make_url(url).database
    if database == LIVE_DATABASE or "swift_distro_hub" in (url or ""):
        raise RuntimeError(
            "logicollect Alembic always refuses swift_distro_hub. "
            "Use a disposable database named logicollect_dev (or lc_* / f4*)."
        )


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    _refuse_live_database(url)
    context.configure(
        url=url,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table="alembic_version_logicollect",
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
    with connectable.connect() as check:
        names = set(inspect(check).get_table_names())
        if "employees" not in names or "orders" not in names:
            raise RuntimeError(
                "Commercial schema missing. On this disposable database run "
                "`alembic upgrade f3_export_draft` first, then "
                "`alembic -c alembic_logicollect.ini upgrade head`."
            )
    with connectable.connect() as connection:
        context.configure(connection=connection, version_table="alembic_version_logicollect")
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
