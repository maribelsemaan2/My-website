#!/usr/bin/env bash
# Runs the backend (port 8000) and frontend (port 5173) together. Ctrl+C stops both.
set -e
cd "$(dirname "$0")"

# use the project's venv if there is one
[ -f .venv/bin/activate ] && source .venv/bin/activate

[ -d frontend/node_modules ] || (cd frontend && npm install)

cleanup() { trap - INT TERM EXIT; kill 0 2>/dev/null; }
trap cleanup INT TERM EXIT

python3 -m uvicorn backend.api.main:app --reload --port 8000 &
(cd frontend && npm run dev) &

echo "Backend:  http://localhost:8000/docs"
echo "Frontend: http://localhost:5173"
wait
