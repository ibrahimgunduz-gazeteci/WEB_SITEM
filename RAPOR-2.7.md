# RAPOR 2.7 — Complete Link & Functional Audit

**Branch:** `feature/minimal-refresh`  
**Tarih:** 2026-11-01  
**Tasarım:** v2.6 onaylı görünüm korundu (CSS tasarım değişikliği yok)  
**Commit / push / PR / canlı:** yapılmadı

Ham veri: `LINK-AUDIT.json` · özet: `LINK-AUDIT.md` · yayın: `RELEASE-READINESS.md`

---

## 1–7. Bağlantı sayıları

| Metrik | Değer |
|---|---:|
| Envanter (occurrence) | 601 |
| Benzersiz href | 251 |
| Kontrol edilen kayıt | 402 |
| PASS (doğru) | 390 |
| FIXED (bu turda düzeltildi) | 5 |
| BROKEN | 1 |
| MISMATCH (yanlış içerik) | 0 |
| UNVERIFIED (erişim/bot/timeout) | 6 |

**BROKEN (1):** Haricî kaynak `https://kisadalga.net/yazar/bizim-ne-oldugumuz-belli-sayin-milletvekili-117352` → HTTP **410 Gone**. Yerel makale (`BİR MİLLETVEKİLİ 29.12.2024`) `haber.html` üzerinden hâlâ açılıyor; bozulan üçüncü taraf arşiv URL’sidir.

---

## 8. 72 makale

| Sonuç | Adet |
|---|---:|
| PASS | 72 |
| BROKEN | 0 |
| MISMATCH | 0 |

Her kayıt için: `haber.html?file=` tıklama/yükleme, başlık eşleşmesi, gövde doluluğu, thumbnail dosya varlığı doğrulandı.

---

## 9. Dört kitap

| Kitap | Ana sayfa kartı | Detay | Satın al | Yıl tutarlılığı | Galeati ürün |
|---|---|---|---|---|---|
| Altın Ölüm | PASS | PASS | PASS | 2020 | ürün URL |
| Altın Girdap | PASS | PASS | PASS | 2022 | — |
| O Soruyu Biz Sormayalım | PASS | PASS | PASS | 2022 | ürün URL |
| Çöpler Faciası | PASS | PASS | PASS | 2024 | ürün URL (**FIXED**) |

Satıcı gövde eşleşmesi: SPA/JS sitelerde ince gövde → `UNVERIFIED` (yanlışlıkla MISMATCH sayılmadı). URL/ISBN ipucu olanlar PASS.

---

## 10. YouTube

- `assets/videos.json`: **15/15** PASS (id ↔ url ↔ thumbnail)
- Sıralama: newest-first kontrol edildi
- Kanal URL’si (`/@İbrahimGündüz-Gazeteci`) kanal olarak sınıflandırıldı
- Canlı RSS sync modülü mevcut; bu turda secret’sız üretim sync’i çalıştırılmadı (sistem bozulmadı)

---

## 11. İngilizce PDF durumu

| İçerik | Durum |
|---|---|
| `assets/eng-documents/media-landscape.pdf` | **Repoda yok** (sahte PDF üretilmedi) |
| Eski yanlış eşleşme (`eng_article.html`) | **FIXED** → `eng_media_landscape.html` durum sayfası |
| “A View at Turkey's Evolving Democracy” | `eng_article.html` placeholder (başlık doğru; tam metin henüz yok) |

---

## 12. Responsive & navigasyon

- `nav_test.mjs`: **82/82 PASS**
- v2.7 navigation clicks + back-to-books: PASS
- Responsive 320–1920 light/dark + WebKit alt kümesi: PASS
- Tasarım regresyonu yok (v2.6 korunuyor)

---

## 13. Güvenlik regresyonu

`python3 -m unittest tests.test_security_v25` (+ design/content): **OK**

- XSS sanitizer, SSRF guard, OAuth state, Actions SHA pin, secret pattern tarama
- `rel="noopener noreferrer"` eksikleri tamamlandı (**FIXED**, güvenlik; tasarım değil)
- **Açık:** Eski Google API anahtarı iptali doğrulanamadı (`SECURITY-AUDIT.md` H-7)

Kritik/yüksek yeni açık bulunmadı → güvenlik nedeniyle `BLOCKED` değil.

---

## 14. Yayını engelleyen sorunlar

Yerel site için **kritik dahili kırık / yanlış içerik eşleşmesi yok**.

Bekleyenler (engelleyen değil, operasyonel):

1. Üretim Pages/DNS henüz bu branch ile doğrulanmadı  
2. API anahtarı iptali  
3. Worker/OAuth secret’ları  
4. İngilizce tam metin + media-landscape PDF yüklemesi  
5. Kısa Dalga 410 arşiv URL’si (yerel içerik sağlam)

---

## 15. Kullanıcının yapması gereken minimum işlemler

1. Eski YouTube/Google API anahtarını Google Cloud’da iptal et / kısıtla  
2. Cloudflare Worker secret’larını ve OAuth allowlist’i doğrula  
3. İsteyince: commit → PR → review → Pages publish (bu ajan yapmadı)  
4. İngilizce PDF/metin hazırsa `assets/eng-documents/` altına koyup JSON’u güncelle  
5. Canlıda bir kez duman testi (özellikle kitap satıcıları ve sosyal)

---

## Bu turda yapılan işlevsel düzeltmeler (tasarım yok)

1. 4× `facebook.com` placeholder → gerçek profil URL  
2. Çöpler Galeati anasayfa → ürün sayfası  
3. index Altın Ölüm yılı 2023 → 2020  
4. İngilizce PDF yanlış eşleşmesi → dürüst durum sayfası  
5. `target=_blank` → `rel="noopener noreferrer"`

## Otomasyon

- `tests/links/*.mjs` — tekrar kullanılabilir denetim  
- `.github/workflows/link-audit.yml` — haftalık, `contents: read`, artifact; **canlıda çalıştırılmadı**

## Yayın durumu

# READY WITH EXTERNAL CONFIGURATION PENDING

Gerçek üretim ortamı (canlı DNS / Pages / Worker) bu turda uçtan uca test edilmedi; yerel statik sunucu + Playwright doğrulaması yapıldı.
