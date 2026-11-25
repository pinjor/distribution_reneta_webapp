"""Refuse live or production-shaped database URLs for E2E tooling."""

from __future__ import annotations

import os
import sys
from urllib.parse import urlparse

LIVE_DATABASE = "swift_distro_hub"
ALLOWED_E2E_DATABASES = frozenset({"reneta_e2e", "f4b1b_iso"})


def database_name(url: str) -> str:
    parsed = urlparse(url)
    path = (parsed.path or "").lstrip("/")
    return path.split("?")[0]


def refuse_live_database_url(url: str, *, allowed: frozenset[str] | None = None) -> str:
    if not url or not url.strip():
        raise SystemExit("DATABASE_URL is empty.")
    lowered = url.lower()
    if "supabase" in lowered:
        raise SystemExit("Refusing Supabase URLs.")
    database = database_name(url)
    if database == LIVE_DATABASE:
        raise SystemExit("Refusing live database swift_distro_hub.")
    if "swift_distro_hub" in lowered:
        raise SystemExit("Refusing URL that names swift_distro_hub.")
    names = allowed if allowed is not None else ALLOWED_E2E_DATABASES
    if database not in names:
        raise SystemExit(f"Database {database!r} is not an allowed E2E database.")
    return database


def main() -> None:
    url = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("DATABASE_URL", "")
    print(refuse_live_database_url(url))


if __name__ == "__main__":
    main()
