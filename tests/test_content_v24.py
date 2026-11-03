#!/usr/bin/env python3
"""v2.4 içerik / güvenlik / etiket testleri."""

from __future__ import annotations

import json
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import article_meta as am  # noqa: E402
import manage_articles as ma  # noqa: E402


class ContentV24Tests(unittest.TestCase):
    def test_videolarim_labels_and_anchor(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="videos"', index)
        self.assertIn(">Videolarım</", index)
        self.assertNotIn('section-title">Haberlerim', index)
        # All TR pages use Videolarım nav label
        for name in [
            "altin-olum.html",
            "tum-yazilar.html",
            "haber.html",
            "tum-videolar.html",
        ]:
            text = (ROOT / name).read_text(encoding="utf-8")
            self.assertIn('href="index.html#videos">Videolarım</a>', text)

    def test_legacy_72_preserved(self):
        arts = json.loads((ROOT / "assets" / "yazilar.json").read_text(encoding="utf-8"))
        self.assertEqual(len(arts), 72)
        self.assertTrue(all("fileName" in a and "title" in a for a in arts))

    def test_invalid_url_rejected(self):
        with self.assertRaises(ValueError):
            am.normalize_url("javascript:alert(1)")
        with self.assertRaises(ValueError):
            am.fetch_html("http://127.0.0.1/secret")

    def test_manual_add_and_unpublish(self):
        with tempfile.TemporaryDirectory() as tmp:
            ma.DATA = Path(tmp) / "external-articles.json"
            self.assertEqual(
                ma.main(
                    [
                        "add",
                        "https://12punto.com/haber/ornek",
                        "--no-fetch",
                        "--title",
                        "Elle Başlık",
                        "--publisher",
                        "12punto",
                        "--draft",
                    ]
                ),
                0,
            )
            data = json.loads(ma.DATA.read_text(encoding="utf-8"))
            aid = data["articles"][0]["id"]
            self.assertEqual(ma.main(["publish", aid]), 0)
            self.assertEqual(ma.main(["unpublish", aid]), 0)
            data = json.loads(ma.DATA.read_text(encoding="utf-8"))
            self.assertEqual(data["articles"][0]["status"], "unpublished")
            self.assertEqual(
                ma.main(["update", aid, "--title", "Güncel Başlık", "--category", "cevre"]),
                0,
            )
            data = json.loads(ma.DATA.read_text(encoding="utf-8"))
            self.assertEqual(data["articles"][0]["title"], "Güncel Başlık")
            self.assertEqual(data["articles"][0]["category"], "cevre")

    def test_failed_metadata_allows_manual(self):
        with tempfile.TemporaryDirectory() as tmp:
            ma.DATA = Path(tmp) / "external-articles.json"
            with mock.patch.object(am, "fetch_html", side_effect=RuntimeError("blocked")):
                code = ma.main(
                    [
                        "add",
                        "https://kisadalga.net/haber/manuel",
                        "--title",
                        "Manuel Giriş",
                        "--draft",
                    ]
                )
            self.assertEqual(code, 0)
            data = json.loads(ma.DATA.read_text(encoding="utf-8"))
            self.assertEqual(data["articles"][0]["title"], "Manuel Giriş")

    def test_articles_js_external_cta(self):
        js = (ROOT / "assets" / "js" / "articles.js").read_text(encoding="utf-8")
        self.assertIn("Yazının Tamamını Oku", js)

    def test_worker_has_csrf_and_logout(self):
        src = (ROOT / "cloudflare-worker" / "src" / "index.js").read_text(encoding="utf-8")
        self.assertIn("requireCsrf", src)
        self.assertIn("/auth/logout", src)
        self.assertIn("/api/articles/upsert", src)
        self.assertIn("/api/discovery-queue", src)
        self.assertNotIn("GITHUB_TOKEN=", (ROOT / "admin" / "index.html").read_text(encoding="utf-8"))

    def test_admin_panel_sections(self):
        html = (ROOT / "admin" / "index.html").read_text(encoding="utf-8")
        for label in (
            "Genel Bakış",
            "Yazılar",
            "Yeni Yazı Ekle",
            "Taslaklar",
            "İnceleme Bekleyenler",
            "Ayarlar",
        ):
            self.assertIn(label, html)

    def test_youtube_and_pages_workflows_present(self):
        yt = (ROOT / ".github" / "workflows" / "sync-youtube.yml").read_text(encoding="utf-8")
        pages = (ROOT / ".github" / "workflows" / "deploy-pages.yml").read_text(encoding="utf-8")
        self.assertIn("videos.json", yt)
        self.assertIn("pages-deploy", yt)
        self.assertIn("actions/deploy-pages", pages)
        self.assertNotIn("YOUTUBE_SYNC_TOKEN", yt)


if __name__ == "__main__":
    unittest.main()
