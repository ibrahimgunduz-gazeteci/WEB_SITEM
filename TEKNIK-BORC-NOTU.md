# Teknik borç notu (2.2 final sonrası)

## Giderilenler

- İstemci admin şifresi (`ibrahim2024`) ve Ctrl+Shift+A paneli kaldırıldı
- localStorage newsletter / EmailJS istemci akışı kaldırıldı
- YouTube Data API anahtarı istemciden çıkarıldı; RSS + `videos.json`
- Koyu tema navigasyon üstündeki turuncu/kırmızı çizgi kökten kaldırıldı
- `eng_article.html` kırık bağlantısı giderildi
- Pages için Actions deploy + YouTube sync PAT’siz tasarım (`YOUTUBE_SYNC_TOKEN` gerekmez)
- Görsel refinement + Playwright ekran seti (`screenshots/after/`)

## Bekleyen / sizin kurulumunuz gerekenler

1. GitHub Pages **Source = GitHub Actions** (bir kez)
2. Cloudflare Worker secrets + OAuth — web `admin/` yayını için zorunlu
3. Eski Google API anahtarını kısıtlayın/silin
4. `legacy-url-suggestions.json` elle onay
5. Discovery kuyruğu yazar doğrulaması
6. Onay sonrası `feature/minimal-refresh` → `main` merge (agent yapmaz)

## Bilinçli korunmuşlar

- `assets/yazilar.json` ve 72 legacy makale / `haber.html?file=`
- DOCX workflow (`process-documents.yml`)
- Kitap görselleri ve satın alma sayfaları
- Repo içi büyük medya (bu turda silinmedi)
