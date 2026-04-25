#!/usr/bin/env python3
"""
Fix thumbnail paths by normalizing Turkish characters to ASCII-safe filenames.
This will:
1. Rename image files to remove Turkish characters
2. Update JSON with new normalized paths
3. Prepare for git commit
"""

import os
import json
import shutil
from pathlib import Path

def normalize_filename(filename):
    """Convert Turkish characters to ASCII equivalents"""
    # Turkish character mapping
    tr_to_en = {
        'ç': 'c', 'Ç': 'C', 
        'ğ': 'g', 'Ğ': 'G', 
        'ı': 'i', 'İ': 'I', 
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U', 
        'ö': 'o', 'Ö': 'O'
    }
    
    # Replace Turkish characters
    for tr_char, en_char in tr_to_en.items():
        filename = filename.replace(tr_char, en_char)
    
    # Remove any remaining non-ASCII characters
    filename = filename.encode('ascii', 'ignore').decode('ascii')
    
    return filename

def main():
    img_dir = Path('/Users/askingunduz/Desktop/IbrahimGunduz/assets/images/articles')
    json_path = Path('/Users/askingunduz/Desktop/IbrahimGunduz/assets/yazilar.json')
    
    print("🔧 Starting thumbnail fix...")
    
    # Load JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        articles = json.load(f)
    
    # Create mapping of old -> new filenames
    file_mapping = {}  # old filename -> new filename
    
    # First pass: identify all renames
    print("\n📝 Pass 1: Analyzing files...")
    for filename in sorted(os.listdir(img_dir)):
        filepath = img_dir / filename
        if filepath.is_file() and filename.endswith(('.png', '.jpg', '.PNG', '.JPG')):
            normalized = normalize_filename(filename)
            if normalized != filename:
                file_mapping[filename] = normalized
                print(f"  {filename}")
                print(f"    → {normalized}")
    
    # Second pass: rename files
    print(f"\n📂 Pass 2: Renaming {len(file_mapping)} files...")
    for old_name, new_name in file_mapping.items():
        old_path = img_dir / old_name
        new_path = img_dir / new_name
        
        # Handle collision
        if new_path.exists() and new_path != old_path:
            print(f"  ⚠️  Collision: {new_name} already exists!")
            continue
        
        try:
            old_path.rename(new_path)
            print(f"  ✓ {old_name} → {new_name}")
        except Exception as e:
            print(f"  ✗ Error renaming {old_name}: {e}")
    
    # Third pass: update JSON
    print(f"\n📋 Pass 3: Updating JSON...")
    updated_count = 0
    
    for article in articles:
        old_thumb = article.get('thumbnail', '')
        
        # Check if thumbnail path contains any file that was renamed
        for old_name, new_name in file_mapping.items():
            if old_name in old_thumb:
                new_thumb = old_thumb.replace(old_name, new_name)
                article['thumbnail'] = new_thumb
                print(f"  ✓ Updated: {article['title'][:30]}...")
                updated_count += 1
                break
        
        # Also update htmlContent img tags
        old_html = article.get('htmlContent', '')
        for old_name, new_name in file_mapping.items():
            if old_name in old_html:
                article['htmlContent'] = old_html.replace(old_name, new_name)
    
    # Save updated JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Updated {updated_count} articles in JSON")
    print(f"📁 JSON saved to: {json_path}")
    
    # Summary
    print("\n" + "="*50)
    print("✨ Fix Complete!")
    print(f"   - Renamed files: {len(file_mapping)}")
    print(f"   - Updated articles: {updated_count}")
    print("\n📌 Next steps:")
    print("   1. git add -A")
    print("   2. git commit -m 'Fix: normalize Turkish characters in thumbnail paths'")
    print("   3. git push")

if __name__ == '__main__':
    main()
