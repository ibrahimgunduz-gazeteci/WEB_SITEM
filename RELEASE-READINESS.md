# RELEASE-READINESS — v2.7

**Karar:** `READY WITH EXTERNAL CONFIGURATION PENDING`

Tasarım (v2.6) kullanıcı onaylı ve bu turda değiştirilmedi.

---

## Ne hazır?

| Alan | Durum |
|---|---|
| Dahili navigasyon (header / hash / geri) | Hazır — Playwright gerçek tıklama |
| 72 legacy makale eşleşmesi | Hazır |
| 4 kitap kart ↔ detay ↔ satın al | Hazır |
| Satıcı URL’leri (içerik ipucu / UNVERIFIED ayrımı) | Hazır (bot koruması = UNVERIFIED) |
| YouTube arşivi (15) | Hazır |
| Responsive / tema regresyonu | Hazır |
| Güvenlik unit regresyonu | Hazır |
| Haftalık link audit workflow dosyası | Hazır (henüz Actions’ta koşturulmadı) |

## Ne bekliyor? (haricî / operasyonel)

| Madde | Sorumlu |
|---|---|
| GitHub Pages / DNS / CNAME canlı doğrulama | Kullanıcı |
| Worker OAuth secret + admin allowlist | Kullanıcı |
| Eski API anahtarı iptali | Kullanıcı |
| İngilizce PDF / tam metin yükleme | Kullanıcı (içerik) |
| Kısa Dalga 410 arşiv linki | Üçüncü taraf; yerel kopya çalışıyor |

## Ne engellemez?

- Canlı `ibrahimgunduz.com.tr` üzerinde henüz yayınlanmamış yeni HTML’lerin 404 vermesi (beklenen)
- Satıcı sitelerinin 403/CAPTCHA vermesi → `UNVERIFIED`
- Legacy makale gövdesindeki ölü haricî kaynak URL (yerel `haber.html` PASS)

## BLOCKED olurdu eğer…

- Dahili 404 / yanlış kitap-makale eşleşmesi
- Header/back link kırığı
- Kritik XSS/SSRF/secret regression

Bunlar bu turda **yok**.

## Kullanıcı checklist (minimum)

1. [ ] API anahtarı iptali  
2. [ ] Worker secrets  
3. [ ] Commit + PR + review (ajan yapmaz)  
4. [ ] Pages publish  
5. [ ] Canlı duman: ana sayfa, bir makale, bir kitap satın al, bir video  

## Test komutları (yerel)

```bash
python3 -m http.server 8765
node tests/links/run_audit.mjs http://127.0.0.1:8765
node scripts/nav_test.mjs http://127.0.0.1:8765
python3 -m unittest tests.test_security_v25 tests.test_design_guards tests.test_content_v24
```
