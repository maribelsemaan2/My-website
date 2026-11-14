#!/usr/bin/env bash
# Runs the backend (port 8000) and frontend (port 5173) together. Ctrl+C stops both.
#   ./dev.sh            install deps, fetch NASA data if missing, start everything
#   ./dev.sh --refresh  also re-fetch all NASA data (PSI + Resources-tab links, PDFs)
set -e
cd "$(dirname "$0")"

# use the project's venv if there is one
[ -f .venv/bin/activate ] && source .venv/bin/activate

# dependencies
pip install -q -r backend/ai/rag/requirements.txt -r backend/api/requirements.txt
[ -d frontend/node_modules ] || (cd frontend && npm install)

# RAG data (cached in backend/ai/rag/data, which is gitignored)
if [ "$1" = "--refresh" ] || [ ! -f backend/ai/rag/data/psi_raw.json ] || [ ! -f backend/ai/rag/data/web_raw.json ]; then
  echo "Fetching NASA data for the RAG (this can take a minute)..."
  python3 -m backend.ai.rag.ingest
fi

[ -f backend/ai/rag/.env ] || echo "WARNING: backend/ai/rag/.env missing - chat will return raw passages only (copy .env.example and add ANTHROPIC_API_KEY)"

cleanup() { trap - INT TERM EXIT; kill 0 2>/dev/null; }
trap cleanup INT TERM EXIT

python3 -m uvicorn backend.api.main:app --reload --port 8000 &
(cd frontend && npm run dev) &

echo "Backend:  http://localhost:8000/docs"
echo "Frontend: http://localhost:5173"
wait
