#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DOCX dosyalarından (ZIP format) resimlerle birlikte içeriği çıkartıyor
"""

import os
import json
import re
import zipfile
from pathlib import Path
from docx import Document

# Dizinler
docs_folder = Path("assets/documents")
output_images = Path("assets/images/articles")
output_images.mkdir(parents=True, exist_ok=True)

def extract_images_from_docx_zip(docx_path, article_base_name):
    """DOCX'ten (ZIP) resimler doğrudan çıkart"""
    
    images_extracted = []
    image_counter = 1
    
    try:
        with zipfile.ZipFile(docx_path, 'r') as zip_ref:
            # Media klasöründeki tüm dosyaları listele
            media_files = [f for f in zip_ref.namelist() if 'media/' in f]
            
            for media_file in sorted(media_files):
                try:
                    # Dosya uzantısını al
                    ext = media_file.split('.')[-1].lower()
                    if ext not in ['jpg', 'jpeg', 'png', 'gif', 'bmp']:
                        continue
                    
                    # Normalize extension
                    if ext == 'jpeg':
                        ext = 'jpg'
                    
                    # Resim adı oluştur
                    image_filename = f"{article_base_name}-img{image_counter}.{ext}"
                    image_path = output_images / image_filename
                    
                    # Resmi kaydet
                    image_data = zip_ref.read(media_file)
                    with open(image_path, 'wb') as f:
                        f.write(image_data)
                    
                    images_extracted.append(f"assets/images/articles/{image_filename}")
                    image_counter += 1
                except Exception as e:
                    pass
    except Exception as e:
        pass
    
    return images_extracted

def extract_text_from_docx(docx_path):
    """DOCX'ten metin çıkart"""
    
    html_parts = []
    
    try:
        doc = Document(docx_path)
        
        for paragraph in doc.paragraphs:
            text = paragraph.text.strip()
            
            if not text:
                continue
            
            # Markdown başlıkları HTML'e çevir
            if text.startswith('# '):
                html_parts.append(f"<h1>{text[2:]}</h1>")
            elif text.startswith('## '):
                html_parts.append(f"<h2>{text[3:]}</h2>")
            elif text.startswith('### '):
                html_parts.append(f"<h3>{text[4:]}</h3>")
            else:
                # Linki algıla ve <a> etiketi yap
                url_pattern = r'https?://[^\s]+'
                if re.search(url_pattern, text):
                    # URL var - linkle
                    text_with_links = re.sub(url_pattern, lambda m: f'<a href="{m.group()}">{m.group()}</a>', text)
                    html_parts.append(f"<p>{text_with_links}</p>")
                else:
                    html_parts.append(f"<p>{text}</p>")
    except Exception as e:
        pass
    
    return html_parts

def process_all_docx():
    """Tüm DOCX dosyalarını işle"""
    
    articles = []
    
    if not docs_folder.exists():
        print(f"❌ {docs_folder} klasörü bulunamadı!")
        return
    
    docx_files = sorted(docs_folder.glob("*.docx"))
    print(f"📄 {len(docx_files)} DOCX dosyası bulundu\n")
    
    for idx, docx_file in enumerate(docx_files, 1):
        print(f"[{idx}/{len(docx_files)}] {docx_file.name}", end=" ")
        
        try:
            # Dosya adından base name oluştur
            base_name = docx_file.stem.lower()
            base_name = re.sub(r'[^\w\s-]', '', base_name)
            base_name = re.sub(r'\s+', '-', base_name)[:60]
            
            # Metni çıkart
            html_parts = extract_text_from_docx(docx_file)
            
            # Resimleri çıkart (ZIP'ten)
            images = extract_images_from_docx_zip(docx_file, base_name)
            
            if images:
                print(f"({len(images)} resim)", end=" ")
            
            # HTML oluştur - resimleri dağıt
            html_content = ""
            for i, part in enumerate(html_parts):
                html_content += part + "\n"
                # Her 3 paragrafdan sonra resim (varsa)
                img_idx = i // 3
                if (i + 1) % 3 == 0 and img_idx < len(images):
                    html_content += f'<img src="{images[img_idx]}" style="max-width:100%; margin: 20px 0; border-radius: 8px;" alt="Makale Resmi">\n'
            
            # Kalan resimleri sona ekle
            for img_src in images[(len(html_parts) // 3):]:
                html_content += f'<img src="{img_src}" style="max-width:100%; margin: 20px 0; border-radius: 8px;" alt="Makale Resmi">\n'
            
            # Başlık (ilk satır veya dosya adı)
            title = html_parts[0].replace('<h1>', '').replace('</h1>', '').replace('<p>', '').replace('</p>', '') if html_parts else docx_file.stem
            
            # Thumbnail = ilk resim veya default
            thumbnail = images[0] if images else "assets/images/default-thumbnail.jpg"
            
            # Makale objesi
            article = {
                "title": title,
                "fileName": docx_file.name,
                "thumbnail": thumbnail,
                "htmlContent": html_content
            }
            
            articles.append(article)
            print("✅")
            
        except Exception as e:
            print(f"❌ {e}")
    
    # JSON'a kaydet
    json_path = Path("assets/yazilar.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*60}")
    print(f"✅ {len(articles)} makale işlendi")
    print(f"💾 JSON kaydedildi: {json_path}")
    print(f"📁 Resimler kaydedildi: {output_images}")
    print(f"{'='*60}")
    
    # JSON doğrula
    try:
        with open(json_path) as f:
            json.load(f)
        print("✅ JSON geçerli!")
    except:
        print("❌ JSON hatalı!")

if __name__ == "__main__":
    process_all_docx()
