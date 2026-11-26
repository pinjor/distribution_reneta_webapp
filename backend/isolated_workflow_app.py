"""F.4B.2/F.4B.3-DEV isolated FastAPI entrypoint.

Never used by docker-compose or production uvicorn main:app.

    uvicorn isolated_workflow_app:app --host 127.0.0.1 --port 18012
"""
from app.database import engine
from app.api_app import create_api_app

ALLOWED = frozenset({"reneta_e2e", "f4b1b_iso"})


def _assert_disposable_database() -> None:
    name = engine.url.database or ""
    if str(engine.url).startswith("sqlite"):
        return
    if name == "swift_distro_hub" or "swift_distro_hub" in str(engine.url):
        raise RuntimeError("isolated_workflow_app refuses swift_distro_hub")
    if name not in ALLOWED and not name.startswith("f4b2") and not name.startswith("f4c") and not name.startswith("f4d") and not name.startswith("reneta_e2e"):
        raise RuntimeError(f"isolated_workflow_app refuses database {name!r}")


_assert_disposable_database()
from app.services.isolated_document_reservation import ensure_isolated_inventory_schema

ensure_isolated_inventory_schema(engine)
app = create_api_app(isolated_workflow=True)
