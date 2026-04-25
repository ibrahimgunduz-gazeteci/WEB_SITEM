#!/usr/bin/env python3
import json
import re

# JSON dosyasını oku
with open('assets/yazilar.json', 'r', encoding='utf-8') as f:
    articles_data = json.load(f)

# Veriyi JavaScript değişkeni olarak format et
articles_script = f"window.articlesData = {json.dumps(articles_data, ensure_ascii=False)};"

# index.html'i oku
with open('index.html', 'r', encoding='utf-8') as f:
    index_content = f.read()

# Eğer window.articlesData zaten varsa, kaldır
index_content = re.sub(r'<script>window\.articlesData = \[.*?\];</script>\n', '', index_content, flags=re.DOTALL)

# </head> etiketinden önce veri embed et
index_content = index_content.replace(
    '</head>',
    f'  <script>{articles_script}</script>\n</head>'
)

# index.html'i kaydet
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_content)

# tum-yazilar.html'i oku
with open('tum-yazilar.html', 'r', encoding='utf-8') as f:
    tum_content = f.read()

# Eğer window.articlesData zaten varsa, kaldır
tum_content = re.sub(r'<script>window\.articlesData = \[.*?\];</script>\n', '', tum_content, flags=re.DOTALL)

# </head> etiketinden önce veri embed et
tum_content = tum_content.replace(
    '</head>',
    f'  <script>{articles_script}</script>\n</head>'
)

# tum-yazilar.html'i kaydet
with open('tum-yazilar.html', 'w', encoding='utf-8') as f:
    f.write(tum_content)

print("✓ Makale verileri index.html ve tum-yazilar.html dosyalarına embed edildi")
