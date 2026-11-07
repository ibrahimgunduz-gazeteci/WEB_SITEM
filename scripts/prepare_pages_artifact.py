#!/usr/bin/env python3
"""
GitHub Pages artifact için yayın paketini _site/ altına hazırlar.

Büyük makale orijinal görselleri (assets/images/articles) repo'da kalır;
yayın paketine kart WebP'leri, kitap/kapak ve optimize profil görselleri alınır.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"


def write_yazilar_cards() -> None:
    """Listing/home feed without htmlContent (~26KB vs ~800KB)."""
    src = ROOT / "assets" / "yazilar.json"
    if not src.exists():
        return
    articles = json.loads(src.read_text(encoding="utf-8"))
    cards = []
    for a in articles:
        item = {k: v for k, v in a.items() if k != "htmlContent"}
        cards.append(item)
    out = ROOT / "assets" / "yazilar-cards.json"
    out.write_text(json.dumps(cards, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"yazilar-cards.json: {out.stat().st_size / 1024:.1f} KB ({len(cards)} articles)")

INCLUDE_ROOT_GLOBS = [
    "*.html",
    "CNAME",
    ".nojekyll",
    "robots.txt",
    "sitemap.xml",
    "favicon.ico",
]

INCLUDE_TREES = [
    "assets/css",
    "assets/js",
    "assets/icons",
    "assets/images/cards",
    "assets/images/article-body",
    "assets/images/books",
    "assets/images/profile",
    "assets/images/icons",
    "assets/videos.json",
    "assets/yazilar.json",
    "assets/yazilar-cards.json",
    "assets/eng-yazilar.json",
    "assets/external-articles.json",
    "assets/favicon.png",
    "assets/favicon-16.png",
    "assets/favicon-32.png",
    "assets/favicon.ico",
    "static",
    "admin",
]

# Repo-only (not copied into Pages):
# - assets/images/articles (full-resolution sources; cards serve listings/details)
# - assets/articles-html, assets/documents, assets/kitap_tanitim_pdf
# - tests/, scripts/, cloudflare-worker/, node_modules, .git


def copy_path(rel: str) -> None:
    src = ROOT / rel
    if not src.exists():
        print(f"skip missing: {rel}")
        return
    dest = OUT / rel
    if src.is_dir():
        if dest.exists():
            shutil.rmtree(dest)
        ignore = [".DS_Store", "__pycache__"]
        # Keep full-res profile/article sources in git; ship optimized variants only.
        if rel.replace("\\", "/") == "assets/images/profile":
            ignore.extend(["ibrahimgunduz.png", "ibrahimgunduz2.png", "ibrahimgunduz3.jpg"])
        if rel.replace("\\", "/") == "static":
            # 3MB original profile stays in repo; Pages serves WebP fallback only.
            ignore.append("ibrahimgunduz.png")
        shutil.copytree(src, dest, ignore=shutil.ignore_patterns(*ignore))
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
    print(f"+ {rel}")


def main() -> int:
    write_yazilar_cards()

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    for pattern in INCLUDE_ROOT_GLOBS:
        for path in ROOT.glob(pattern):
            if path.is_file():
                shutil.copy2(path, OUT / path.name)
                print(f"+ {path.name}")

    for rel in INCLUDE_TREES:
        copy_path(rel)

    total = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
    print(f"_site boyutu: {total / (1024 * 1024):.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
