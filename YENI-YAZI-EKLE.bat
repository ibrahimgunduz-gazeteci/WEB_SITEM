@echo off
chcp 65001 >nul
:: ================================================
:: İbrahim Gündüz Websitesi — Yeni Yazı Yükleyici
:: (Windows için — çift tıklayarak çalıştırın)
:: ================================================

cd /d "%~dp0"

cls
echo ============================================
echo   Ibrahim Gunduz Websitesi - Yazi Yukleyici
echo ============================================
echo.

:: Yeni dosya var mı kontrol et
git status --short assets/documents/ assets/eng-documents/ 2>nul | findstr /R "^?? ^ M ^A" >nul
if errorlevel 1 (
    echo [!] Yuklenecek yeni dosya bulunamadi.
    echo.
    echo Lutfen once yeni .docx dosyanizi su klasore koyun:
    echo   Turkce yazilar:   assets\documents\
    echo   Ingilizce yazilar: assets\eng-documents\
    echo.
    echo Sonra bu scripti tekrar calistirin.
    echo.
    pause
    exit /b 0
)

for /f %%i in ('git status --short assets/documents/ assets/eng-documents/ 2^>nul ^| find /c /v ""') do set COUNT=%%i
echo [OK] %COUNT% yeni dosya bulundu. Yukleniyor...
echo.

git add assets\documents\ assets\eng-documents\ 2>nul

:: Tarih damgalı commit mesajı
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set TARIH=%%a.%%b.%%c
git commit -m "Yeni yazi eklendi -- %TARIH%"

if errorlevel 1 (
    echo.
    echo [!] Hata olustu. Internet baglantisinizi
    echo     kontrol edip tekrar deneyin.
    echo.
    pause
    exit /b 1
)

echo.
echo Gonderiliyor...
git push

if errorlevel 1 (
    echo.
    echo ============================================
    echo   [!] Baglanti hatasi.
    echo   Internet baglantisinizi kontrol edip
    echo   tekrar deneyin.
    echo ============================================
) else (
    echo.
    echo ============================================
    echo   [OK] Basarili! Yazi siteye yuklendi.
    echo.
    echo   Yaklasik 1-2 dakika icinde sitede gorunur.
    echo ============================================
)

echo.
pause
