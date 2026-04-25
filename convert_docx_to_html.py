#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert .docx files to HTML and embed in articles.json
GitHub Pages uyumluluğu için statik HTML sistemi
"""

import os
import json
import re
from pathlib import Path

try:
    from docx import Document
except ImportError:
    print("pip install python-docx gerekli")
    exit(1)

def docx_to_html(docx_path):
    """
    .docx dosyasını HTML'e dönüştür
    """
    try:
        doc = Document(docx_path)
        html_parts = []
        
        for para in doc.paragraphs:
            if para.text.strip():
                # Basit HTML paragraf oluştur
                text = para.text
                # Formatting korunur (bold, italic vb)
                for run in para.runs:
                    if run.bold:
                        text = text.replace(run.text, f"<strong>{run.text}</strong>")
                    if run.italic:
                        text = text.replace(run.text, f"<em>{run.text}</em>")
                
                html_parts.append(f"<p>{text}</p>")
        
        # Tablolar
        for table in doc.tables:
            html_parts.append("<table>")
            for row in table.rows:
                html_parts.append("<tr>")
                for cell in row.cells:
                    html_parts.append(f"<td>{cell.text}</td>")
                html_parts.append("</tr>")
            html_parts.append("</table>")
        
        return "\n".join(html_parts)
    except Exception as e:
        print(f"Hata ({docx_path}): {e}")
        return ""

def main():
    docs_folder = "assets/documents"
    articles_file = "assets/yazilar.json"
    
    # Mevcut articles.json'u oku
    with open(articles_file, 'r', encoding='utf-8') as f:
        articles = json.load(f)
    
    # Her makale için .docx'i HTML'e dönüştür
    converted_count = 0
    for article in articles:
        docx_path = os.path.join(docs_folder, article['fileName'])
        
        if os.path.exists(docx_path):
            print(f"⏳ Dönüştürülüyor: {article['fileName']}")
            html_content = docx_to_html(docx_path)
            article['content'] = html_content[:500]  # İlk 500 karakteri preview
            article['fullContent'] = html_content
            converted_count += 1
        else:
            print(f"⚠️ Dosya bulunamadı: {docx_path}")
            article['content'] = "İçerik henüz hazır değil"
            article['fullContent'] = ""
    
    # Güncellenmiş articles.json'u kaydet
    with open(articles_file, 'w', encoding='utf-8') as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ {converted_count} makale dönüştürüldü ve articles.json güncelleştirildi!")

if __name__ == "__main__":
    main()
