#!/usr/bin/env python3
"""
Yeni yazı keşfi — inceleme kuyruğu üretir (otomatik yayım YAPMAZ).

Kaynakların RSS/yazar sayfalarına erişimi değişkendir. Bu script:
- Bilinen yazar arşiv URL'lerini dener
- Bağlantıları toplar
- external-articles.json ve legacy önerilerle karşılaştırır
- assets/data/discovery-queue.json yazar

Her kaynak için destek durumu dokümante edilir (çıktı + stdout).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "data" / "discovery-queue.json"
EXTERNAL = ROOT / "assets" / "external-articles.json"
SUGGESTIONS = ROOT / "assets" / "data" / "legacy-url-suggestions.json"

# Destek matrisi — gerçek erişim denemesiyle güncellenir
SOURCES = [
    {
        "id": "kisadalga",
        "name": "Kısa Dalga",
        "author_urls": [
            "https://kisadalga.net/yazar/ibrahim-gunduz",
            "https://kisadalga.net/?s=%C4%B0brahim+G%C3%BCnd%C3%BCz",
        ],
        "notes": "Yazar sayfası/HTML tarama; resmi yazar RSS garanti değil.",
    },
    {
        "id": "odatv",
        "name": "Odatv",
        "author_urls": [
            "https://www.odatv.com/yazar/ibrahim-gunduz",
            "https://www.odatv4.com/yazar/ibrahim-gunduz",
        ],
        "notes": "Yazar arşivi HTML; bot koruması olabilir.",
    },
    {
        "id": "12punto",
        "name": "12punto",
        "author_urls": [
            "https://12punto.com/?s=%C4%B0brahim+G%C3%BCnd%C3%BCz",
        ],
        "notes": "Arama sayfası üzerinden keşif; kalıcı yazar RSS doğrulanmalı.",
    },
]

HREF_RE = re.compile(r'href=["\'](https?://[^"\']+|/[^=]"[^"\']*)["\']', re.I)
# simpler
HREF_RE = re.compile(r'href=["\']([^"\']+)["\']', re.I)


def fetch(url: str) -> tuple[str | None, str | None]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "IbrahimGunduzDiscovery/2.1"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.read().decode("utf-8", errors="replace"), None
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)


def extract_links(base: str, html: str) -> list[str]:
    links = []
    for m in HREF_RE.finditer(html):
        href = m.group(1)
        if href.startswith("#") or href.startswith("mailto:"):
            continue
        full = urljoin(base, href)
        host = (urlparse(full).hostname or "").lower()
        if any(h in host for h in ("kisadalga.net", "odatv.com", "odatv4.com", "12punto.com")):
            links.append(full.split("#")[0])
    # dedupe
    seen = set()
    out = []
    for u in links:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def known_urls() -> set[str]:
    known: set[str] = set()
    if EXTERNAL.exists():
        data = json.loads(EXTERNAL.read_text(encoding="utf-8"))
        for a in data.get("articles", []):
            if a.get("url"):
                known.add(a["url"].rstrip("/"))
    if SUGGESTIONS.exists():
        data = json.loads(SUGGESTIONS.read_text(encoding="utf-8"))
        for s in data.get("suggestions", []):
            if s.get("suggestedUrl"):
                known.add(s["suggestedUrl"].rstrip("/"))
            for u in s.get("allUrls") or []:
                known.add(u.rstrip("/"))
    return known


def looks_like_article(url: str) -> bool:
    path = urlparse(url).path.lower()
    if any(x in path for x in ("/yazar/", "/author/", "/tag/", "/kategori", "/search", "/page/")):
        return False
    return any(x in path for x in ("/haber", "/yazi", "/makale", "/guncel", "/detay", "-"))


AUTHOR_HINTS = (
    "ibrahim gündüz",
    "ibrahim gunduz",
    "ibrahim gündüz",
    "ibrahimgunduz",
)


def page_mentions_author(html: str) -> bool:
    low = (html or "").casefold()
    return any(h in low for h in AUTHOR_HINTS)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    known = known_urls()
    queue = []
    source_status = []

    for src in SOURCES:
        found = []
        errors = []
        for url in src["author_urls"]:
            html, err = fetch(url)
            if err:
                errors.append({"url": url, "error": err})
                continue
            assert html is not None
            author_ok = page_mentions_author(html) or "/yazar/" in url.lower() or "ibrahim" in url.lower()
            if not author_ok:
                errors.append({"url": url, "error": "Sayfada İbrahim Gündüz doğrulaması zayıf; adaylar yine de incelensin"})
            for link in extract_links(url, html):
                if looks_like_article(link) and link.rstrip("/") not in known:
                    found.append(link)
        found = list(dict.fromkeys(found))
        status = {
            "id": src["id"],
            "name": src["name"],
            "supported": bool(found) or not errors,
            "autoPublish": False,
            "notes": src["notes"] + " Otomatik yayım kapalı; panel İnceleme kuyruğuna düşer.",
            "errors": errors,
            "candidates": len(found),
        }
        source_status.append(status)
        for link in found[:40]:
            queue.append(
                {
                    "url": link,
                    "source": src["id"],
                    "sourceName": src["name"],
                    "status": "needs_review",
                    "reason": "Keşif adayı — yazar doğrulaması ve elle onay gerekli; otomatik yayım yok",
                }
            )

    payload = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "policy": "Otomatik yayım yok. İbrahim Gündüz hakkında yazılmış haberler yazarın kendi yazısı sanılmamalı.",
        "sources": source_status,
        "queue": queue,
    }

    print(json.dumps({"sources": source_status, "queued": len(queue)}, ensure_ascii=False, indent=2))
    if args.dry_run:
        return 0
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Yazıldı: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
