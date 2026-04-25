#!/usr/bin/env python3
import os
import json
import unicodedata
import re

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

# Rename thumbnail files
img_dir = '/Users/askingunduz/Desktop/IbrahimGunduz/assets/images/articles'
os.chdir(img_dir)

mapping = {}  # old_name -> new_name
for filename in os.listdir(img_dir):
    if os.path.isfile(filename):
        ext = os.path.splitext(filename)[1]
        if ext.lower() in ['.jpg', '.png']:
            base = os.path.splitext(filename)[0]
            normalized = normalize_filename(base)
            new_filename = normalized + ext.lower()
            
            if filename != new_filename:
                old_path = os.path.join(img_dir, filename)
                new_path = os.path.join(img_dir, new_filename)
                
                # Handle duplicates
                counter = 1
                original_new = new_filename
                while os.path.exists(new_path) and os.path.samefile(old_path, new_path) == False:
                    base_norm = os.path.splitext(original_new)[0]
                    new_filename = f"{base_norm}_{counter}{ext.lower()}"
                    new_path = os.path.join(img_dir, new_filename)
                    counter += 1
                
                if old_path != new_path:
                    os.rename(old_path, new_path)
                    mapping[filename] = new_filename
                    print(f"Renamed: {filename} -> {new_filename}")

print(f"\nTotal renamed: {len(mapping)}")

# Update yazilar.json
json_path = '/Users/askingunduz/Desktop/IbrahimGunduz/assets/yazilar.json'
with open(json_path, 'r', encoding='utf-8') as f:
    articles = json.load(f)

updated_count = 0
for article in articles:
    if 'thumbnail' in article:
        old_path = article['thumbnail']
        # Extract filename
        old_filename = os.path.basename(old_path)
        if old_filename in mapping:
            new_filename = mapping[old_filename]
            article['thumbnail'] = f"assets/images/articles/{new_filename}"
            updated_count += 1

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(articles, f, ensure_ascii=False, indent=2)

print(f"Updated {updated_count} entries in yazilar.json")
