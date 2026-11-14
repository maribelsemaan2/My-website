"""Turn raw PSI records into retrievable text chunks (one chunk per text field)."""
import re

TEXT_FIELDS = ["Objectives", "Approach", "Hypothesis", "Research Impacts/Earth Benefits", "Experiment Hardware"]
META_FIELDS = ["Keywords", "Flight Platform", "SubResearch Area", "Project Type"]
MAX_CHARS = 1200


def _split(text: str, limit: int = MAX_CHARS) -> list[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    out, cur = [], ""
    for s in sentences:
        if cur and len(cur) + len(s) > limit:
            out.append(cur)
            cur = ""
        cur = f"{cur} {s}".strip()
    if cur:
        out.append(cur)
    return out


def build_chunks(records: list[dict]) -> list[dict]:
    chunks = []
    for rec in records:
        acc, title = rec.get("Accession", "?"), rec.get("Title", "")
        meta = "; ".join(f"{f}: {' '.join(str(rec[f]).split())}" for f in META_FIELDS if rec.get(f))
        for field in TEXT_FIELDS:
            val = rec.get(field)
            body = " ".join(val.split()) if isinstance(val, str) else ""
            if not body:
                continue
            for i, part in enumerate(_split(body)):
                chunks.append({
                    "id": f"{acc}:{field}:{i}",
                    "accession": acc,
                    "title": title,
                    "field": field,
                    "url": f"https://psi.nasa.gov/physci/repo/investigation/{acc}",
                    "text": f"{title} ({acc}) — {field}\n{meta}\n{part}",
                })
    return chunks


def build_web_chunks(pages: list[dict]) -> list[dict]:
    chunks = []
    for n, pg in enumerate(pages):
        for i, part in enumerate(_split(pg["text"])):
            chunks.append({"id": f"web{n}:{i}", "accession": pg["title"][:40], "title": pg["title"],
                           "field": "Web resource", "url": pg["url"], "text": f"{pg['title']}\n{part}"})
    return chunks
