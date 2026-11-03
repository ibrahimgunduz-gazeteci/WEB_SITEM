# Yazı ekleme rehberi

Eski 72 yazı (`yazilar.json` / `haber.html?file=...`) aynen duruyor.  
Yeni yöntem: **yayınlanan yazının bağlantısını eklemek** (tam metin kopyalanmaz).

## A) CLI (hemen çalışır)

```bash
python3 scripts/manage_articles.py add "https://kisadalga.net/...." --draft
python3 scripts/manage_articles.py list --status draft
python3 scripts/manage_articles.py update <ID> --title "Düzeltme"
python3 scripts/manage_articles.py publish <ID>
python3 scripts/manage_articles.py unpublish <ID>
```

Kayıt: `assets/external-articles.json` (kalıcı). Siteyle yayınlanınca kartlarda görünür.

## B) Web paneli (`admin/`)

Sekmeler: Genel Bakış · Yazılar · Yeni Yazı Ekle · Taslaklar · İnceleme Bekleyenler · Ayarlar

1. Worker API URL’sini ayarlayın  
2. GitHub ile giriş  
3. URL yapıştır → bilgileri çek → düzenle → Taslak / Yayımla  

**Cloudflare Worker secrets olmadan panel yayın yapamaz.** Kurulum: `cloudflare-worker/README.md` ve `YAYINA-GECIS-REHBERI.md`.

## Keşif kuyruğu

```bash
python3 scripts/discover_articles.py
```

Adaylar otomatik yayımlanmaz; panelden veya CLI ile onaylanır.

## Kart davranışı

Haricî yazılarda **Yazının Tamamını Oku** → orijinal yayıncı URL’si (`noopener`).
