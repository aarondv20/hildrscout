#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting Hildr Scout backend..."
(cd "$SCRIPT_DIR/backend" && .venv/bin/python -m uvicorn app.main:app --port 8000) &
BACKEND_PID=$!

echo "Starting Hildr Scout frontend..."
(cd "$SCRIPT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

sleep 6
xdg-open http://localhost:5173 2>/dev/null || open http://localhost:5173 2>/dev/null || true

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
echo "Hildr Scout is running at http://localhost:5173"
wait