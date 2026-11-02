#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import manage_articles as ma  # noqa: E402


class ManageArticlesTests(unittest.TestCase):
    def test_add_without_fetch_and_dedupe(self):
        with tempfile.TemporaryDirectory() as tmp:
            data_path = Path(tmp) / "external-articles.json"
            ma.DATA = data_path
            code = ma.main(
                [
                    "add",
                    "https://kisadalga.net/haber/ornek-yazi",
                    "--no-fetch",
                    "--title",
                    "Örnek Yazı",
                    "--draft",
                ]
            )
            self.assertEqual(code, 0)
            data = json.loads(data_path.read_text(encoding="utf-8"))
            self.assertEqual(len(data["articles"]), 1)
            self.assertEqual(data["articles"][0]["status"], "draft")
            code2 = ma.main(
                [
                    "add",
                    "https://kisadalga.net/haber/ornek-yazi/",
                    "--no-fetch",
                    "--title",
                    "Tekrar",
                ]
            )
            self.assertEqual(code2, 2)
            aid = data["articles"][0]["id"]
            self.assertEqual(ma.main(["publish", aid]), 0)
            data = json.loads(data_path.read_text(encoding="utf-8"))
            self.assertEqual(data["articles"][0]["status"], "published")


if __name__ == "__main__":
    unittest.main()
