#!/usr/bin/env python3
import json
import os

# assets/yazilar.txt dosyasını oku
input_file = 'assets/yazilar.txt'
output_file = 'assets/yazilar.json'

articles = []

with open(input_file, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('._') and line.endswith('.docx'):
            title = line.replace('.docx', '').replace('-', ' ').replace('_', ' ')
            title = ' '.join(word.capitalize() for word in title.split())
            
            articles.append({
                'fileName': line,
                'title': title,
                'thumbnail': f'assets/images/articles/{line.replace(".docx", ".jpg")}'
            })

# JSON dosyasını oluştur
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(articles, f, ensure_ascii=False, indent=2)

print(f"✓ {len(articles)} makale JSON formatına dönüştürüldü: {output_file}")
