#!/bin/sh
set -e

# Re-install when package.json adds deps but the named node_modules volume is stale
if [ ! -f node_modules/@vitejs/plugin-react-swc/package.json ] || [ ! -f node_modules/framer-motion/package.json ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

PORT="${VITE_DEV_PORT:-8080}"
exec npm run dev -- --host 0.0.0.0 --port "$PORT"
