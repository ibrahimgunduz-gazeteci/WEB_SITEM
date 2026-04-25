@echo off
REM İbrahim Gündüz - Yazı Ekleme Sistemi (Windows)
REM Çift tıkla açıp DOCX dosya sürükle

chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ====================================================
echo  🚀 İbrahim Gündüz - Yazı Ekleme Sistemi
echo  Türkçe/İngilizce Makaleler
echo ====================================================
echo.

if "%~1"=="" (
    echo 📄 DOCX dosyasını bu batch dosyasının üzerine sürükle:
    echo.
    python3 add_new_article.py
) else (
    REM Sürüklenen dosya varsa, önceden set et
    set "docx_file=%~1"
    
    REM Dosya DOCX ise işle
    if /i "!docx_file:~-5!"==".docx" (
        echo 📄 Dosya bulundu: !docx_file!
        echo.
        REM Python script'e yapacak şeyler var - interaktif mod
        python3 add_new_article.py "!docx_file!"
    ) else (
        echo ❌ Lütfen DOCX dosyası sürükle (.docx)
        pause
        exit /b 1
    )
)

pause
