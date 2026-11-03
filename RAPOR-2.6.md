# RAPOR 2.6 — UI, Responsive & Functional QA

**Branch:** `feature/minimal-refresh`  
**Tarih:** 2026-11-01  
**Commit / push / PR / canlı yayın:** yapılmadı (talimat gereği)

---

## 1. Kitap sayfalarında tasarım değişiklikleri

Ortak stil dosyası eklendi: `assets/css/books.css` (tüm detay + satın alma sayfalarında paylaşılıyor).

- Kapak alanı `minmax(200px, 320px)` ile dengelendi; aşırı boşluk azaltıldı.
- Başlık / meta / açıklama tipografisi ve boşlukları tutarlı hale getirildi.
- Sert kırmızı gölge / aşırı baskın CTA’lar kaldırıldı.
- Geri dönüş kontrolleri outline / secondary stile alındı (`book-back-link`).
- Detay sayfalarındaki çakışan inline CSS nötrleştirildi; layout `books.css` üzerinden yönetiliyor.

## 2. Satıcı kartlarının yeni yerleşimi

- Masaüstünde **2×2 simetrik grid** (`grid-template-columns: repeat(2, minmax(0, 1fr))`).
- 3+1 dengesiz yerleşim kaldırıldı.
- Kartlar kompakt; koyu temada `#1a2731` yüzey, açık temada beyaz yüzey.
- Satıcı adları (`Amazon.tr`, `Galeati Yayınevi`, `Akakçe`, `Nadir Kitap`) koyu temada `#f0f5f8` / kart başlığı ile yüksek kontrast.
- ≤600px: tek sütun, yatay satır kart (ikon + ad + buton).

## 3. Koyu tema kontrast sonuçları

Playwright computed-style ölçümü (`seller-card h4`, `purchase-link`):

- Açık + koyu temada satıcı metinleri **WCAG AA (≥4.5:1)** eşiğini geçti.
- Sonuç dosyası: `tests/navigation/v26-results.json` → `contrast[]` (tümü `ok: true`).

## 4. “Tüm Kitaplara Dön” 404 kök nedeni

- Hatalı hedef: `ibrahim-gunduz.html#books` (dosya yok).
- Doğru hedef: `index.html#books`.
- Asıl kaynak: `o-soruyu-biz-sormayalim-satin-al.html` içindeki üst/alt geri bağlantıları ve Kariyer menü öğesi.
- Projede HTML/JS/JSON taraması yapıldı; canlı kaynaklarda `ibrahim-gunduz.html` referansı kalmadı (yalnızca eski rapor metninde geçiyor).

## 5. Düzeltilen diğer kırık bağlantılar

| Önceki | Sonra |
|---|---|
| `ibrahim-gunduz.html#books` | `index.html#books` |
| `ibrahim-gunduz.html#timeline` | `index.html#timeline` |
| `assets/eng-documents/media-landscape.pdf` (404) | `eng_article.html` (PDF henüz yok; yer tutucu sayfa) |

13 HTML sayfasında dahili bağlantı denetimi: **kırık yok**.

## 6. Cihaz genişliklerinde test sonuçları

Chromium ile 15 genişlik × (index + satın alma) = 30 ölçüm:

`320, 360, 375, 390, 414, 430, 600, 768, 820, 834, 1024, 1180, 1280, 1440, 1920`

- `document.documentElement.scrollWidth <= window.innerWidth` → **geçti**
- Logo bounding box viewport içinde → **geçti**
- Hamburger menü ≤1100px’de açılıyor (iPad sıkışması giderildi)

Ayrıntı: `RESPONSIVE-QA.md`

## 7. iPhone / iPad WebKit sonuçları

Playwright **WebKit emülasyonu** (fiziksel cihaz değil):

| Etiket | Genişlik | Sonuç |
|---|---|---|
| iphone-ish | 390 | overflow + logo OK |
| ipad-portrait | 768 | OK |
| ipad-air | 820 | OK |
| ipad-landscape | 1024 | OK |
| ipad-wide | 1180 | OK |

Ekran görüntüleri: `SCREENSHOTS-2.6/webkit_*.png`

## 8. Mobil yatay taşma

- Kök neden: tablet genişliklerinde masaüstü menünün logo ile sıkışması + eski `body { min-width: 320px }` zorlaması.
- Çözüm: hamburger eşiği **1100px**, logo flex düzeni, `min-width` kaldırıldı (yalnızca `overflow-x: hidden` ile gizleme yapılmadı).
- 40 overflow ölçümünün tamamı geçti.

## 9. Ekran görüntüsü yolları

Klasör: `SCREENSHOTS-2.6/`

Kritik örnekler:

- `o-soruyu-biz-sormayalim-satin-al_1440_light.png` / `_dark.png`
- `o-soruyu-biz-sormayalim-satin-al_1024_*`, `_820_*`, `_390_*`, `_320_*`
- `o-soruyu-biz-sormayalim_1440_light.png` / `_dark.png`
- `index_820_light.png`, `index_390_light.png`, `index_320_dark.png`
- WebKit: `webkit_iphone-ish_*`, `webkit_ipad-*`

## 10. Güvenlik regresyon sonuçları

`python3 -m unittest tests.test_security_v25` → **7/7 OK**

- Hardcoded secret yok
- SSRF / javascript: URL reddi korunuyor
- Haber sanitizer + textContent
- Worker OAuth state / redirect guard
- Workflow SHA pin
- `.gitignore` env kapsaması

v2.5 güvenlik yüzeyine dokunulmadı (yalnızca UI/CSS/bağlantı/responsive).

**Açık güvenlik maddesi:** Eski git geçmişindeki API anahtarının iptali bu ortamdan doğrulanamadı → canlıya geçiş öncesi manuel iptal kontrolü gerekir.

## 11. İçerik tutarlılığı (yıllar)

Doğrulanan kaynaklar (TBMM / kitapçılar / Galeati):

| Kitap | Önceki hata | Düzeltilen değer |
|---|---|---|
| O Soruyu Biz Sormayalım | Detay: 2018 / Destek / 248 | **2022 / Galeati / 672** |
| Altın Ölüm | Detay: 2023 / Kırmızı Kedi / 264; satin: 2023 | **2020 / Galeati / 384** (ilk baskı) |
| Altın Girdap | Detay: 2020 / Everest / 312 | **2022 / Galeati / 368** |
| Çöpler Faciası | 2024 / Galeati | Değiştirilmedi (sayfa tutarlı; bağımsız bibliyografik çapraz doğrulama bu turda yapılmadı) |

## 12. Kalan açık sorunlar

1. Eski git geçmişindeki API anahtarının iptal durumu doğrulanamadı.
2. İngilizce “media landscape” PDF dosyası fiziksel olarak yok; geçici olarak `eng_article.html`e yönlendirildi.
3. `_site/` derleme kopyası güncellenmedi (yerel artifact; kaynak HTML düzeltildi).
4. WebKit sonuçları emülasyondur; gerçek fiziksel iPad/iPhone doğrulaması yapılmadı.

## 13. Canlıya geçiş hazırlık durumu

| Alan | Durum |
|---|---|
| Kitap UI / satıcı grid | Hazır |
| 404 / geri bağlantılar | Hazır (Playwright tıklama ile doğrulandı) |
| Responsive 320–1920 | Hazır |
| Açık/koyu kontrast (kitap sayfaları) | Hazır |
| Güvenlik regresyon (otomatik) | Hazır |
| Secret iptali (manuel) | **Açık** |
| Commit / PR / DNS / Pages publish | **Yapılmadı** (bilinçli) |

**Karar:** Yerel olarak **GO aday**, ancak canlı yayın için secret iptali + kullanıcı onayı + commit/PR süreci gerekli. Bu turda yayın yapılmamalıdır.

---

## Çalıştırılan kanıtlar

```text
node scripts/qa_v26.mjs http://127.0.0.1:8765
→ ok: true, failures: 0, shots: 27

node scripts/nav_test.mjs http://127.0.0.1:8765
→ exit 0

python3 -m unittest tests.test_security_v25 tests.test_design_guards tests.test_content_v24
→ OK
```
