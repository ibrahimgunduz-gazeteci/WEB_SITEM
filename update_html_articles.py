#!/usr/bin/env python3
"""
Update window.articlesData in HTML files with correct thumbnail paths from yazilar.json
"""

import json
import re

# Read the correct data from yazilar.json
with open('assets/yazilar.json', 'r', encoding='utf-8') as f:
    articles_data = json.load(f)

# Convert to JavaScript array format (minimal JSON for embedding)
js_data = json.dumps(articles_data, ensure_ascii=False, separators=(',', ':'))

# Files to update
html_files = [
    'index.html',
    'tum-yazilar.html'
]

for html_file in html_files:
    print(f"Updating {html_file}...")
    
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find and replace window.articlesData = [...]
    # This regex finds the script tag with window.articlesData assignment
    pattern = r'<script>window\.articlesData = \[.*?\];</script>'
    
    replacement = f'<script>window.articlesData = {js_data};</script>'
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    if new_content != content:
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  ✓ Updated {html_file}")
    else:
        print(f"  ! No changes needed for {html_file}")

print("\nDone! HTML files have been updated with correct thumbnail paths.")
