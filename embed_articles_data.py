#!/usr/bin/env python3
import json
import re

# JSON dosyasını oku
with open('assets/yazilar.json', 'r', encoding='utf-8') as f:
    articles_data = json.load(f)

# Veriyi JavaScript değişkeni olarak format et
articles_script = f"window.articlesData = {json.dumps(articles_data, ensure_ascii=False)};"

# Dosyaları işle
html_files = ['index.html', 'tum-yazilar.html', 'haber.html']

for html_file in html_files:
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Eğer window.articlesData zaten varsa, kaldır
        content = re.sub(r'  <script>window\.articlesData = \[[\s\S]*?\];</script>\n', '', content)
        
        # </head> etiketinden önce veri embed et
        content = content.replace(
            '</head>',
            f'  <script>{articles_script}</script>\n</head>'
        )
        
        # Dosyayı kaydet
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✓ {html_file} güncellendi")
    except FileNotFoundError:
        print(f"⚠️ {html_file} bulunamadı")

print("✓ Makale verileri embed edildi")

