#!/usr/bin/env python3
"""
Haricî makale URL'lerinden Open Graph / JSON-LD metadata çıkarımı.
Tam makale metni veya görseller saklanmaz — yalnızca meta alanlar.
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

ALLOWED_HOSTS = {
    "12punto.com",
    "www.12punto.com",
    "odatv.com",
    "www.odatv.com",
    "odatv4.com",
    "www.odatv4.com",
    "kisadalga.net",
    "www.kisadalga.net",
}

USER_AGENT = "IbrahimGunduzArticleBot/2.1 (+https://ibrahimgunduz.com.tr)"


def normalize_url(url: str) -> str:
    url = url.strip()
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Yalnızca http/https URL kabul edilir.")
    host = (parsed.hostname or "").lower()
    if host.startswith("www."):
        bare = host[4:]
    else:
        bare = host
    # Allow listed + www variants
    if host not in ALLOWED_HOSTS and bare not in {h.removeprefix("www.") for h in ALLOWED_HOSTS}:
        # Still allow fetch for migration suggestions, but mark untrusted
        pass
    # Strip fragment, normalize path
    cleaned = urllib.parse.urlunparse(
        (parsed.scheme.lower(), host, parsed.path.rstrip("/") or "/", "", parsed.query, "")
    )
    return cleaned


def host_allowed(url: str) -> bool:
    host = (urllib.parse.urlparse(url).hostname or "").lower()
    bare = host[4:] if host.startswith("www.") else host
    allowed_bare = {h.removeprefix("www.") for h in ALLOWED_HOSTS}
    return bare in allowed_bare


def fetch_html(url: str, timeout: int = 25) -> str:
    # Basic SSRF guard: block private IPs by hostname heuristics (DNS rebinding residual risk on Worker)
    host = urllib.parse.urlparse(url).hostname or ""
    if host in {"localhost", "127.0.0.1", "0.0.0.0"} or host.endswith(".local"):
        raise ValueError("Yerel adreslere istek engellendi.")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read(2_000_000)
        charset = "utf-8"
        ctype = resp.headers.get_content_charset()
        if ctype:
            charset = ctype
        return raw.decode(charset, errors="replace")


def _meta(html: str, prop: str) -> str | None:
    patterns = [
        rf'<meta[^>]+property=["\']{re.escape(prop)}["\'][^>]+content=["\']([^"\']+)["\']',
        rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']{re.escape(prop)}["\']',
        rf'<meta[^>]+name=["\']{re.escape(prop)}["\'][^>]+content=["\']([^"\']+)["\']',
        rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']{re.escape(prop)}["\']',
    ]
    for pat in patterns:
        m = re.search(pat, html, re.I)
        if m:
            return html_lib.unescape(m.group(1).strip())
    return None


def _json_ld_blocks(html: str) -> list[Any]:
    blocks = []
    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.I | re.S,
    ):
        raw = m.group(1).strip()
        try:
            blocks.append(json.loads(raw))
        except json.JSONDecodeError:
            continue
    return blocks


def _walk_ld(obj: Any):
    if isinstance(obj, list):
        for item in obj:
            yield from _walk_ld(item)
    elif isinstance(obj, dict):
        yield obj
        for v in obj.values():
            yield from _walk_ld(v)


def extract_metadata(url: str, html: str) -> dict:
    title = _meta(html, "og:title") or _meta(html, "twitter:title")
    if not title:
        m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
        title = html_lib.unescape(re.sub(r"\s+", " ", m.group(1))).strip() if m else None

    description = _meta(html, "og:description") or _meta(html, "description") or _meta(html, "twitter:description")
    image = _meta(html, "og:image") or _meta(html, "twitter:image")
    site_name = _meta(html, "og:site_name")
    published = _meta(html, "article:published_time") or _meta(html, "publishdate") or _meta(html, "date")
    author = _meta(html, "author") or _meta(html, "article:author")

    for node in _walk_ld(_json_ld_blocks(html)):
        types = node.get("@type")
        type_list = types if isinstance(types, list) else [types]
        if any(t in ("NewsArticle", "Article", "BlogPosting") for t in type_list if t):
            title = title or node.get("headline") or node.get("name")
            description = description or node.get("description")
            published = published or node.get("datePublished")
            auth = node.get("author")
            if not author and isinstance(auth, dict):
                author = auth.get("name")
            elif not author and isinstance(auth, list) and auth:
                author = auth[0].get("name") if isinstance(auth[0], dict) else str(auth[0])
            elif not author and isinstance(auth, str):
                author = auth
            img = node.get("image")
            if not image and isinstance(img, str):
                image = img
            elif not image and isinstance(img, list) and img:
                image = img[0] if isinstance(img[0], str) else img[0].get("url")
            elif not image and isinstance(img, dict):
                image = img.get("url")
            pub = node.get("publisher")
            if not site_name and isinstance(pub, dict):
                site_name = pub.get("name")

    host = urllib.parse.urlparse(url).hostname or ""
    publisher = site_name or host.replace("www.", "")

    return {
        "url": normalize_url(url),
        "title": title,
        "author": author,
        "publisher": publisher,
        "publishedAt": published,
        "image": image,
        "excerpt": description,
        "sourceAllowed": host_allowed(url),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Makale URL metadata çıkarımı")
    parser.add_argument("url")
    parser.add_argument("--strict-hosts", action="store_true", help="Yalnızca 12punto/Odatv/Kısa Dalga")
    args = parser.parse_args(argv)

    try:
        url = normalize_url(args.url)
        if args.strict_hosts and not host_allowed(url):
            print(json.dumps({"ok": False, "error": "Kaynak izin listesinde değil.", "url": url}, ensure_ascii=False))
            return 2
        html = fetch_html(url)
        meta = extract_metadata(url, html)
        missing = [k for k in ("title", "url") if not meta.get(k)]
        print(json.dumps({"ok": True, "missing": missing, "article": meta}, ensure_ascii=False, indent=2))
        return 0 if meta.get("title") else 3
    except Exception as exc:  # noqa: BLE001 — CLI surface
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
