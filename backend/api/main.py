"""API layer. Run from repo root:  uvicorn backend.api.main:app --reload --port 8000"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.ai.rag.rag import answer, reload
from backend.api.ml_routes import router as ml_router

app = FastAPI(title="Ignis AI API")
app.include_router(ml_router)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])


class ChatRequest(BaseModel):
    question: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/chat")
def chat(req: ChatRequest):
    try:
        return answer(req.question)
    except Exception as e:  # surface the real cause (bad key, model name, network...) to the client
        raise HTTPException(status_code=502, detail=f"{type(e).__name__}: {e}")


@app.post("/api/ingest")
def ingest():
    """Re-fetch PSI + the challenge's Resources-tab links and rebuild the index."""
    reload()
    return {"status": "reloaded"}
