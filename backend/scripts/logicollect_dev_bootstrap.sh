#!/usr/bin/env bash
# Disposable LogiCollect PostgreSQL + isolated API. Never touches swift_distro_hub.
set -euo pipefail

CONTAINER="${LOGICOLLECT_PG_CONTAINER:-logicollect_dev_pg}"
DB_NAME="${LOGICOLLECT_PG_DB:-logicollect_dev}"
DB_USER="${LOGICOLLECT_PG_USER:-lc_dev}"
DB_PASS="${LOGICOLLECT_PG_PASS:-lc_dev_pass}"
HOST_PORT="${LOGICOLLECT_PG_PORT:-15540}"
API_CONTAINER="${LOGICOLLECT_API_CONTAINER:-swift_distro_api}"
NETWORK="${LOGICOLLECT_DOCKER_NETWORK:-swift_network}"

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  docker start "$CONTAINER" >/dev/null
else
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_DB="$DB_NAME" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -p "127.0.0.1:${HOST_PORT}:5432" \
    postgres:16-alpine >/dev/null
fi

if docker network inspect "$NETWORK" >/dev/null 2>&1; then
  docker network connect "$NETWORK" "$CONTAINER" 2>/dev/null || true
fi

for _ in $(seq 1 40); do
  if docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

URL="postgresql://${DB_USER}:${DB_PASS}@${CONTAINER}:5432/${DB_NAME}"
echo "Disposable DATABASE_URL (from ${API_CONTAINER}): $URL"

docker exec -e DATABASE_URL="$URL" -e PYTHONPATH=/app -w /app "$API_CONTAINER" \
  alembic upgrade f3_export_draft
docker exec -e DATABASE_URL="$URL" -e PYTHONPATH=/app -w /app "$API_CONTAINER" \
  alembic -c alembic_logicollect.ini upgrade head
docker exec -e DATABASE_URL="$URL" -e PYTHONPATH=/app -w /app "$API_CONTAINER" \
  python db/seed_logicollect_dev.py
docker exec -e DATABASE_URL="$URL" -e PYTHONPATH=/app -w /app "$API_CONTAINER" \
  python db/seed_logicollect_dev.py

echo "Schema + seed ready. Start the isolated API with:"
echo "  docker run --rm --name logicollect_dev_api --network $NETWORK -p 127.0.0.1:18040:18040 \\"
echo "    -e DATABASE_URL=$URL -e SECRET_KEY=dev-logicollect-not-production -e REQUIRE_AUTH=true \\"
echo "    --volumes-from $API_CONTAINER -w /app \\"
echo "    \$(docker inspect -f '{{.Config.Image}}' $API_CONTAINER) \\"
echo "    uvicorn logicollect_app:app --host 0.0.0.0 --port 18040"
echo "Bind is 127.0.0.1:18040 only. Other machines need SSH tunnel or a LAN bind you choose."
