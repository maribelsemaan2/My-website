"""TF-IDF retriever (no model downloads). Swap `Retriever` for an embedding store later
(e.g. sentence-transformers + Chroma) without touching the rest of the pipeline."""
import json

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

from .chunking import build_chunks, build_web_chunks
from .ingest import RAW_PATH, WEB_PATH, fetch_investigations, fetch_web_pages


class Retriever:
    def __init__(self, chunks: list[dict]):
        self.chunks = chunks
        self.vec = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
        self.matrix = self.vec.fit_transform(c["text"] for c in chunks)

    @classmethod
    def load(cls) -> "Retriever":
        records = json.loads(RAW_PATH.read_text()) if RAW_PATH.exists() else fetch_investigations()
        pages = json.loads(WEB_PATH.read_text()) if WEB_PATH.exists() else fetch_web_pages()
        return cls(build_chunks(records) + build_web_chunks(pages))

    def search(self, query: str, k: int = 5) -> list[dict]:
        scores = linear_kernel(self.vec.transform([query]), self.matrix).ravel()
        top = scores.argsort()[::-1][:k]
        return [{**self.chunks[i], "score": float(scores[i])} for i in top if scores[i] > 0]
