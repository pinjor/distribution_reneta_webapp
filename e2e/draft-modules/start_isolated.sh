#!/usr/bin/env bash
# Local dump-based Draft E2E (optional). Default CI/local path is:
#   npm run test:e2e:isolated
# which uses a disposable postgres:16 database named reneta_e2e.
# This script restores a dump into f4b1b_iso on the live postgres *container*
# without targeting swift_distro_hub. Do not use this path in CI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ISO_DB="f4b1b_iso"
LIVE_DB="swift_distro_hub"
API_PORT="${E2E_API_PORT:-18010}"
FLAGS_OFF_PORT="${E2E_FLAGS_OFF_PORT:-18011}"
VITE_PORT="${E2E_VITE_PORT:-15174}"
PASSWORD="${E2E_ISOLATED_PASSWORD:-E2eIsolatedPass!9}"
COMPOSE_FLAGS_SG="$(docker exec swift_distro_api printenv SAMPLE_GIFT_DRAFT_WRITES)"
COMPOSE_FLAGS_EX="$(docker exec swift_distro_api printenv EXPORT_DRAFT_WRITES)"
if [[ "${COMPOSE_FLAGS_SG}" != "no" || "${COMPOSE_FLAGS_EX}" != "no" ]]; then
  echo "Live Compose Draft flags are not both no. Aborting." >&2
  exit 1
fi

LIVE_URL="$(docker exec swift_distro_api printenv DATABASE_URL || true)"
if [[ "${LIVE_URL}" == *"${ISO_DB}"* ]]; then
  echo "Live API is unexpectedly on ${ISO_DB}. Aborting." >&2
  exit 1
fi

NET="$(docker inspect swift_distro_postgres --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')"
IMAGE="$(docker inspect swift_distro_api --format '{{.Config.Image}}')"
DUMP_HOST="${E2E_DUMP:-/home/aurnab/Work/reneta_db_backups/swift_distro_hub_20261125_123200.dump}"

docker exec swift_distro_postgres test -f /tmp/f4a.dump || docker cp "${DUMP_HOST}" swift_distro_postgres:/tmp/f4a.dump

docker rm -f f4b1b_api f4b1b_api_flags_off >/dev/null 2>&1 || true
if [[ -f "${ROOT}/e2e/.vite.pid" ]]; then
  kill "$(cat "${ROOT}/e2e/.vite.pid")" >/dev/null 2>&1 || true
  rm -f "${ROOT}/e2e/.vite.pid"
fi

docker exec -i swift_distro_postgres psql -U swift_user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${ISO_DB}' AND pid <> pg_backend_pid();" >/dev/null
docker exec -i swift_distro_postgres psql -U swift_user -d postgres -c "DROP DATABASE IF EXISTS ${ISO_DB};"
docker exec -i swift_distro_postgres psql -U swift_user -d postgres -c "CREATE DATABASE ${ISO_DB} OWNER swift_user;"
docker exec swift_distro_postgres pg_restore -U swift_user -d "${ISO_DB}" --no-owner --no-acl /tmp/f4a.dump >/tmp/f4b1b_restore.log 2>&1 || true
REV="$(docker exec -i swift_distro_postgres psql -U swift_user -d "${ISO_DB}" -tAc "SELECT version_num FROM alembic_version;")"
if [[ "${REV}" != "f3_export_draft" ]]; then
  echo "Isolated restore revision is ${REV}, expected f3_export_draft" >&2
  exit 1
fi
NAME="$(docker exec -i swift_distro_postgres psql -U swift_user -d "${ISO_DB}" -tAc "SELECT current_database();")"
if [[ "${NAME}" != "${ISO_DB}" || "${NAME}" == "${LIVE_DB}" ]]; then
  echo "Isolation check failed: ${NAME}" >&2
  exit 1
fi

ISO_URL="postgresql://swift_user:swift_password@postgres:5432/${ISO_DB}"
if [[ "${ISO_URL}" == *"${LIVE_DB}"* ]]; then
  echo "Isolated DATABASE_URL contains live name" >&2
  exit 1
fi

CORS="http://127.0.0.1:${VITE_PORT},http://localhost:${VITE_PORT}"

docker run -d --name f4b1b_api --network "${NET}" \
  -v "${ROOT}/backend:/app" \
  -e "DATABASE_URL=${ISO_URL}" \
  -e REDIS_URL=redis://redis:6379/1 \
  -e SECRET_KEY=e2e-f4b1b-isolated-secret \
  -e ENVIRONMENT=development \
  -e SAMPLE_GIFT_DRAFT_WRITES=yes \
  -e EXPORT_DRAFT_WRITES=yes \
  -e REQUIRE_AUTH=true \
  -e "CORS_ORIGINS=${CORS}" \
  -p "${API_PORT}:8000" \
  "${IMAGE}" \
  uvicorn main:app --host 0.0.0.0 --port 8000 >/dev/null

docker run -d --name f4b1b_api_flags_off --network "${NET}" \
  -v "${ROOT}/backend:/app" \
  -e "DATABASE_URL=${ISO_URL}" \
  -e REDIS_URL=redis://redis:6379/1 \
  -e SECRET_KEY=e2e-f4b1b-isolated-secret \
  -e ENVIRONMENT=development \
  -e SAMPLE_GIFT_DRAFT_WRITES=no \
  -e EXPORT_DRAFT_WRITES=no \
  -e REQUIRE_AUTH=true \
  -e "CORS_ORIGINS=${CORS}" \
  -p "${FLAGS_OFF_PORT}:8000" \
  "${IMAGE}" \
  uvicorn main:app --host 0.0.0.0 --port 8000 >/dev/null

for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null && curl -sf "http://127.0.0.1:${FLAGS_OFF_PORT}/health" >/dev/null; then
    break
  fi
  sleep 1
  if [[ "${i}" -eq 60 ]]; then
    echo "Isolated APIs failed to become healthy" >&2
    docker logs f4b1b_api 2>&1 | tail -40 >&2
    exit 1
  fi
done

RUNNING_DB="$(docker exec f4b1b_api python -c "from app.database import engine; print(engine.url.database)")"
if [[ "${RUNNING_DB}" != "${ISO_DB}" ]]; then
  echo "Isolated API database is ${RUNNING_DB}" >&2
  docker rm -f f4b1b_api f4b1b_api_flags_off >/dev/null
  exit 1
fi

docker cp "${ROOT}/e2e/draft-modules/seed_isolated.py" f4b1b_api:/tmp/seed_isolated.py
SEED_OUT="$(docker exec -e PYTHONPATH=/app -e "DATABASE_URL=${ISO_URL}" -e "E2E_ISOLATED_PASSWORD=${PASSWORD}" f4b1b_api python /tmp/seed_isolated.py)"
echo "${SEED_OUT}" | sed -n 's/^ISOLATION_JSON://p' > "${ROOT}/e2e/.isolation.json"
python3 - <<PY
import json
from pathlib import Path
p = Path("${ROOT}/e2e/.isolation.json")
data = json.loads(p.read_text())
assert data["database"] == "${ISO_DB}"
print("isolation_ok", data["database"])
PY

cat > "${ROOT}/e2e/.env.isolated" <<EOF
E2E_BASE_URL=http://127.0.0.1:${VITE_PORT}
E2E_API_URL=http://127.0.0.1:${API_PORT}/api
E2E_API_FLAGS_OFF_URL=http://127.0.0.1:${FLAGS_OFF_PORT}/api
E2E_ADMIN_EMAIL=e2e.admin.f4b1b@example.com
E2E_MANAGER_EMAIL=e2e.manager.f4b1b@example.com
E2E_PSO_EMAIL=e2e.pso.f4b1b@example.com
E2E_FOREIGN_EMAIL=e2e.foreign.f4b1b@example.com
E2E_ISOLATED_PASSWORD=${PASSWORD}
EOF

if ss -tln | grep -q ":${VITE_PORT} "; then
  echo "Port ${VITE_PORT} is already in use. Set E2E_VITE_PORT to a free port." >&2
  exit 1
fi
cd "${ROOT}"
VITE_API_URL="http://127.0.0.1:${API_PORT}/api" VITE_DEV_PORT="${VITE_PORT}" VITE_DISABLE_HMR=1 \
  npm run dev -- --host 127.0.0.1 --port "${VITE_PORT}" --strictPort >/tmp/f4b1b_vite.log 2>&1 &
echo $! > "${ROOT}/e2e/.vite.pid"
for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${VITE_PORT}/login" | grep -q 'RENATA DMS'; then
    break
  fi
  sleep 1
  if [[ "${i}" -eq 60 ]]; then
    echo "Isolated Vite failed to start on ${VITE_PORT}" >&2
    tail -40 /tmp/f4b1b_vite.log >&2
    exit 1
  fi
done

echo "Isolated Draft E2E ready on ${VITE_PORT} -> API ${API_PORT} database ${ISO_DB}"
echo "Live Compose flags remain SAMPLE_GIFT_DRAFT_WRITES=${COMPOSE_FLAGS_SG} EXPORT_DRAFT_WRITES=${COMPOSE_FLAGS_EX}"
