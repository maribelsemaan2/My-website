"""Pull combustion-science investigations from NASA PSI (Physical Sciences Informatics).

PSI's web UI is backed by an open JSON endpoint (no auth), so we query it instead of
scraping or downloading files:
    https://psi.nasa.gov/geode-py/ws/repo/search?ffield=Research Area&fvalue=combustion science
Run:  python -m backend.ai.rag.ingest
"""
import json
import re
from html import unescape
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

RESOURCES_URL = "https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=resources"
# Only follow NASA-owned pages linked from the challenge's Resources tab.
ALLOWED_HOSTS = ("nasa.gov",)
SKIP_URLS = ("psi.nasa.gov", "https://science.nasa.gov/", "HP_Privacy")  # PSI handled via API; homepages are noise
WEB_PATH = Path(__file__).parent / "data" / "web_raw.json"

BASE = "https://psi.nasa.gov/geode-py/ws/repo/search"
RAW_PATH = Path(__file__).parent / "data" / "psi_raw.json"


def fetch_investigations(research_area: str = "combustion science", size: int = 200) -> list[dict]:
    params = {"ffield": "Research Area", "fvalue": research_area, "size": size}
    r = requests.get(BASE, params=params, timeout=30)
    r.raise_for_status()
    hits = r.json()["hits"]["hits"]
    return [h["_source"] for h in hits]


def resource_links() -> list[str]:
    """Scrape the challenge page itself for the resource links it lists."""
    html = unescape(requests.get(RESOURCES_URL, timeout=30).text.encode().decode("unicode_escape", "ignore"))
    urls = dict.fromkeys(re.findall(r'href="(https?://[^"\\]+)"', html))
    return [u for u in urls
            if urlparse(u).hostname.endswith(ALLOWED_HOSTS) and not any(x in u for x in SKIP_URLS)]


MAX_PAGES = 60
MAX_PDF_BYTES = 25_000_000


def _wanted_sublink(url: str) -> bool:
    """Which links found *inside* a resource page are worth following (depth 1)."""
    u = urlparse(url)
    if not (u.hostname or "").endswith(ALLOWED_HOSTS):
        return False
    path = u.path.lower()
    if path.endswith(".pdf"):
        return True  # experiment fact sheets, the combustion mini-book, ...
    if path.endswith((".epub", ".jpg", ".png", ".gif", ".svg", ".xml")) or "/feed" in path:
        return False
    return "combustion" in path  # sub-pages of the combustion-science / FCF sections


def _page_text(url: str, r: requests.Response) -> tuple[str, str, str]:
    """Returns (title, text, html). PDFs are parsed with pypdf; HTML with BeautifulSoup."""
    if url.split("?")[0].lower().endswith(".pdf"):
        from io import BytesIO
        from pypdf import PdfReader
        pdf = PdfReader(BytesIO(r.content))
        text = " ".join((pg.extract_text() or "") for pg in pdf.pages)
        title = (pdf.metadata.title if pdf.metadata and pdf.metadata.title else url.split("/")[-1].split("?")[0])
        return title, " ".join(text.split()), ""
    soup = BeautifulSoup(r.text, "html.parser")
    for t in soup(["script", "style", "nav", "header", "footer", "aside"]):
        t.decompose()
    root = soup.find("main") or soup.body or soup
    text = " ".join(p.get_text(" ", strip=True) for p in root.find_all(["p", "li", "h2", "h3"]))
    title = soup.title.get_text(strip=True) if soup.title else url
    return title, text, str(root)


def fetch_web_pages(depth: int = 1) -> list[dict]:
    """Fetch the Resources-tab links, then follow their sublinks `depth` levels (PDFs included)."""
    pages, seen = [], set()
    frontier = resource_links()
    for level in range(depth + 1):
        next_frontier = []
        for url in frontier:
            key = url.split("?")[0].rstrip("/")
            if key in seen or len(pages) >= MAX_PAGES:
                continue
            seen.add(key)
            try:
                r = requests.get(url, timeout=60, headers={"User-Agent": "ignis-ai-rag"})
                r.raise_for_status()
                if len(r.content) > MAX_PDF_BYTES:
                    continue
                title, text, html = _page_text(url, r)
            except Exception as e:
                print(f"skip {url}: {e}")
                continue
            if len(text) > 300:
                pages.append({"url": url, "title": title, "text": text, "depth": level})
            # only dig into on-topic pages; Apollo/Mir/spinoff pages link to huge, off-topic transcripts
            if level < depth and html and "combustion" in url.lower():
                for a in BeautifulSoup(html, "html.parser").find_all("a", href=True):
                    link = urljoin(url, a["href"]).split("#")[0]
                    if _wanted_sublink(link):
                        next_frontier.append(link)
        frontier = next_frontier
    return pages


def main() -> None:
    RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    docs = fetch_investigations()
    RAW_PATH.write_text(json.dumps(docs, indent=1))
    print(f"Saved {len(docs)} PSI investigations -> {RAW_PATH}")
    pages = fetch_web_pages()
    WEB_PATH.write_text(json.dumps(pages, indent=1))
    print(f"Saved {len(pages)} resource pages -> {WEB_PATH}")


if __name__ == "__main__":
    main()
