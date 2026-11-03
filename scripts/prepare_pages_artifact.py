#!/usr/bin/env python3
"""
GitHub Pages artifact için yayın paketini _site/ altına hazırlar.
Büyük kaynak klasörlerini (docx, legacy html, tanıtım pdf) hariç tutarak
Pages boyut sınırına yaklaşmayı azaltır. Site çalışma zamanı dosyaları korunur.
"""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"

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
    "assets/images",
    "assets/videos.json",
    "assets/yazilar.json",
    "assets/eng-yazilar.json",
    "assets/external-articles.json",
    "assets/favicon.png",
    "assets/favicon-16.png",
    "assets/favicon-32.png",
    "assets/favicon.ico",
    "static",
    "admin",
]

# Explicitly excluded from Pages (keep repo-only):
# - assets/articles-html, assets/documents, assets/kitap_tanitim_pdf
# - tests/, scripts/, cloudflare-worker/, SCREENSHOTS-*, reports
# - node_modules, .git


def copy_path(rel: str) -> None:
    src = ROOT / rel
    if not src.exists():
        print(f"skip missing: {rel}")
        return
    dest = OUT / rel
    if src.is_dir():
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(src, dest, ignore=shutil.ignore_patterns(".DS_Store", "__pycache__"))
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
    print(f"+ {rel}")


def main() -> int:
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

    # Boyut raporu
    total = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
    print(f"_site boyutu: {total / (1024 * 1024):.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
