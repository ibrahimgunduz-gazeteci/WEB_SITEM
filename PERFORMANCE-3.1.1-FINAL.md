# PERFORMANCE 3.1.1 — FINAL

Tarih: 2026-11-07  
Kapsam: Makale içerik görsellerinin kurtarılması, Tüm Yazılar LCP, Videolar CLS, paket boyutu.

## Özet sonuçlar

| Metrik | Sonuç |
| --- | --- |
| Kurtarılan makale içerik görseli | **261 / 261** (benzersiz WebP) |
| Güncellenen makale (`htmlContent`) | **60** |
| Kalan 404 (içerik görselleri) | **0** |
| `assets/images/articles/` referansı | **0** |
| Yayın paketi (`_site`) | **35.8 MB** (620 MB’ye çıkmadı) |
| Makale / kitap / video sayısı | **75 / 4 / 15** |

## 1) Makale içerik görselleri

- v3.1 `prepare_pages_artifact.py` `assets/images/articles/` klasörünü paketten çıkarmıştı; `haber.html` hâlâ `htmlContent` üzerinden bu yolları yüklüyordu → canlıda kırık görseller.
- Kaynak dosyalardan birebir eşleşen optimize WebP’ler üretildi: `assets/images/article-body/` (261 dosya, ~28 MB).
- `yazilar.json` içindeki 261 `src` yolu `article-body` WebP’lerine güncellendi; orijinal fotoğraf sırası korundu (thumbnail ile rastgele değiştirme yok).
- Orijinal `assets/images/articles/` (805 dosya) repoda duruyor; Pages paketinde yok.
- `prepare_pages_artifact.py` artık `assets/images/article-body` kopyalıyor.
- Otomatik test: `tests/articles/content_images_404.mjs` (+ yerel Python doğrulama: 261/261 HTTP 200).
- “12 eşleşmeyen yol” iddiası bu turda yeniden tarandı: disk üzerinde eksik / eşleşmeyen içerik yolu **0**.

## 2) Tüm Yazılar hızı

Önceki (v3.1 sonrası regresyon ölçümü): mobil perf ~70, LCP ~12.3 s.

Yapılanlar:

- Kartlar kademeli render: ilk **12**, scroll / “Daha fazla” ile BATCH=12.
- Arama / sıralama tüm kümede çalışıyor; `?article=...` hedef kart görünene kadar dilim genişliyor.
- Liste için ince `assets/yazilar-cards.json` (~24 KB, `htmlContent` yok); `haber.html` tam `yazilar.json` kullanmaya devam ediyor.
- 3 MB `static/ibrahimgunduz.png` fallback → `static/ibrahimgunduz-480.webp`; büyük PNG paketten çıkarıldı.
- Odatv kart görseli yerelleştirildi: `assets/images/cards/odatv-birand-{400,800}.webp`.

### Yerel Lighthouse (mobile, simulate, 390×844)

| Sayfa | Perf | LCP | CLS |
| --- | ---: | ---: | ---: |
| `tum-yazilar.html` | **92** | **2.8 s** | **0** |
| `tum-videolar.html` | **93** | **2.8 s** | **0.001** |
| `index.html` | **91** | **3.0 s** | **0** |

## 3) Videolar CLS

- `.video-link .article-image` → sabit `aspect-ratio: 16/9`, `contain: layout paint`, img `position: absolute`.
- Playwright kutu ölçümü: thumbnail yüklenince boyut delta **0**.
- Lighthouse CLS **0.001** (hedef ≤ 0.1).
- Video sayısı: **15**.

## 4) Doğrulama

- İçerik görselleri HTTP 200: **261/261**
- Tarayıcı örneklem (20 makale, 85 img): kırık **0**
- `?article=8e9da426` deep-link: hedef kart görünür
- Progressive: ilk 12 kart + load-more → toplam **75**
- Responsive (320 / 390 / 820 / 1440): kritik taşma yok (320’de hafif scrollbar ölçümü not edildi; tasarım değiştirilmedi)
- Light/dark, admin OAuth / yayın yolları bu turda kod olarak korunuyor (admin Worker / Pages akışı aynı)

## 5) Canlı Lighthouse

Deploy sonrası ölçülür (push → `Deploy GitHub Pages`). Bu dosyadaki canlı satırları deploy tamamlanınca doldurulur / ayrı kontrol edilir:

| Sayfa | Perf | LCP | CLS | Not |
| --- | ---: | ---: | ---: | --- |
| Ana sayfa | — | — | — | deploy sonrası |
| Tüm Yazılar | — | — | — | deploy sonrası |
| Tüm Videolar | — | — | — | deploy sonrası |

## Paket disiplini

- Dahil: cards, article-body, books/profile optimized, yazilar + yazilar-cards, static (PNG profil hariç)
- Hariç: `assets/images/articles/` (orijinal), büyük `static/ibrahimgunduz.png`
