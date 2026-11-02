#!/usr/bin/env python3
"""article_meta birim testleri — ağ yok."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import article_meta as am  # noqa: E402

SAMPLE = """
<html><head>
<title>Ignore</title>
<meta property="og:title" content="Test Başlık &amp; Detay">
<meta property="og:description" content="Kısa özet">
<meta property="og:image" content="https://kisadalga.net/img.jpg">
<meta property="og:site_name" content="Kısa Dalga">
<meta property="article:published_time" content="2024-05-01T12:00:00+03:00">
<script type="application/ld+json">
{"@type":"NewsArticle","author":{"name":"İbrahim Gündüz"}}
</script>
</head><body></body></html>
"""


class ArticleMetaTests(unittest.TestCase):
    def test_extract(self):
        meta = am.extract_metadata("https://kisadalga.net/haber/ornek", SAMPLE)
        self.assertEqual(meta["title"], "Test Başlık & Detay")
        self.assertEqual(meta["excerpt"], "Kısa özet")
        self.assertEqual(meta["author"], "İbrahim Gündüz")
        self.assertTrue(meta["sourceAllowed"])
        self.assertIn("kisadalga.net", meta["url"])

    def test_host_allowed(self):
        self.assertTrue(am.host_allowed("https://www.odatv.com/x"))
        self.assertTrue(am.host_allowed("https://12punto.com/y"))
        self.assertFalse(am.host_allowed("https://evil.example/z"))

    def test_normalize_rejects_non_http(self):
        with self.assertRaises(ValueError):
            am.normalize_url("javascript:alert(1)")


if __name__ == "__main__":
    unittest.main()
