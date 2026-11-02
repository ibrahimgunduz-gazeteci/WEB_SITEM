# UNVERIFIED bağlantılar — v2.8

v2.7 denetiminden taşınan, bu turda yeniden sınıflandırılan haricî kayıtlar.
**Hiçbiri site içi navigasyonu bozmaz.** Bot koruması / üretim deploy eksikliği / ağ hatası nedeniyle içerik eşleşmesi kanıtlanamadı.

| # | URL | Neden | Not |
|---|---|---|---|
| 1 | `https://www.linkedin.com/in/askin-gunduz/` | HTTP 999 (LinkedIn bot koruması) | Geliştirici kredisi; profil bilinen |
| 2 | `https://ibrahimgunduz.com.tr/eng_article.html` | Canlı 404 | Branch henüz Pages’e yayınlanmadı |
| 3 | `https://ibrahimgunduz.com.tr/eng_media_landscape.html` | Canlı 404 | Aynı |
| 4 | `https://www.akakce.com/...o-soruyu-biz-sormayalim...` | HTTP 403 | Satıcı bot koruması; URL slug kitap adını içeriyor |
| 5 | `https://www.nadirkitap.com/...o-soruyu-biz-sormayalim...` | HTTP 403 | Aynı |
| 6 | `https://twitter.com/tag_var/status/1788868312752947345...` | Ağ/fetch hatası | Legacy makale gövdesindeki alıntı tweet; yerel arşiv ayrı |

## Bu turda ayrıca ele alınan BROKEN kaynak

| URL | HTTP | Yerel davranış |
|---|---|---|
| `kisadalga.net/.../bizim-ne-oldugumuz-belli-sayin-milletvekili-117352` | 410 | Bare URL kaldırıldı; “kaynak 410, yerel arşiv korunuyor” notu eklendi. Makale `haber.html` ile açılmaya devam eder. |
