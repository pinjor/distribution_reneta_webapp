#!/usr/bin/env bash
# Synthetic isolated Draft E2E: disposable PostgreSQL, Alembic, seed, API, Vite, Playwright.
# Never targets swift_distro_hub. Never removes swift_distro_* containers or volumes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
E2E_DIR="$ROOT/e2e"
LOG_DIR="$E2E_DIR/logs"
RUNTIME="${E2E_RUNTIME:-docker}"
KEEP="${E2E_KEEP:-0}"
PG_CONTAINER="reneta_e2e_pg"
API_CONTAINER="reneta_e2e_api"
API_FLAGS_CONTAINER="reneta_e2e_api_flags"
NETWORK="reneta_e2e_net"
API_IMAGE="${E2E_API_IMAGE:-reneta_e2e_api:local}"
DB_NAME="reneta_e2e"
DB_USER="e2e_user"
DB_PASS="e2e_pass"
E2E_PASSWORD="${E2E_ISOLATED_PASSWORD:-E2eIsolatedPass!9}"
SECRET="e2e-f4b1c-isolated-secret-not-production"
PG_HOST_PORT="${E2E_PG_PORT:-15432}"
API_PORT="${E2E_API_PORT:-18010}"
API_FLAGS_PORT="${E2E_API_FLAGS_PORT:-18011}"
VITE_PORT="${E2E_VITE_PORT:-15174}"
VITE_PID=""
HOST_API_PID=""
HOST_FLAGS_PID=""
STARTED_DOCKER=0
STARTED_NETWORK=0

mkdir -p "$LOG_DIR" "$ROOT/test-results" "$ROOT/playwright-report"

refuse_live() {
  python3 "$E2E_DIR/lib/refuse_live.py" "$1" >/dev/null
}

sanitize_log() {
  local src="$1"
  local dest="$2"
  if [[ -f "$src" ]]; then
    sed -E \
      -e "s/${DB_PASS}/<redacted>/g" \
      -e "s/${E2E_PASSWORD}/<redacted>/g" \
      -e "s/${SECRET}/<redacted>/g" \
      -e "s#postgresql://[^[:space:]]+#postgresql://<redacted>#g" \
      "$src" >"$dest" || true
  fi
}

owned_name() {
  case "$1" in
    reneta_e2e_pg|reneta_e2e_api|reneta_e2e_api_flags) return 0 ;;
    *) return 1 ;;
  esac
}

stop_owned_container() {
  local name="$1"
  if ! owned_name "$name"; then
    echo "Refusing to remove container $name" >&2
    return 1
  fi
  docker rm -f "$name" >/dev/null 2>&1 || true
}

cleanup() {
  local status=$?
  set +e
  if [[ -n "$VITE_PID" ]]; then
    kill "$VITE_PID" 2>/dev/null || true
    pkill -P "$VITE_PID" 2>/dev/null || true
    wait "$VITE_PID" 2>/dev/null || true
  fi
  pkill -f "vite --host 127.0.0.1 --port ${VITE_PORT}" >/dev/null 2>&1 || true
  if [[ -n "$HOST_API_PID" ]] && kill -0 "$HOST_API_PID" 2>/dev/null; then
    kill "$HOST_API_PID" 2>/dev/null
    wait "$HOST_API_PID" 2>/dev/null
  fi
  if [[ -n "$HOST_FLAGS_PID" ]] && kill -0 "$HOST_FLAGS_PID" 2>/dev/null; then
    kill "$HOST_FLAGS_PID" 2>/dev/null
    wait "$HOST_FLAGS_PID" 2>/dev/null
  fi
  if [[ "$STARTED_DOCKER" -eq 1 && "$KEEP" != "1" ]]; then
    docker logs "$API_CONTAINER" >"$LOG_DIR/api.raw.log" 2>&1 || true
    docker logs "$API_FLAGS_CONTAINER" >"$LOG_DIR/api-flags.raw.log" 2>&1 || true
    sanitize_log "$LOG_DIR/api.raw.log" "$LOG_DIR/api.log"
    sanitize_log "$LOG_DIR/api-flags.raw.log" "$LOG_DIR/api-flags.log"
    stop_owned_container "$API_CONTAINER"
    stop_owned_container "$API_FLAGS_CONTAINER"
    stop_owned_container "$PG_CONTAINER"
    if [[ "$STARTED_NETWORK" -eq 1 ]]; then
      docker network rm "$NETWORK" >/dev/null 2>&1 || true
    fi
  fi
  rm -f "$LOG_DIR/api.raw.log" "$LOG_DIR/api-flags.raw.log"
  exit "$status"
}
trap cleanup EXIT INT TERM

wait_http() {
  local url="$1"
  local label="$2"
  local i
  for i in $(seq 1 90); do
    if curl -sf "$url" >/dev/null; then
      echo "$label ready"
      return 0
    fi
    sleep 1
  done
  echo "$label did not become ready: $url" >&2
  return 1
}

wait_pg() {
  local i
  for i in $(seq 1 90); do
    if docker exec "$PG_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      echo "postgres ready"
      return 0
    fi
    sleep 1
  done
  echo "postgres did not become ready" >&2
  return 1
}

port_free() {
  local port="$1"
  if ss -tln | grep -qE ":${port} "; then
    echo "Port ${port} is already in use. Set E2E_*_PORT to a free port." >&2
    return 1
  fi
}

resolve_api_image() {
  if docker image inspect "$API_IMAGE" >/dev/null 2>&1; then
    return 0
  fi
  local from_container
  from_container="$(docker inspect swift_distro_api --format '{{.Config.Image}}' 2>/dev/null || true)"
  if [[ -n "$from_container" ]]; then
    API_IMAGE="$from_container"
    echo "Reusing existing API image ${API_IMAGE} (read-only inspect)."
    return 0
  fi
  echo "Building ${API_IMAGE} from backend/Dockerfile"
  docker build -t "$API_IMAGE" "$ROOT/backend"
}

if [[ "$RUNTIME" != "host" ]]; then
  command -v docker >/dev/null
fi
command -v node >/dev/null
command -v npm >/dev/null
command -v python3 >/dev/null
command -v curl >/dev/null
command -v npx >/dev/null

if [[ ! -d "$ROOT/node_modules/@playwright/test" ]]; then
  echo "Installing npm dependencies (including Playwright)" >&2
  (cd "$ROOT" && npm ci)
fi

port_free "$API_PORT"
port_free "$API_FLAGS_PORT"
port_free "$VITE_PORT"

HOST_PG_URL="${E2E_DATABASE_URL:-}"
if [[ "$RUNTIME" == "host" ]]; then
  if [[ -z "$HOST_PG_URL" ]]; then
    echo "E2E_RUNTIME=host requires E2E_DATABASE_URL" >&2
    exit 1
  fi
  refuse_live "$HOST_PG_URL"
  DATABASE_URL="$HOST_PG_URL"
else
  port_free "$PG_HOST_PORT"
  if docker network inspect "$NETWORK" >/dev/null 2>&1; then
    STARTED_NETWORK=0
  else
    docker network create "$NETWORK" >/dev/null
    STARTED_NETWORK=1
  fi
  stop_owned_container "$API_CONTAINER"
  stop_owned_container "$API_FLAGS_CONTAINER"
  stop_owned_container "$PG_CONTAINER"
  docker run -d --name "$PG_CONTAINER" --network "$NETWORK" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "${PG_HOST_PORT}:5432" \
    postgres:16-alpine >/dev/null
  STARTED_DOCKER=1
  wait_pg
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:${PG_HOST_PORT}/${DB_NAME}"
  refuse_live "$DATABASE_URL"
  resolve_api_image
fi

export DATABASE_URL
export E2E_DATABASE_URL="$DATABASE_URL"
refuse_live "$DATABASE_URL"

DOCKER_DB_URL="postgresql://${DB_USER}:${DB_PASS}@${PG_CONTAINER}:5432/${DB_NAME}"
CORS="http://127.0.0.1:${VITE_PORT},http://localhost:${VITE_PORT}"

run_alembic_and_seed_host() {
  refuse_live "$1"
  (
    cd "$ROOT/backend"
    DATABASE_URL="$1" \
      SECRET_KEY="$SECRET" \
      ENVIRONMENT=development \
      SAMPLE_GIFT_DRAFT_WRITES=yes \
      EXPORT_DRAFT_WRITES=yes \
      python3 -m alembic upgrade head
    SEED_OUT="$(
      DATABASE_URL="$1" \
        E2E_ISOLATED_PASSWORD="$E2E_PASSWORD" \
        PYTHONPATH="$ROOT/backend" \
        python3 "$E2E_DIR/draft-modules/seed_isolated.py"
    )"
    echo "$SEED_OUT" | sed -n 's/^ISOLATION_JSON://p' >"$E2E_DIR/.isolation.json"
  )
}

if [[ "$RUNTIME" == "host" ]]; then
  if ! python3 -c "import fastapi, alembic, psycopg2" 2>/dev/null; then
    python3 -m pip install -q -r "$ROOT/backend/requirements.txt"
  fi
  run_alembic_and_seed_host "$DATABASE_URL"
  (
    cd "$ROOT/backend"
    DATABASE_URL="$DATABASE_URL" SECRET_KEY="$SECRET" ENVIRONMENT=development DEBUG=true \
      CORS_ORIGINS="$CORS" REQUIRE_AUTH=true \
      SAMPLE_GIFT_DRAFT_WRITES=yes EXPORT_DRAFT_WRITES=yes \
      python3 -m uvicorn main:app --host 127.0.0.1 --port "$API_PORT"
  ) >"$LOG_DIR/api.host.log" 2>&1 &
  HOST_API_PID=$!
  (
    cd "$ROOT/backend"
    DATABASE_URL="$DATABASE_URL" SECRET_KEY="$SECRET" ENVIRONMENT=development DEBUG=true \
      CORS_ORIGINS="$CORS" REQUIRE_AUTH=true \
      SAMPLE_GIFT_DRAFT_WRITES=no EXPORT_DRAFT_WRITES=no \
      python3 -m uvicorn main:app --host 127.0.0.1 --port "$API_FLAGS_PORT"
  ) >"$LOG_DIR/api-flags.host.log" 2>&1 &
  HOST_FLAGS_PID=$!
else
  docker run --rm --network "$NETWORK" \
    -v "$ROOT/backend:/app" \
    -e "DATABASE_URL=${DOCKER_DB_URL}" \
    -e "SECRET_KEY=${SECRET}" \
    -e "ENVIRONMENT=development" \
    -e "SAMPLE_GIFT_DRAFT_WRITES=yes" \
    -e "EXPORT_DRAFT_WRITES=yes" \
    "$API_IMAGE" \
    alembic upgrade head
  SEED_OUT="$(
    docker run --rm --network "$NETWORK" \
      -v "$ROOT/backend:/app" \
      -v "$E2E_DIR/draft-modules:/seed:ro" \
      -e "PYTHONPATH=/app" \
      -e "DATABASE_URL=${DOCKER_DB_URL}" \
      -e "E2E_ISOLATED_PASSWORD=${E2E_PASSWORD}" \
      "$API_IMAGE" \
      python /seed/seed_isolated.py
  )"
  echo "$SEED_OUT" | sed -n 's/^ISOLATION_JSON://p' >"$E2E_DIR/.isolation.json"

  docker run -d --name "$API_CONTAINER" --network "$NETWORK" \
    -v "$ROOT/backend:/app" \
    -e "DATABASE_URL=${DOCKER_DB_URL}" \
    -e "SECRET_KEY=${SECRET}" \
    -e "ENVIRONMENT=development" \
    -e "DEBUG=true" \
    -e "CORS_ORIGINS=${CORS}" \
    -e "REQUIRE_AUTH=true" \
    -e "SAMPLE_GIFT_DRAFT_WRITES=yes" \
    -e "EXPORT_DRAFT_WRITES=yes" \
    -p "${API_PORT}:8000" \
    "$API_IMAGE" \
    uvicorn main:app --host 0.0.0.0 --port 8000 >/dev/null
  docker run -d --name "$API_FLAGS_CONTAINER" --network "$NETWORK" \
    -v "$ROOT/backend:/app" \
    -e "DATABASE_URL=${DOCKER_DB_URL}" \
    -e "SECRET_KEY=${SECRET}" \
    -e "ENVIRONMENT=development" \
    -e "DEBUG=true" \
    -e "CORS_ORIGINS=${CORS}" \
    -e "REQUIRE_AUTH=true" \
    -e "SAMPLE_GIFT_DRAFT_WRITES=no" \
    -e "EXPORT_DRAFT_WRITES=no" \
    -p "${API_FLAGS_PORT}:8000" \
    "$API_IMAGE" \
    uvicorn main:app --host 0.0.0.0 --port 8000 >/dev/null
fi

python3 - <<PY
import json
from pathlib import Path
p = Path(r"$E2E_DIR/.isolation.json")
data = json.loads(p.read_text())
assert data["database"] in {"reneta_e2e", "f4b1b_iso"}, data
assert data["database"] != "swift_distro_hub"
print("isolation_ok", data["database"])
PY

wait_http "http://127.0.0.1:${API_PORT}/health" "api"
wait_http "http://127.0.0.1:${API_FLAGS_PORT}/health" "api-flags"

RUNNING_DB="$(
  if [[ "$RUNTIME" == "host" ]]; then
    DATABASE_URL="$DATABASE_URL" SECRET_KEY="$SECRET" PYTHONPATH="$ROOT/backend" python3 -c "from app.database import engine; print(engine.url.database)"
  else
    docker exec "$API_CONTAINER" python -c "from app.database import engine; print(engine.url.database)"
  fi
)"
if [[ "$RUNNING_DB" == "swift_distro_hub" || "$RUNNING_DB" != "reneta_e2e" ]]; then
  echo "Isolated API database is ${RUNNING_DB}" >&2
  exit 1
fi

(
  cd "$ROOT"
  VITE_API_URL="http://127.0.0.1:${API_PORT}/api" \
    npm run dev -- --host 127.0.0.1 --port "$VITE_PORT" --strictPort
) >"$LOG_DIR/vite.log" 2>&1 &
VITE_PID=$!
wait_http "http://127.0.0.1:${VITE_PORT}/login" "vite"

cat >"$E2E_DIR/.env.isolated" <<EOF
E2E_API_URL=http://127.0.0.1:${API_PORT}/api
E2E_API_FLAGS_OFF_URL=http://127.0.0.1:${API_FLAGS_PORT}/api
E2E_BASE_URL=http://127.0.0.1:${VITE_PORT}
E2E_DATABASE_URL=${DATABASE_URL}
E2E_PG_CONTAINER=${PG_CONTAINER}
E2E_RUNTIME=${RUNTIME}
E2E_ISOLATED_PASSWORD=${E2E_PASSWORD}
E2E_ADMIN_EMAIL=e2e.admin.f4b1b@example.com
E2E_MANAGER_EMAIL=e2e.manager.f4b1b@example.com
E2E_PSO_EMAIL=e2e.pso.f4b1b@example.com
E2E_FOREIGN_EMAIL=e2e.foreign.f4b1b@example.com
PLAYWRIGHT_BASE_URL=http://127.0.0.1:${VITE_PORT}
EOF

(
  cd "$ROOT"
  npx playwright test --project=chromium
)
PLAY_STATUS=$?
sanitize_log "$LOG_DIR/vite.log" "$LOG_DIR/vite.sanitized.log"
if [[ "$RUNTIME" == "host" ]]; then
  sanitize_log "$LOG_DIR/api.host.log" "$LOG_DIR/api.log"
  sanitize_log "$LOG_DIR/api-flags.host.log" "$LOG_DIR/api-flags.log"
fi
exit "$PLAY_STATUS"
