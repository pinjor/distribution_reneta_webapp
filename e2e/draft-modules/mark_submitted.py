"""Mark one isolated Draft row Submitted for 409 E2E cases.

Uses the E2E DATABASE_URL only. Refuses swift_distro_hub.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
from refuse_live import refuse_live_database_url  # noqa: E402

ALLOWED_TABLES = {
    "sample_gift_deliveries": "sample_gift_deliveries",
    "export_deliveries": "export_deliveries",
}


def main() -> None:
    if len(sys.argv) == 2:
        table = "sample_gift_deliveries"
        document_id = int(sys.argv[1])
    elif len(sys.argv) == 3:
        table = ALLOWED_TABLES.get(sys.argv[1], "")
        document_id = int(sys.argv[2])
    else:
        raise SystemExit("usage: mark_submitted.py [<table>] <document-id>")
    if table not in ALLOWED_TABLES:
        raise SystemExit(f"table {table!r} is not allowed")
    url = os.environ.get("E2E_DATABASE_URL") or os.environ.get("DATABASE_URL") or ""
    refuse_live_database_url(url)
    engine = create_engine(url)
    stmt = text(
        f"UPDATE {table} SET status = 'Submitted' WHERE id = :id AND status = 'Draft'"
    )
    with engine.begin() as conn:
        updated = conn.execute(stmt, {"id": document_id}).rowcount
    if updated != 1:
        raise SystemExit(f"expected 1 Draft row updated, got {updated}")


if __name__ == "__main__":
    main()
