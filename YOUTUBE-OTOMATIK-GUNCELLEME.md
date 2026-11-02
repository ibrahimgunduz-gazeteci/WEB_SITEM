# YouTube otomatik güncelleme

## Ne olacak?

Kanalınıza herkese açık yeni video yüklediğinizde:

1. GitHub Action (~6 saatte bir veya elle) YouTube RSS’ini okur.
2. Yeni video `assets/videos.json` listesine eklenir; eskiler silinmez; aynı ID iki kez yazılmaz.
3. RSS geçici hata verirse mevcut JSON korunur.
4. Veri değiştiyse bot commit eder; dal `main` ise ve Pages kaynağı GitHub Actions ise **aynı workflow** siteyi yeniden yayımlar.
5. Ana sayfa ve Tüm Videolar sayfası bu listeyi gösterir.

API anahtarı tarayıcıda **yok**.  
**PAT (`YOUTUBE_SYNC_TOKEN`) zorunlu değildir** — kullanımdan çıkarıldı.

## Sizin bir kez yapmanız gereken ayar

Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**

Şu an canlı site hâlâ “Deploy from a branch / main” olabilir. Bu değişikliği **siz** yapmalısınız; agent yapmaz.

Bu ayar sonrası:

- `Deploy GitHub Pages` → normal `main` push ve manuel çalıştırma
- YouTube sync → yalnızca `videos.json` değişince Pages deploy (ortak concurrency: `pages-deploy`)
- CNAME `prepare_pages_artifact.py` ile pakete kopyalanır

## Elle senkron

```bash
python3 scripts/sync_youtube.py
python3 scripts/sync_youtube.py --dry-run
```

## Teknik

- Kanal ID: `UCzIAIU2njG3-av6aTEHSyjw`
- Script: `scripts/sync_youtube.py`
- Veri: `assets/videos.json`
- Frontend: `assets/js/youtube-feed.js`
- Workflow: `.github/workflows/sync-youtube.yml`
- Yayın paketi: `scripts/prepare_pages_artifact.py` → `_site/` (~630MB; docx/pdf hariç)
