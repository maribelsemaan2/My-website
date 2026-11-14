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
from urllib.parse import urlparse

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


def fetch_web_pages() -> list[dict]:
    pages = []
    for url in resource_links():
        try:
            r = requests.get(url, timeout=30, headers={"User-Agent": "ignis-ai-rag"})
            r.raise_for_status()
        except requests.RequestException as e:
            print(f"skip {url}: {e}")
            continue
        soup = BeautifulSoup(r.text, "html.parser")
        for t in soup(["script", "style", "nav", "header", "footer", "aside"]):
            t.decompose()
        root = soup.find("main") or soup.body or soup
        text = " ".join(p.get_text(" ", strip=True) for p in root.find_all(["p", "li", "h2", "h3"]))
        title = soup.title.get_text(strip=True) if soup.title else url
        if len(text) > 300:
            pages.append({"url": url, "title": title, "text": text})
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
