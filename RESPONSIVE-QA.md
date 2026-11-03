# RESPONSIVE-QA — v2.6

**Motorlar:** Playwright Chromium + WebKit  
**Kanıt:** `tests/navigation/v26-results.json`, `SCREENSHOTS-2.6/`  
**Tarih:** 2026-11-01

Kontroller:

1. `document.documentElement.scrollWidth <= window.innerWidth`
2. Logo bounding box tamamen viewport içinde
3. (Satın alma) satıcı grid dengesi + koyu/açık kontrast

---

## Chromium — genişlik matrisi

| Genişlik | Hedef | index.html | o-soruyu…-satin-al.html | Not |
|---:|---|:---:|:---:|---|
| 320 | Küçük telefon | PASS | PASS | Hamburger; tek sütun satıcı |
| 360 | Android | PASS | PASS | |
| 375 | iPhone | PASS | PASS | |
| 390 | Modern iPhone | PASS | PASS | Screenshot: `*_390_*` |
| 414 | Büyük telefon | PASS | PASS | |
| 430 | Büyük iPhone | PASS | PASS | |
| 600 | Küçük tablet | PASS | PASS | |
| 768 | iPad dikey | PASS | PASS | Hamburger (≤1100) |
| 820 | iPad Air dikey | PASS | PASS | Screenshot: `*_820_*` |
| 834 | iPad Pro 11" dikey | PASS | PASS | |
| 1024 | iPad yatay | PASS | PASS | Screenshot: `*_1024_*` |
| 1180 | Geniş tablet yatay | PASS | PASS | |
| 1280 | Küçük dizüstü | PASS | PASS | Desktop nav (≥1101) |
| 1440 | Masaüstü | PASS | PASS | 2×2 satıcı grid |
| 1920 | Büyük monitör | PASS | PASS | |

**Özet:** 30/30 Chromium overflow+logo ölçümü geçti.

---

## WebKit emülasyonu (fiziksel cihaz değil)

| Etiket | Genişlik × Yükseklik | index | satin-al | Screenshot |
|---|---|:---:|:---:|---|
| iphone-ish | 390×844 | PASS | PASS | `webkit_iphone-ish_*` |
| ipad-portrait | 768×1024 | PASS | PASS | `webkit_ipad-portrait_*` |
| ipad-air | 820×1180 | PASS | PASS | `webkit_ipad-air_*` |
| ipad-landscape | 1024×768 | PASS | PASS | `webkit_ipad-landscape_*` |
| ipad-wide | 1180×820 | PASS | PASS | `webkit_ipad-wide_*` |

**Özet:** 10/10 WebKit overflow+logo ölçümü geçti.

---

## Tema × kritik kitap ekranları

| Sayfa | 1440 L/D | 1024 L/D | 820 L/D | 390 L/D | 320 L/D |
|---|:---:|:---:|:---:|:---:|:---:|
| o-soruyu…-satin-al | PASS/PASS | PASS/PASS | PASS/PASS | PASS/PASS | PASS/PASS |
| o-soruyu… (detay) | PASS/PASS | — | PASS (L) | PASS (D) | — |
| index | — | — | PASS (L) | PASS (L) | PASS (D) |

Görsel inceleme notları:

- 1440 koyu: 2×2 satıcı kartları, satıcı adları okunur, geri butonları outline.
- 390 koyu: tek sütun satıcı satırları, logo kesilmiyor, hamburger görünür.
- 320 koyu index: yatay taşma yok, logo + hamburger viewport içinde.

---

## Geri bağlantı tıklama testleri

Tüm kitap detay + satın alma sayfalarında gerçek tıklama:

| Sayfa | Kitaplarıma Dön | Tüm Kitaplara Dön | Hedef |
|---|:---:|:---:|---|
| o-soruyu…-satin-al | PASS | PASS | `index.html#books` + görünür `#books` |
| altin-olum-satin-al | PASS | PASS | aynı |
| altin-girdap-satin-al | PASS | PASS | aynı |
| coplerFacyasi-satin-al | PASS | PASS | aynı |
| 4× detay sayfası | — | PASS | aynı |

Header menü matrisi (`nav_test.mjs`): **82/82 PASS**.

---

## Header / hamburger

| Aralık | Davranış | Sonuç |
|---|---|---|
| ≤1100px | Hamburger + tema butonu | PASS |
| ≥1101px | Masaüstü yatay menü | PASS |
| Logo kırpılması | Bounding box kontrolü | PASS |

---

## Bilinen sınırlar

- WebKit sonuçları emülasyondur; fiziksel iPad/iPhone testi değildir.
- 200% zoom / artırılmış sistem fontu bu koşuda ayrı matris olarak koşturulmadı (mevcut refinement/a11y kuralları korunuyor).
- `_site/` kopyası bu QA kapsamı dışında.
