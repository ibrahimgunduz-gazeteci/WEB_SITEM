#!/bin/bash
# İbrahim Gündüz - Makaleler Düzeltme Aracı
# Tüm yazılardaki resimleri çıkart ve HTML'yi düzelt

cd "$(dirname "$0")" || exit

echo ""
echo "===================================================="
echo "  🔧 Makale Düzeltme Aracı"
echo "  Resimleri çıkart ve HTML'yi güncelle"
echo "===================================================="
echo ""

python3 convert_docx_to_html_fixed.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Makaleler düzeltildi!"
    echo ""
    echo "🔄 GitHub'a push ediliyor..."
    git add . && git commit -m "Fix articles: extract images and update HTML" && git push
    
    if [ $? -eq 0 ]; then
        echo "✅ GitHub'a başarıyla push edildi!"
    else
        echo "⚠️  GitHub push'unda sorun oluştu"
    fi
else
    echo "❌ Düzeltme sırasında hata oluştu"
    exit 1
fi
