#!/usr/bin/env python3
import json
import os
import re
import unicodedata

def normalize_filename(filename):
    """Türkçe karakterleri ASCII'ye dönüştür"""
    # Türkçe char mapping
    for tr, en in [('ç', 'c'), ('Ç', 'C'), ('ğ', 'g'), ('Ğ', 'G'), 
                    ('ı', 'i'), ('İ', 'I'), ('ş', 's'), ('Ş', 'S'),
                    ('ü', 'u'), ('Ü', 'U'), ('ö', 'o'), ('Ö', 'O')]:
        filename = filename.replace(tr, en)
    
    # Remove non-ASCII characters
    filename = ''.join(c if ord(c) < 128 else '' for c in filename)
    
    # Normalize spaces to hyphens, remove extra chars
    filename = re.sub(r'[^\w\s.-]', '', filename)
    filename = re.sub(r'\s+', '-', filename)
    filename = re.sub(r'-+', '-', filename)
    filename = filename.strip('-')
    
    return filename

# Load JSON
with open('assets/yazilar.json', 'r', encoding='utf-8') as f:
    articles = json.load(f)

# Check what files actually exist in disk
img_dir = 'assets/images/articles'
actual_files = set(os.listdir(img_dir))
print(f"Total files on disk: {len(actual_files)}")

# Fix each article's thumbnail path
updated = 0
for i, article in enumerate(articles):
    if 'thumbnail' in article:
        old_path = article['thumbnail']
        old_filename = os.path.basename(old_path)
        
        # Normalize the filename
        base = os.path.splitext(old_filename)[0]
        ext = os.path.splitext(old_filename)[1].lower()
        normalized = normalize_filename(base)
        new_filename = normalized + ext
        
        # Check if normalized file exists
        if new_filename in actual_files:
            article['thumbnail'] = f"assets/images/articles/{new_filename}"
            if old_filename != new_filename:
                updated += 1
                print(f"{i}: {old_filename} → {new_filename}")
        else:
            print(f"WARNING: {i} - normalized file not found: {new_filename}")
            # Try to find it with partial matching
            search_pattern = normalized.lower()
            matches = [f for f in actual_files if search_pattern.lower() in f.lower()]
            if matches:
                print(f"  Possible match: {matches[0]}")

print(f"\nUpdated {updated} articles")

# Save JSON
with open('assets/yazilar.json', 'w', encoding='utf-8') as f:
    json.dump(articles, f, ensure_ascii=False, indent=2)

print("Saved yazilar.json")
