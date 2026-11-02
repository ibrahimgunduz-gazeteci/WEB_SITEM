# LINK-AUDIT — v2.7

**Tarih:** 2026-11-01T10:14:08.796Z
**Base:** http://127.0.0.1:8765

## Özet

| Metrik | Değer |
|---|---:|
| Envanter (occurrence) | 601 |
| Benzersiz href | 251 |
| Kontrol edilen kayıt | 402 |
| PASS | 390 |
| FIXED | 5 |
| BROKEN | 1 |
| MISMATCH | 0 |
| UNVERIFIED | 6 |

## Bu turda düzeltilenler (FIXED)
- **facebook-placeholder-satin-al:** 4 satın alma sayfasındaki facebook.com ana sayfa placeholder’ı gerçek profil URL’siyle değiştirildi
- **galeati-copler-product:** Çöpler Faciası Galeati bağlantısı yayınevi anasayfasından ürün sayfasına alındı
- **altin-olum-index-year:** index.html Altın Ölüm yılı 2023 → 2020 (bibliyografik tutarlılık)
- **eng-pdf-honest-status:** Eksik media-landscape.pdf için yanlış eng_article eşleşmesi kaldırıldı; eng_media_landscape.html durum sayfası
- **noopener-rel:** target=_blank bağlantılara rel=noopener noreferrer eklendi

## 72 makale

Toplam: 72 · PASS: 72 · BROKEN: 0 · MISMATCH: 0

Tüm 72 makale `haber.html?file=...` üzerinden başlık/içerik eşleşmesiyle doğrulandı.

## Kitaplar

| Kitap | Durum | Not |
|---|---|---|
| Altın Ölüm | PASS | OK |
| Altın Girdap | PASS | OK |
| O Soruyu Biz Sormayalım | PASS | OK |
| Çöpler Faciası | PASS | OK |

## Videolar
Toplam 15, PASS 15, newestFirst=true

## İngilizce / PDF
- **A View at Turkey's Evolving Democracy** → `eng_article.html` · PASS · placeholder-acknowledged
- **The Changing Landscape of Media in Turkey** → `eng_media_landscape.html` · PASS · honest-unavailable-page

## Haricî (özet)
PASS 136 · UNVERIFIED 6 · BROKEN 1 · MISMATCH 0

| Durum | URL | Not |
|---|---|---|
| BROKEN | https://kisadalga.net/yazar/bizim-ne-oldugumuz-belli-sayin-milletvekili-117352 | http-410 |

## Navigasyon / responsive
Nav clicks: 24/24 PASS
Back links: 12/12 PASS
Responsive: 24/24 PASS
Engines: {"chromium":"PASS","webkit":"PASS"}

## SEO
robots sitemap ref: true
sitemap missing local files: yok
eng_media_landscape in sitemap: true

## Haricî kaynak BROKEN (yerel makale sağlam)

| URL | HTTP | Yerel makale |
|---|---|---|
| `https://kisadalga.net/yazar/bizim-ne-oldugumuz-belli-sayin-milletvekili-117352` | 410 | `BİR MİLLETVEKİLİ 29.12.2024` → `haber.html` PASS |

Bu kayıt yayın engeli sayılmadı; üçüncü taraf arşiv kaybı.

## SEO

- `robots.txt` sitemap referansı: var
- `sitemap.xml` yerel dosya eşleşmesi: tamam (`eng_media_landscape.html` eklendi)
- Canlı apex domain bu turda deploy edilmedi

## Yayın ipucu

`READY WITH EXTERNAL CONFIGURATION PENDING`

## Durum sınıfları
- PASS — doğrulandı
- FIXED — bu turda düzeltildi
- BROKEN — bozuk
- MISMATCH — açılıyor ama yanlış içerik
- UNVERIFIED — bot koruması / timeout / yetersiz kanıt

Ham JSON: `LINK-AUDIT.json`  
Rapor: `RAPOR-2.7.md` · `RELEASE-READINESS.md`