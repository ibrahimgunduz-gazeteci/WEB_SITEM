#!/usr/bin/env python3
"""
Haricî yazı yönetimi (CLI).
Dosya: assets/external-articles.json

Komutlar:
  list | add <url> | update <id> | unpublish <id> | publish <id> | search <q>
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, urlunparse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets" / "external-articles.json"

sys.path.insert(0, str(ROOT / "scripts"))
import article_meta as am  # noqa: E402


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load() -> dict:
    if not DATA.exists():
        return {"version": 1, "updatedAt": now_iso(), "articles": []}
    return json.loads(DATA.read_text(encoding="utf-8"))


def save(data: dict) -> None:
    data["updatedAt"] = now_iso()
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize_key(url: str) -> str:
    p = urlparse(am.normalize_url(url))
    host = (p.hostname or "").lower().removeprefix("www.")
    return urlunparse(("https", host, p.path.rstrip("/") or "/", "", p.query, ""))


def find_by_url(articles: list[dict], url: str) -> dict | None:
    key = normalize_key(url)
    for a in articles:
        if normalize_key(a.get("url", "")) == key:
            return a
    return None


def cmd_list(args: argparse.Namespace) -> int:
    data = load()
    arts = data.get("articles", [])
    if args.status:
        arts = [a for a in arts if a.get("status") == args.status]
    for a in arts:
        print(f"{a.get('id')} | {a.get('status')} | {a.get('publishedAt') or '-'} | {a.get('title')}")
    print(f"Toplam: {len(arts)}")
    return 0


def cmd_add(args: argparse.Namespace) -> int:
    data = load()
    url = am.normalize_url(args.url)
    if find_by_url(data["articles"], url):
        print("Bu URL zaten kayıtlı.", file=sys.stderr)
        return 2

    meta = None
    if not args.no_fetch:
        try:
            html = am.fetch_html(url)
            meta = am.extract_metadata(url, html)
        except Exception as exc:  # noqa: BLE001
            print(f"Metadata alınamadı: {exc}", file=sys.stderr)
            if args.require_meta:
                return 1
            meta = {"url": url, "title": args.title, "sourceAllowed": am.host_allowed(url)}

    title = args.title or (meta or {}).get("title")
    if not title:
        print("Başlık gerekli (--title veya başarılı fetch).", file=sys.stderr)
        return 1

    record = {
        "id": str(uuid.uuid4())[:8],
        "url": url,
        "title": title,
        "author": args.author or (meta or {}).get("author") or "İbrahim Gündüz",
        "publisher": args.publisher or (meta or {}).get("publisher"),
        "publishedAt": args.date or (meta or {}).get("publishedAt"),
        "image": args.image or (meta or {}).get("image"),
        "excerpt": args.excerpt or (meta or {}).get("excerpt"),
        "category": args.category or "genel",
        "status": "draft" if args.draft else "published",
        "legacyFileName": None,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    data["articles"].append(record)
    save(data)
    print(json.dumps(record, ensure_ascii=False, indent=2))
    return 0


def cmd_set_status(args: argparse.Namespace, status: str) -> int:
    data = load()
    for a in data["articles"]:
        if a.get("id") == args.id:
            a["status"] = status
            a["updatedAt"] = now_iso()
            save(data)
            print(f"{args.id} → {status}")
            return 0
    print("Kayıt bulunamadı.", file=sys.stderr)
    return 1


def cmd_update(args: argparse.Namespace) -> int:
    data = load()
    for a in data["articles"]:
        if a.get("id") == args.id:
            for field, val in {
                "title": args.title,
                "excerpt": args.excerpt,
                "category": args.category,
                "image": args.image,
                "publishedAt": args.date,
                "publisher": args.publisher,
            }.items():
                if val is not None:
                    a[field] = val
            a["updatedAt"] = now_iso()
            save(data)
            print(json.dumps(a, ensure_ascii=False, indent=2))
            return 0
    print("Kayıt bulunamadı.", file=sys.stderr)
    return 1


def cmd_search(args: argparse.Namespace) -> int:
    q = args.query.casefold()
    data = load()
    hits = [a for a in data["articles"] if q in (a.get("title") or "").casefold() or q in (a.get("url") or "").casefold()]
    for a in hits:
        print(f"{a.get('id')} | {a.get('status')} | {a.get('title')}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Haricî yazı yöneticisi")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_list = sub.add_parser("list")
    p_list.add_argument("--status", choices=["draft", "published", "unpublished"])

    p_add = sub.add_parser("add")
    p_add.add_argument("url")
    p_add.add_argument("--title")
    p_add.add_argument("--author")
    p_add.add_argument("--publisher")
    p_add.add_argument("--date")
    p_add.add_argument("--image")
    p_add.add_argument("--excerpt")
    p_add.add_argument("--category", default="genel")
    p_add.add_argument("--draft", action="store_true")
    p_add.add_argument("--no-fetch", action="store_true")
    p_add.add_argument("--require-meta", action="store_true")

    p_up = sub.add_parser("update")
    p_up.add_argument("id")
    p_up.add_argument("--title")
    p_up.add_argument("--excerpt")
    p_up.add_argument("--category")
    p_up.add_argument("--image")
    p_up.add_argument("--date")
    p_up.add_argument("--publisher")

    p_pub = sub.add_parser("publish")
    p_pub.add_argument("id")
    p_un = sub.add_parser("unpublish")
    p_un.add_argument("id")

    p_s = sub.add_parser("search")
    p_s.add_argument("query")

    args = parser.parse_args(argv)
    if args.cmd == "list":
        return cmd_list(args)
    if args.cmd == "add":
        return cmd_add(args)
    if args.cmd == "update":
        return cmd_update(args)
    if args.cmd == "publish":
        return cmd_set_status(args, "published")
    if args.cmd == "unpublish":
        return cmd_set_status(args, "unpublished")
    if args.cmd == "search":
        return cmd_search(args)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
