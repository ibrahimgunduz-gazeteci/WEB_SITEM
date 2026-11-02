# Teslim raporu — v2.3 (görsel + navigasyon)

Dal: `feature/minimal-refresh`  
**Commit / push / PR / merge / canlı yayın yok.**

---

## 1. Önceki sürüm neden görsel olarak değişmemiş görünüyordu?

Kök nedenler (Playwright computed style + CSS denetimi):

1. **`main.css` içindeki `!important` yükseklik kilitleri** refinement kurallarını eziyordu:
   - `.article-image { height: 150px !important; }`
   - `.article-card { height: 320px !important; }`
   - `.articles-slider-wrapper .article-card { height: 360px !important; }`
   - `.book-cover { height: 280px !important; }`
2. Refinement değişiklikleri çoğunlukla gölge/radius inceliğiydi; tipografi hâlâ Helvetica/Arial kaldığı için ilk bakışta “aynı site” hissi veriyordu.
3. Cache-bust yoktu (`?v=` yok); bazı oturumlarda eski CSS kalabilirdi.
4. Birçok alt sayfa `main.css` / `main.js` taşımıyordu; refinement tek başına yeterli değildi.

Kanıt (1440 / açık tema):

| | `main` (before) | v2.3 (after) |
|---|---|---|
| Gövde fontu | sistem / Helvetica | **Source Sans 3** |
| Hero H1 | Helvetica | **Source Serif 4, 56px** |
| Kart radius | eski | **14px** |
| Kart görseli | ~150px kilit | **aspect-ratio 16/10 (~199px)** |
| refinement.css | yok | **200 + `?v=2.3`** |
| nav `border-top` | — | **0px** |

---

## 2. Tasarımda gerçekten ne değişti?

- Source Serif 4 (başlık) + Source Sans 3 (gövde)
- Daha ince cam efektli header, pill navigasyon, zarif aktif alt çizgi
- Hero: serif başlık, radial zemin, yumuşak fotoğraf çerçevesi (sert kırmızı offset yok)
- Modern içerik kartları, eşit görsel oranı, okunaklı başlık, “→” okuyan link
- Video 16:9 + sade play overlay; slider okları beyaz/nötr
- Kitap kapakları 3:4, hizalı aksiyonlar
- Hakkında satır aralığı + timeline kart yüzeyi
- Footer sosyal ikon hizası
- Koyu tema: lacivert yüzeyler, okunur metin, turuncu üst çizgi yok

Marka renkleri, bölüm sırası, gerçek fotoğraflar/kapaklar, 72 makale korundu.

---

## 3. Header navigasyonunda hangi hatalar vardı?

- Alt sayfalarda menü hedefleri tutarsızdı (`haber.html` → `#contact` yok; bir satın alma sayfasında `ibrahim-gunduz.html#timeline` 404).
- Kitap/haber sayfalarında **`</body></html>` eksik**ti; çakışan **inline mobil menü** `nav.style.display='block'` yazıyordu.
- Birçok sayfada **`main.js` yoktu**.
- `initializeSmoothScrolling` yalnızca `#hash` biliyordu; asıl sorun geç yüklenen yazı/video grid’inin **hash kaydırmasını bozmasıydı** (özellikle `#timeline`).
- Ana sayfa CTA/hash’leri ile alt sayfa `index.html#…` linkleri standart değildi.

---

## 4. Nasıl çözüldü?

- 13+ kök HTML’de tek tip menü:

  Ana Sayfa → `index.html`  
  Yazılar → `index.html#featured-articles`  
  Videolar → `index.html#videos`  
  Kitaplar → `index.html#books`  
  Hakkında → `index.html#about`  
  Kariyer → `index.html#timeline`

- Logo → `index.html`
- Tüm sayfalara `main.css` + `refinement.css?v=2.3` + `main.js?v=2.3`
- Inline mobil menü script’leri kaldırıldı
- `main.js`: aynı sayfa hash’te smooth scroll; **çapraz sayfada `preventDefault` yok**; hash landing + gecikmeli yeniden hizalama (MutationObserver / retry)
- `scroll-margin-top` / header offset

---

## 5–6. Test edilen sayfalar ve header sonuçları

Playwright: `node scripts/nav_test.mjs http://127.0.0.1:8765`

- 13 sayfa × 6 menü = **78** + altın ölüm Videolar matris (açık/koyu × mobil/masaüstü) = **82/82 PASS**
- Ekstra: logo, hash reload, back/forward, mobil yatay taşma → **PASS**
- Rapor: `tests/navigation/summary.md`, `tests/navigation/results.json`

Kritik örnek: `altin-olum.html` → Videolar → `index.html#videos`, bölüm görünür, header altında değil (açık/koyu, mobil/masaüstü).

Unit: `python3 -m unittest discover -s tests` → **16 OK**

---

## 7. Açık / koyu tema

- `ig-theme` localStorage + `theme-init.js` (FOUC azaltma)
- Screenshot’larda her iki tema da üretildi
- Nav üst turuncu çizgi: computed `borderTopWidth: 0px`

---

## 8. Ekran görüntüleri

`SCREENSHOTS-2.3/`

- `after/light|dark/` — home full (1440/1024/768/375/320), header/hero/articles/videos/books/about/timeline/footer, book-detail, tum-yazilar, `computed-1440.json`
- `before-main/light|dark/` — `main` dalı karşılaştırması (8766)

---

## 9. Kalan sorunlar

- Google Fonts CDN’e bağımlılık (yerel fallback Helvetica/Georgia var)
- `eng_article.html` İngilizce menü (bilinçli); Türkçe 6’lı matrise dahil edilmedi
- Canlı Pages hâlâ eski `main`; bu dal merge edilmeden görünmez
- Worker admin secrets hâlâ sizin kurulumunuz

---

## 10. Canlıya geçiş öncesi

1. Yerel `python3 -m http.server 8765` ile açık/koyu + bir kitap sayfasından Videolar
2. Bu dalı onaylayıp `main`’e merge (**siz**)
3. Pages Source = GitHub Actions (önceki 2.2 hazırlığı)
4. Canlı smoke: menü, tema, bir makale, bir video

---

## git status

```
## feature/minimal-refresh
 M altin-girdap-satin-al.html
 M altin-girdap.html
 M altin-olum-satin-al.html
 M altin-olum.html
 M assets/css/main.css
 M assets/js/articles.js
 M assets/js/main.js
 M assets/js/youtube-feed.js
 M copler-faciasi.html
 M coplerFacyasi-satin-al.html
 M haber.html
 M index.html
 M o-soruyu-biz-sormayalim-satin-al.html
 M o-soruyu-biz-sormayalim.html
 M tum-ingilizce-yazilar.html
 M tum-videolar.html
 M tum-yazilar.html
?? .github/workflows/deploy-pages.yml
?? .github/workflows/sync-youtube.yml
?? .gitignore
?? RAPOR-2.1.md
?? RAPOR-2.3.md
?? RAPOR-FINAL.md
?? README.md
?? SCREENSHOTS-2.3/
?? TEKNIK-BORC-NOTU.md
?? YAZI-EKLEME-REHBERI.md
?? YOUTUBE-OTOMATIK-GUNCELLEME.md
?? admin/
?? assets/css/refinement.css
?? assets/data/
?? assets/external-articles.json
?? assets/icons/
?? assets/js/theme-init.js
?? assets/js/theme-toggle.js
?? assets/videos.json
?? cloudflare-worker/
?? eng_article.html
?? robots.txt
?? screenshots/
?? scripts/article_meta.py
?? scripts/discover_articles.py
?? scripts/manage_articles.py
?? scripts/migrate_legacy_articles.py
?? scripts/nav_test.mjs
?? scripts/prepare_pages_artifact.py
?? scripts/screenshot_2_3.mjs
?? scripts/screenshot_suite.mjs
?? scripts/sync_youtube.py
?? sitemap.xml
?? tests/
```

Commit yapılmadı.
