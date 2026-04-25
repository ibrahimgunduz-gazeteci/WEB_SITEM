@echo off
REM İbrahim Gündüz - Yazı Ekleme Sistemi (Windows)
REM Çift tıkla açıp DOCX dosya sürükle

chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ====================================================
echo  🚀 İbrahim Gündüz - Yazı Ekleme Sistemi
echo  Türkçe/İngilizce Makaleler - Resimleri Çıkart
echo ====================================================
echo.

if "%~1"=="" (
    echo 📄 DOCX dosyasını bu batch dosyasının üzerine sürükle:
    echo.
    python add_new_article.py
) else (
    set "docx_file=%~1"
    
    if /i "!docx_file:~-5!"==".docx" (
        echo 📄 Dosya: !docx_file!
        echo.
        python add_new_article.py "!docx_file!"
    ) else (
        echo ❌ Lütfen DOCX dosyası sürükle (.docx)
        pause
        exit /b 1
    )
)

pause
