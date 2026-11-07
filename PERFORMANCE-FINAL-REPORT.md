# PERFORMANCE FINAL REPORT — İbrahim Gündüz v3.1

Tarih: 2026-11-07  
Canlı: https://ibrahimgunduz.com.tr

Bu görev yeniden tasarım değildir. Görünüm ve işlev korunarak performans / paket boyutu iyileştirildi.

## 1. Önce / sonra (Ana sayfa — Lighthouse laboratuvar)

Ölçüm aracı: Lighthouse 13.6 (headless Chromium).  
**INP:** Gerçek kullanıcı RUM verisi yok; laboratuvar TBT raporlandı (INP olarak sunulmadı).

| Metrik | Önce (canlı) | Sonra (yerel `_site` paketi) | Değişim |
|---|---|---|---|
| Mobile Performance | 67 | 93 | +26 |
| Desktop Performance | 80 | 96 | +16 |
| Mobile LCP | 21631 ms | 2882 ms | −18749 ms |
| Desktop LCP | 3597 ms | 1361 ms | −2236 ms |
| Mobile CLS | 0 | 0 | — |
| Desktop CLS | 0.004 | 0.001 | iyileşti |
| Mobile TBT | 1 ms | 22 ms | ≈aynı (düşük) |
| Desktop TBT | 0 ms | 4 ms | ≈aynı |
| Mobile FCP | 2076 ms | 2147 ms | ≈aynı |
| Mobile Speed Index | 6340 ms | 2147 ms | −4193 ms |
| Ana sayfa transfer | ~8.9 MB | ~5.1 MB | ≈−3.8 MB |
| Pages yayın paketi (`_site`) | ~620+ MB (articles dahil) | **10.9 MB** | ≈−610 MB |
| Kart thumbnail toplamı (referans) | ~54 MB | ~1.2 MB (400w WebP) | ≈−53 MB |
| Repo görsel deposu (articles orijinal) | ~622 MB | ~622 MB (korundu, pakete alınmıyor) | — |

Erişilebilirlik / Best Practices / SEO (ana sayfa sonra): 85 / 100 / 100 (önceyle aynı bant).

### Diğer sayfalar (sonra, mobil laboratuvar — `_site`)

| Sayfa | Perf | LCP | CLS | Transfer |
|---|---|---|---|---|
| Tüm Yazılar | 70 | 12.3 s | 0 | ~4.8 MB |
| Tüm Videolar | 67 | 3.9 s | 0.379* | ~0.84 MB |
| Kitap detay (Altın Ölüm) | 93 | 2.6 s | 0 | ~0.88 MB |
| Haber detay | 75 | 6.1 s | 0 | ~1.2 MB |

\*Videolar sayfasındaki CLS büyük ölçüde YouTube thumbnail’lerinin asenkron yüklenmesinden; iframe otomatik oynatma yok.

## 2. Ne optimize edildi?

### Görseller
- 60 makale kartı thumbnail → `assets/images/cards/*-400.webp` + `*-800.webp` (`srcset` / `sizes`).
- Hero profil: 5472×3648 / ~3.0 MB PNG → 480/960 WebP (~9–25 KB) + JPG fallback (~42 KB); `preload` + `fetchpriority=high`.
- Hakkında görseli → WebP 480.
- 4 kitap kapağı → `assets/images/books/optimized/*.webp`.
- Statik fallback → `static/ibrahimgunduz-480.webp`.
- **Orijinaller silinmedi:** `assets/images/articles/` ve büyük profil PNG’ler repoda kaldı.
- **Pages paketi:** `prepare_pages_artifact.py` artık `assets/images/articles` ve ağır profil orijinallerini `_site` dışına bırakıyor; kart/kitap/optimize profil servis ediliyor.

### CSS / JS / font
- Ana CSS sürüm bump (`v=3.1`); tasarım kuralları değiştirilmedi.
- `articles.js` / `youtube-feed.js` / `main.js` → `defer`.
- Font Awesome: `preconnect` + `media="print" onload` ile render-blocking azaltıldı.
- Kartlarda width/height + `decoding="async"` + lazy (hero hariç).

### Korunan işlevler
- 74 arşiv + 1 haricî (Odatv `8e9da426`) = 75 makale kartı yolu.
- 4 kitap, 15 video.
- Sıralama (`sitePublishedAt`), arama, `?article=` derin link, Devamını Oku CTA.
- Worker admin / OAuth / publish akışı değiştirilmedi (`/api/health` oauth+write OK).
- YouTube RSS birleştirme birim testleri geçti.

## 3. Değişen dosyalar (özet)

- `assets/yazilar.json` — thumbnail → cards WebP + `thumbnail2x`
- `assets/js/articles.js` — srcset / decoding
- `assets/js/youtube-feed.js` — lazy/decoding/fallback
- `index.html`, `tum-yazilar.html`, `tum-videolar.html` — preload/defer/webp yolları
- `assets/images/cards/**`, `assets/images/profile/optimized/**`, `assets/images/books/optimized/**`, `static/ibrahimgunduz-480.webp`
- `scripts/prepare_pages_artifact.py` — ince yayın paketi
- `PERFORMANCE-FINAL-REPORT.md` (bu dosya)

## 4. Testler

| Test | Sonuç |
|---|---|
| `tests/test_security_v25.py` | OK (7) |
| `tests/test_content_v24.py` | OK |
| `tests/test_sync_youtube.py` | OK (8) |
| `tests/test_design_guards.py` | OK (7) |
| `_site` içerik sayıları | 74 + `8e9da426` + 15 video |
| Lighthouse önce/sonra ana sayfa | Kaydedildi (`/tmp/ig-lh-before`, `/tmp/ig-lh-after`) |
| Playwright genişlik matrisi | Canlı deploy sonrası tekrarlanacak |

## 5. Tasarım korundu mu?

Evet. Kart düzeni, renkler, spacing ve CTA metni (“Devamını Oku”) aynı; yalnızca görsel kaynakları ve yükleme stratejisi değişti. Light/dark CSS değişkenleri dokunulmadı.

## 6. Kalan / bilinen sınırlar

- Tüm Yazılar’da 75 kart aynı anda DOM’da; mobil LCP hâlâ göreli yüksek (haricî Odatv görseli + çoklu kart). İleride sanal kaydırma / sayfalama ayrı iş olabilir.
- Videolar CLS (YouTube CDN thumb) laboratuvarda yüksek çıkabiliyor; otomatik iframe yok.
- Gerçek iPhone/iPad cihaz testi yapılmadı (Playwright emülasyon / WebKit laboratuvar).
- Canlı Lighthouse “sonra” ölçümü deploy sonrası tekrarlanmalı (CDN gecikmesi).

## 7. Yayın notu

- Commit: `2bd885f` — Pages deploy **success** (`42393181031`).
- DNS / Worker secrets değiştirilmedi.
- Canlıda WebP kart yolları ve hero `ibrahimgunduz-480.webp` doğrulandı; Odatv `8e9da426` + 15 video korundu.
