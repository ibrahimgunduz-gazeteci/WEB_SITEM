#!/usr/bin/env python3
"""
Repair broken image paths in assets/yazilar.json and embedded data in
index.html and tum-yazilar.html by matching against actual files on disk.

Strategy: normalize both the path in JSON and each actual filename to a
common ASCII-lowercase key, then replace the JSON path with the actual
filename.
"""

import json
import os
import re
import unicodedata
import shutil

ARTICLES_DIR = "assets/images/articles"
JSON_PATH = "assets/yazilar.json"
HTML_FILES = ["index.html", "tum-yazilar.html"]

CHAR_MAP = str.maketrans({
    "İ": "I", "ı": "i",
    "Ş": "S", "ş": "s",
    "Ğ": "G", "ğ": "g",
    "Ü": "U", "ü": "u",
    "Ö": "O", "ö": "o",
    "Ç": "C", "ç": "c",
    "Â": "A", "â": "a",
    "Î": "I", "î": "i",
    "Û": "U", "û": "u",
})


def normalize_key(name: str) -> str:
    """Normalize a filename to a simple ASCII lowercase key for matching."""
    name = name.translate(CHAR_MAP)
    # Also handle any remaining diacritics via NFKD
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    return name.lower()


def build_file_map(directory: str) -> dict:
    """Build {normalize_key(filename): actual_filename} map."""
    file_map = {}
    for fname in os.listdir(directory):
        key = normalize_key(fname)
        if key in file_map:
            # Keep the ASCII-only version if there's a conflict
            existing = file_map[key]
            existing_has_unicode = any(ord(c) > 127 for c in existing)
            new_has_unicode = any(ord(c) > 127 for c in fname)
            if existing_has_unicode and not new_has_unicode:
                file_map[key] = fname  # prefer ASCII version
        else:
            file_map[key] = fname
    return file_map


def fix_path(path: str, file_map: dict) -> str:
    """Given an asset path like 'assets/images/articles/FOO.png', return the fixed version."""
    prefix = "assets/images/articles/"
    if not path.startswith(prefix):
        return path
    fname = path[len(prefix):]
    key = normalize_key(fname)
    if key in file_map:
        actual = file_map[key]
        if actual != fname:
            return prefix + actual
    return path


def fix_html_content(html: str, file_map: dict) -> str:
    """Fix all img src attributes inside an HTML string."""
    def replacer(m):
        src = m.group(1)
        fixed = fix_path(src, file_map)
        return f'src="{fixed}"'
    return re.sub(r'src="(assets/images/articles/[^"]+)"', replacer, html)


def main():
    print("Building file map from disk...")
    file_map = build_file_map(ARTICLES_DIR)
    print(f"  {len(file_map)} files indexed")

    # --- Fix yazilar.json ---
    print(f"\nProcessing {JSON_PATH}...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        articles = json.load(f)

    fixed_count = 0
    for article in articles:
        # Fix thumbnail
        old_thumb = article.get("thumbnail", "")
        new_thumb = fix_path(old_thumb, file_map)
        if new_thumb != old_thumb:
            print(f"  thumbnail: {old_thumb!r} -> {new_thumb!r}")
            article["thumbnail"] = new_thumb
            fixed_count += 1

        # Fix img src inside htmlContent
        old_html = article.get("htmlContent", "")
        new_html = fix_html_content(old_html, file_map)
        if new_html != old_html:
            article["htmlContent"] = new_html
            # Count differences
            old_srcs = re.findall(r'src="(assets/images/articles/[^"]+)"', old_html)
            new_srcs = re.findall(r'src="(assets/images/articles/[^"]+)"', new_html)
            for o, n in zip(old_srcs, new_srcs):
                if o != n:
                    print(f"  htmlContent img: {o!r} -> {n!r}")
                    fixed_count += 1

    # Backup original
    shutil.copy(JSON_PATH, JSON_PATH + ".bak")
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    print(f"\n  Fixed {fixed_count} paths in {JSON_PATH} (backup: {JSON_PATH}.bak)")

    # --- Fix embedded window.articlesData in HTML files ---
    for html_file in HTML_FILES:
        if not os.path.exists(html_file):
            continue
        print(f"\nProcessing {html_file}...")
        with open(html_file, "r", encoding="utf-8") as f:
            content = f.read()

        # The embedded data is inside a <script> with window.articlesData = [...]
        # We can fix all img src and thumbnail strings in one pass
        fixed_html = fix_html_content(content, file_map)

        # Also fix thumbnail paths that appear as plain strings in the JS data
        def fix_thumb_in_js(m):
            path = m.group(1)
            fixed = fix_path(path, file_map)
            return f'"{fixed}"'

        fixed_html = re.sub(
            r'"(assets/images/articles/[^"]+)"',
            fix_thumb_in_js,
            fixed_html
        )

        if fixed_html != content:
            shutil.copy(html_file, html_file + ".bak")
            with open(html_file, "w", encoding="utf-8") as f:
                f.write(fixed_html)
            print(f"  Updated {html_file} (backup: {html_file}.bak)")
        else:
            print(f"  No changes needed in {html_file}")

    print("\nDone!")


if __name__ == "__main__":
    main()
