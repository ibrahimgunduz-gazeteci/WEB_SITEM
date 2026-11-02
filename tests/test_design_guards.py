#!/usr/bin/env python3
"""Tasarım / güvenlik koruma testleri."""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DesignGuardTests(unittest.TestCase):
    def test_no_orange_nav_border_top_in_css(self):
        css_files = list((ROOT / "assets" / "css").glob("*.css"))
        offenders = []
        for path in css_files:
            text = path.read_text(encoding="utf-8")
            # Look for thick accent border-top near nav rules
            if re.search(r"nav[^{]*\{[^}]*border-top:\s*3px\s+solid\s+#(e74c3c|ff7668)", text, re.I | re.S):
                offenders.append(str(path))
            if re.search(r"border-top:\s*3px\s+solid\s+#ff7668", text, re.I):
                offenders.append(str(path))
        self.assertEqual(offenders, [], f"Turuncu nav border-top kaldı: {offenders}")

    def test_refinement_forbids_dark_nav_orange_line(self):
        text = (ROOT / "assets" / "css" / "refinement.css").read_text(encoding="utf-8")
        self.assertIn("border-top: none", text)
        self.assertNotIn("border-top: 3px solid #ff7668", text)

    def test_no_client_youtube_api_key(self):
        js = (ROOT / "assets" / "js" / "youtube-feed.js").read_text(encoding="utf-8")
        self.assertNotIn("AIza", js)
        self.assertIn("videos.json", js)

    def test_no_plaintext_admin_password(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertNotIn("ibrahim2024", index)
        self.assertNotIn("admin-panel", index)

    def test_videos_json_schema(self):
        data = json.loads((ROOT / "assets" / "videos.json").read_text(encoding="utf-8"))
        self.assertIn("videos", data)
        self.assertGreaterEqual(data["count"], 1)
        v = data["videos"][0]
        for key in ("id", "title", "url", "publishedAt", "thumbnail"):
            self.assertIn(key, v)

    def test_external_articles_schema(self):
        data = json.loads((ROOT / "assets" / "external-articles.json").read_text(encoding="utf-8"))
        self.assertEqual(data.get("version"), 1)
        self.assertIsInstance(data.get("articles"), list)

    def test_root_html_pages_exist(self):
        required = [
            "index.html",
            "tum-yazilar.html",
            "tum-videolar.html",
            "haber.html",
            "eng_article.html",
            "altin-olum.html",
            "altin-girdap.html",
            "o-soruyu-biz-sormayalim.html",
            "copler-faciasi.html",
            "altin-olum-satin-al.html",
            "altin-girdap-satin-al.html",
            "o-soruyu-biz-sormayalim-satin-al.html",
            "coplerFacyasi-satin-al.html",
            "tum-ingilizce-yazilar.html",
        ]
        for name in required:
            self.assertTrue((ROOT / name).exists(), name)


if __name__ == "__main__":
    unittest.main()
