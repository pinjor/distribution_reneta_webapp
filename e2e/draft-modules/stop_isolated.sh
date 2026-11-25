#!/usr/bin/env bash
# Stops dump-based f4b1b_* leftovers and synthetic reneta_e2e_* containers.
# Never drops swift_distro_hub. Never removes swift_distro_* containers or volumes.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ -f "${ROOT}/e2e/.vite.pid" ]]; then
  kill "$(cat "${ROOT}/e2e/.vite.pid")" >/dev/null 2>&1 || true
  rm -f "${ROOT}/e2e/.vite.pid"
fi
pkill -f "vite --port 15174" >/dev/null 2>&1 || true
docker rm -f f4b1b_api f4b1b_api_flags_off >/dev/null 2>&1 || true
docker rm -f reneta_e2e_api reneta_e2e_api_flags reneta_e2e_pg >/dev/null 2>&1 || true
docker network rm reneta_e2e_net >/dev/null 2>&1 || true
if docker inspect swift_distro_postgres >/dev/null 2>&1; then
  docker exec -i swift_distro_postgres psql -U swift_user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='f4b1b_iso' AND pid <> pg_backend_pid();" >/dev/null || true
  docker exec -i swift_distro_postgres psql -U swift_user -d postgres -v ON_ERROR_STOP=1 -c "SELECT 1 FROM pg_database WHERE datname = 'f4b1b_iso'" >/dev/null
  docker exec -i swift_distro_postgres psql -U swift_user -d postgres -c "DROP DATABASE IF EXISTS f4b1b_iso;"
fi
rm -f "${ROOT}/e2e/.env.isolated" "${ROOT}/e2e/.isolation.json"
echo "Isolated Draft E2E stack removed. Live database was not dropped."
