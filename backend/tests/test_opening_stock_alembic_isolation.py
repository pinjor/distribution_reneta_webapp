from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory


def test_opening_stock_alembic_is_not_production_head():
    backend = Path(__file__).resolve().parents[1]
    production = Config(str(backend / "alembic.ini"))
    production.set_main_option("script_location", str(backend / "alembic"))
    heads = ScriptDirectory.from_config(production).get_heads()
    assert heads == ["f3_export_draft"]
    os_config = Config(str(backend / "alembic_opening_stock.ini"))
    os_config.set_main_option("script_location", str(backend / "alembic_opening_stock"))
    os_heads = ScriptDirectory.from_config(os_config).get_heads()
    assert os_heads == ["os_request_workflow"]


def test_env_refuses_live_database_name():
    source = Path(__file__).resolve().parents[1] / "alembic_opening_stock" / "env.py"
    text = source.read_text()
    assert "Always refuses swift_distro_hub" in text or "always refuses swift_distro_hub" in text
    assert "LIVE_DATABASE = \"swift_distro_hub\"" in text
    assert "alembic_version_opening_stock" in text
