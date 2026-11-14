"""Question answering: retrieve PSI chunks, then ask Claude to answer from them only."""
import os
from pathlib import Path

from dotenv import load_dotenv

from .retriever import Retriever

# Looks for backend/ai/rag/.env, then a .env at the repo root / cwd.
load_dotenv(Path(__file__).parent / ".env")
load_dotenv()

MODEL = os.getenv("RAG_MODEL", "claude-sonnet-5-5")
SYSTEM = (
    "You are Ignis AI's assistant for NASA microgravity combustion data. Answer ONLY from the "
    "provided sources and cite them as [PSI-xx]. If the sources don't cover it, say so. "
    "Format every answer as concise GitHub-flavored Markdown: short paragraphs, bullet lists, "
    "**bold** for key terms, and a table when comparing experiments."
)
_retriever: Retriever | None = None


def reload() -> None:
    """Re-pull everything from NASA and rebuild the index."""
    global _retriever
    from .ingest import main as ingest
    ingest()
    _retriever = Retriever.load()


def answer(question: str, k: int = 5) -> dict:
    global _retriever
    _retriever = _retriever or Retriever.load()
    hits = _retriever.search(question, k)
    sources = list({h["accession"]: {"accession": h["accession"], "title": h["title"], "url": h["url"]} for h in hits}.values())
    if not os.getenv("ANTHROPIC_API_KEY"):  # retrieval-only fallback
        return {"answer": "\n\n".join(h["text"] for h in hits) or "No relevant sources.", "sources": sources}
    import anthropic
    context = "\n\n".join(f"[{h['accession']}] {h['text']}" for h in hits)
    msg = anthropic.Anthropic().messages.create(
        model=MODEL, max_tokens=4000, system=SYSTEM,
        messages=[{"role": "user", "content": f"Sources:\n{context}\n\nQuestion: {question}"}],
    )
    text = "".join(b.text for b in msg.content if b.type == "text")  # skip thinking blocks
    return {"answer": text, "sources": sources}


if __name__ == "__main__":
    import sys
    r = answer(" ".join(sys.argv[1:]) or "How do flames behave in microgravity?")
    print(r["answer"], "\n\nSources:", *[f"\n- {s['accession']} {s['title']}" for s in r["sources"]])
