#!/usr/bin/env python3
"""
YouTube RSS → assets/videos.json senkronizasyonu.

Kanal: İbrahim Gündüz (UCzIAIU2njG3-av6aTEHSyjw)
RSS yalnızca son ~15 videoyu verir; mevcut videos.json arşiviyle birleştirilir.
Ağ hatasında mevcut JSON bozulmaz (exit 1, dosya yazılmaz).
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

CHANNEL_ID = "UCzIAIU2njG3-av6aTEHSyjw"
CHANNEL_HANDLE = "@İbrahimGündüz-Gazeteci"
DEFAULT_FEED = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"
ATOM = "{http://www.w3.org/2005/Atom}"
YT = "{http://www.youtube.com/xml/schemas/2015}"
MEDIA = "{http://search.yahoo.com/mrss/}"

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "assets" / "videos.json"


def parse_feed(xml_text: str) -> list[dict]:
    root = ET.fromstring(xml_text)
    videos = []
    for entry in root.findall(f"{ATOM}entry"):
        video_id = (entry.findtext(f"{YT}videoId") or "").strip()
        if not video_id:
            continue
        title = (entry.findtext(f"{ATOM}title") or "").strip()
        published = (entry.findtext(f"{ATOM}published") or "").strip()
        link_el = entry.find(f"{ATOM}link")
        url = link_el.get("href") if link_el is not None else f"https://www.youtube.com/watch?v={video_id}"
        thumb_el = entry.find(f"{MEDIA}group/{MEDIA}thumbnail")
        thumbnail = thumb_el.get("url") if thumb_el is not None else f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        # Prefer maxres-style CDN path without downloading
        if "/hqdefault.jpg" in thumbnail:
            thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        description = entry.findtext(f"{MEDIA}group/{MEDIA}description") or ""
        videos.append(
            {
                "id": video_id,
                "title": title,
                "url": url,
                "publishedAt": published,
                "thumbnail": thumbnail,
                "description": description.strip()[:500],
            }
        )
    return videos


def load_existing(path: Path) -> list[dict]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Mevcut videos.json bozuk: {exc}") from exc
    if isinstance(data, dict) and "videos" in data:
        return list(data["videos"])
    if isinstance(data, list):
        return data
    raise SystemExit("videos.json beklenen formatta değil (liste veya {videos: [...]})")


def merge_videos(existing: list[dict], incoming: list[dict]) -> tuple[list[dict], int]:
    by_id: dict[str, dict] = {}
    for item in existing:
        vid = item.get("id")
        if vid:
            by_id[vid] = item
    added = 0
    for item in incoming:
        vid = item["id"]
        if vid not in by_id:
            added += 1
            by_id[vid] = item
        else:
            # Refresh mutable metadata for known videos
            prev = by_id[vid]
            prev["title"] = item.get("title") or prev.get("title")
            prev["thumbnail"] = item.get("thumbnail") or prev.get("thumbnail")
            prev["url"] = item.get("url") or prev.get("url")
            if item.get("publishedAt"):
                prev["publishedAt"] = item["publishedAt"]
            if item.get("description"):
                prev["description"] = item["description"]
    merged = list(by_id.values())

    def sort_key(v: dict) -> str:
        return v.get("publishedAt") or ""

    merged.sort(key=sort_key, reverse=True)
    return merged, added


def fetch_feed(url: str, timeout: int = 30) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "IbrahimGunduzSiteBot/2.1 (+https://ibrahimgunduz.com.tr)"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def build_payload(videos: list[dict]) -> dict:
    return {
        "channelId": CHANNEL_ID,
        "channelHandle": CHANNEL_HANDLE,
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(videos),
        "videos": videos,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="YouTube RSS → videos.json")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--feed-url", default=DEFAULT_FEED)
    parser.add_argument("--feed-file", type=Path, help="Yerel XML fixture (ağ yok)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    try:
        if args.feed_file:
            xml_text = args.feed_file.read_text(encoding="utf-8")
        else:
            xml_text = fetch_feed(args.feed_url)
        incoming = parse_feed(xml_text)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, ET.ParseError) as exc:
        print(f"HATA: Feed alınamadı/ayrıştırılamadı — mevcut JSON korunuyor. ({exc})", file=sys.stderr)
        return 1

    if not incoming:
        print("UYARI: Feed boş; mevcut JSON korunuyor.", file=sys.stderr)
        return 1

    existing = load_existing(args.out)
    merged, added = merge_videos(existing, incoming)
    payload = build_payload(merged)

    print(f"Feed: {len(incoming)} video | Arşiv: {len(existing)} | Birleşik: {len(merged)} | Yeni: {added}")

    if args.dry_run:
        print("Dry-run: dosya yazılmadı.")
        return 0

    args.out.parent.mkdir(parents=True, exist_ok=True)
    new_text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    old_text = args.out.read_text(encoding="utf-8") if args.out.exists() else None
    if old_text == new_text:
        print("Değişiklik yok.")
        return 0

    args.out.write_text(new_text, encoding="utf-8")
    print(f"Yazıldı: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
