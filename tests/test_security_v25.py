#!/usr/bin/env python3
"""v2.5 security regression tests (local / mock)."""

from __future__ import annotations

import json
import re
import sys
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import article_meta as am  # noqa: E402


class SecurityV25Tests(unittest.TestCase):
    def test_no_hardcoded_secrets_in_source(self):
        patterns = [
            re.compile(r"ghp_[A-Za-z0-9]{20,}"),
            re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
            re.compile(r"AIza[0-9A-Za-z\-_]{20,}"),
            re.compile(r"-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----"),
            re.compile(r"ibrahim2024"),
        ]
        skip_dirs = {".git", "node_modules", "_site", ".venv-tools", "SCREENSHOTS-2.3", "SCREENSHOTS-2.4", "SCREENSHOTS-2.5", "SCREENSHOTS-2.6", "screenshots", "tests"}
        # Docs may mention removed credentials by name; scan executable surface only.
        allow_suffix = {".py", ".js", ".mjs", ".html", ".yml", ".yaml", ".json", ".toml", ".css"}
        offenders = []
        for path in ROOT.rglob("*"):
            if any(part in skip_dirs for part in path.parts):
                continue
            if not path.is_file():
                continue
            if path.suffix.lower() not in allow_suffix:
                continue
            if path.name in {"yazilar.json", "eng-yazilar.json"}:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            for pat in patterns:
                if pat.search(text):
                    offenders.append(f"{path.relative_to(ROOT)} :: {pat.pattern}")
        self.assertEqual(offenders, [], "Possible secrets:\n" + "\n".join(offenders))

    def test_ssrf_blocks_private_targets(self):
        for bad in (
            "http://127.0.0.1/",
            "http://localhost/admin",
            "http://0.0.0.0/",
        ):
            with self.assertRaises(ValueError):
                am.fetch_html(bad)

    def test_javascript_url_rejected(self):
        with self.assertRaises(ValueError):
            am.normalize_url("javascript:alert(1)")

    def test_worker_oauth_state_and_redirect_guards(self):
        src = (ROOT / "cloudflare-worker" / "src" / "index.js").read_text(encoding="utf-8")
        self.assertIn("ig_oauth_state", src)
        self.assertIn("OAuth state doğrulaması", src)
        self.assertIn("safeAdminRedirect", src)
        self.assertIn("redirect: \"manual\"", src)
        self.assertIn("ALLOWED_GITHUB_IDS", src)
        self.assertIn("requireCsrf", src)

    def test_haber_uses_sanitizer_and_textcontent(self):
        html = (ROOT / "haber.html").read_text(encoding="utf-8")
        self.assertIn("sanitize-html.js", html)
        self.assertIn("IGSanitize", html)
        self.assertIn("textContent", html)
        self.assertIn("Path traversal", html)

    def test_workflows_pinned_to_sha(self):
        for name in ("deploy-pages.yml", "sync-youtube.yml", "process-documents.yml", "link-audit.yml"):
            path = ROOT / ".github" / "workflows" / name
            if not path.exists():
                continue
            text = path.read_text(encoding="utf-8")
            uses = re.findall(r"uses:\s*([^\s#]+)", text)
            self.assertTrue(uses, msg=name)
            for u in uses:
                # Local reusable workflows are allowed; third-party actions must be SHA-pinned.
                if u.startswith("./"):
                    continue
                self.assertRegex(
                    u,
                    r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@[0-9a-f]{40}$",
                    msg=f"{name}: {u}",
                )

    def test_gitignore_covers_env(self):
        gi = (ROOT / ".gitignore").read_text(encoding="utf-8")
        self.assertTrue(any(x in gi for x in (".env", "*.env", ".venv")))


if __name__ == "__main__":
    unittest.main()
