#!/bin/bash
# ================================================
# İbrahim Gündüz Websitesi — Yeni Yazı Yükleyici
# (Mac için — çift tıklayarak çalıştırın)
# ================================================

REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

clear
echo "============================================"
echo "  İbrahim Gündüz Websitesi — Yazı Yükleyici"
echo "============================================"
echo ""

# Yeni dosya var mı kontrol et (Türkçe ve İngilizce belgeler)
NEW_FILES=$(git status --short assets/documents/ assets/eng-documents/ 2>/dev/null | grep -E "^\?\?|^ M|^A" | wc -l | tr -d ' ')

if [ "$NEW_FILES" -eq "0" ]; then
    echo "⚠️  Yüklenecek yeni dosya bulunamadı."
    echo ""
    echo "Lütfen önce yeni .docx dosyanızı şu klasöre koyun:"
    echo "  Türkçe yazılar: assets/documents/"
    echo "  İngilizce yazılar: assets/eng-documents/"
    echo ""
    echo "Sonra bu scripti tekrar çalıştırın."
    echo ""
    read -p "Çıkmak için Enter'a basın..." dummy
    exit 0
fi

echo "✅  $NEW_FILES yeni dosya bulundu. Yükleniyor..."
echo ""

git add assets/documents/ assets/eng-documents/ 2>/dev/null

COMMIT_MSG="Yeni yazi eklendi — $(date '+%d.%m.%Y %H:%M')"
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌  Hata oluştu. Lütfen internet bağlantınızı"
    echo "    kontrol edip tekrar deneyin."
    echo ""
    read -p "Çıkmak için Enter'a basın..." dummy
    exit 1
fi

echo ""
echo "📤  GitHub'a gönderiliyor..."
git push

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "  ✅  Başarılı! Yazı siteye yüklendi."
    echo ""
    echo "  Yaklaşık 1-2 dakika içinde sitede görünür."
    echo "============================================"
else
    echo ""
    echo "============================================"
    echo "  ❌  Bağlantı hatası."
    echo "  İnternet bağlantınızı kontrol edip"
    echo "  tekrar deneyin."
    echo "============================================"
fi

echo ""
read -p "Çıkmak için Enter'a basın..." dummy
