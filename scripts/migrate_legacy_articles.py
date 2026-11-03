#!/usr/bin/env python3
"""
Eski yazilar.json kayıtlarından kaynak URL önerileri üretir.
Otomatik onay YAPMAZ — review dosyası yazar.

Çıktı: assets/data/legacy-url-suggestions.json
Yedek: assets/data/backups/yazilar.json.bak (kopya)
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
YAZILAR = ROOT / "assets" / "yazilar.json"
OUT = ROOT / "assets" / "data" / "legacy-url-suggestions.json"
BACKUP_DIR = ROOT / "assets" / "data" / "backups"

PREFERRED_HOSTS = ("kisadalga.net", "odatv.com", "odatv4.com", "12punto.com")
URL_RE = re.compile(r"https?://[^\s<\"']+", re.I)


def prefer_url(urls: list[str]) -> str | None:
    scored = []
    for u in urls:
        host = (urlparse(u).hostname or "").lower().removeprefix("www.")
        score = 0
        for i, h in enumerate(PREFERRED_HOSTS):
            if host == h or host.endswith("." + h):
                score = 100 - i
                break
        if "ibrahim" in u.lower() or "gunduz" in u.lower() or "gündüz" in u.lower():
            score += 5
        # Skip social / unrelated
        if any(x in host for x in ("facebook.com", "twitter.com", "instagram.com", "dailymotion.com")):
            score -= 50
        scored.append((score, u))
    scored.sort(reverse=True)
    return scored[0][1] if scored and scored[0][0] > 0 else (urls[0] if urls else None)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backup", action="store_true", help="yazilar.json yedeği al")
    args = parser.parse_args()

    articles = json.loads(YAZILAR.read_text(encoding="utf-8"))
    if args.backup:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        dest = BACKUP_DIR / f"yazilar-{stamp}.json.bak"
        shutil.copy2(YAZILAR, dest)
        print(f"Yedek: {dest}")

    suggestions = []
    for item in articles:
        urls = URL_RE.findall(item.get("htmlContent") or "")
        # dedupe preserve order
        seen = set()
        uniq = []
        for u in urls:
            if u not in seen:
                seen.add(u)
                uniq.append(u)
        best = prefer_url(uniq)
        confidence = "high" if best and any(h in (urlparse(best).hostname or "") for h in PREFERRED_HOSTS[:3]) else "low"
        if not best:
            confidence = "none"
        suggestions.append(
            {
                "fileName": item.get("fileName"),
                "title": item.get("title"),
                "suggestedUrl": best,
                "allUrls": uniq[:10],
                "confidence": confidence,
                "status": "pending_review",
                "note": "Otomatik onaylanmadı — elle doğrulayın.",
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total": len(suggestions),
        "pendingReview": len(suggestions),
        "suggestions": suggestions,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Yazıldı: {OUT} ({len(suggestions)} öneri)")
    high = sum(1 for s in suggestions if s["confidence"] == "high")
    print(f"Yüksek güven: {high} | Düşük/yok: {len(suggestions) - high}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
