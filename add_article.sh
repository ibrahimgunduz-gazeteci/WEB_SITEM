#!/bin/bash
# İbrahim Gündüz - Yazı Ekleme Sistemi (macOS/Linux)
# Çift tıkla açıp DOCX dosya sürükle veya terminal'de çalıştır

cd "$(dirname "$0")"

echo ""
echo "===================================================="
echo "  🚀 İbrahim Gündüz - Yazı Ekleme Sistemi"
echo "  Türkçe/İngilizce Makaleler"
echo "===================================================="
echo ""

if [ $# -eq 0 ]; then
    # Hiçbir argüman yoksa interaktif mod
    python3 add_new_article.py
else
    # Sürüklenen DOCX dosya varsa
    docx_file="$1"
    
    if [[ "$docx_file" == *.docx ]]; then
        echo "📄 Dosya bulundu: $docx_file"
        echo ""
        python3 add_new_article.py "$docx_file"
    else
        echo "❌ Lütfen DOCX dosyası sürükle (.docx)"
        exit 1
    fi
fi
