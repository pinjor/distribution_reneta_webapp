#!/bin/sh
set -e

if [ ! -f node_modules/@vitejs/plugin-react-swc/package.json ]; then
  echo "Installing frontend dependencies..."
  npm ci
fi

PORT="${VITE_DEV_PORT:-8080}"
exec npm run dev -- --host 0.0.0.0 --port "$PORT"
