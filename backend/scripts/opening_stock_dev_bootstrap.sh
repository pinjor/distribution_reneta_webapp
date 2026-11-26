#!/usr/bin/env bash
# Disposable Opening Stock PostgreSQL schema. Never touches swift_distro_hub.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ "${DATABASE_URL:-}" == *swift_distro_hub* ]]; then
  echo "Refusing DATABASE_URL that names swift_distro_hub" >&2
  exit 1
fi

docker compose -f docker-compose.opening-stock.yml up -d postgres
for _ in $(seq 1 40); do
  if docker exec opening_stock_dev_pg pg_isready -U os_dev -d opening_stock_dev >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Applying commercial baseline f3_export_draft, then opening-stock head, on opening_stock_dev"
docker compose -f docker-compose.opening-stock.yml run --rm --no-deps migrate
docker compose -f docker-compose.opening-stock.yml up -d backend frontend
echo "Opening Stock disposable stack:"
echo "  API  http://127.0.0.1:18050"
echo "  UI   http://127.0.0.1:9180"
echo "  DB   opening_stock_dev (container opening_stock_dev_pg)"
echo "Production 9080 / swift_distro_hub was not changed."
