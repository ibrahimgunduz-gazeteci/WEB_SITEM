# RELEASE-2.8 — Üretime geçiş hazırlığı

**Branch:** `feature/minimal-refresh`  
**Domain:** `ibrahimgunduz.com.tr`  
**Tarih:** 2026-11-01  

Bu ajan **main merge, canlı Pages deploy, DNS değişikliği ve canlı Worker publish yapmadı.**  
Tasarım (v2.6/v2.7) korundu.

---

## 1. Yerel geliştirme tamamlandı mı?

**Evet (kod + test + otomasyon dosyaları).**

- 410 Kısa Dalga bare URL → yerel arşiv notu (`sourceStatus: gone`)
- İngilizce PDF: kırık indirme yok; durum sayfası dürüst
- Pages / YouTube / belge workflow’ları hizalandı
- Worker: içerik yazımı sonrası `deploy-pages` `workflow_dispatch`
- Artifact paketi: CNAME + `.nojekyll` + gerekli asset’ler (~632 MB &lt; 950 MB soft limit)

## 2. GitHub Pages yayınına hazır mı?

**Kod tarafı: evet. Hesap ayarı: sizin bir kez onayınız şart.**

Hazır:

- `.github/workflows/deploy-pages.yml` — `main` push + `workflow_dispatch` + `workflow_call`
- `scripts/prepare_pages_artifact.py` — sadece yayın yüzeyi
- `CNAME` = `ibrahimgunduz.com.tr`
- Concurrency grubu `pages-deploy` (çakışan deploy iptali)

Sizin yapmanız gereken (bir kez):

1. Repo **Settings → Pages → Source = GitHub Actions**
2. `main`’e merge (onayınızla) veya Actions’tan **Deploy GitHub Pages → Run workflow**

## 3. YouTube otomasyonu hazır mı?

**Evet (yerel + Actions tanımı).**

| Madde | Durum |
|---|---|
| Kanal ID `UCzIAIU2njG3-av6aTEHSyjw` | RSS dry-run ile doğrulandı (15 öğe) |
| `videos.json` 15 video | Korundu; feed ile birleşince Yeni: 0 |
| Fixture testleri | Yeni video / arşiv koruma / bozuk XML / dedupe |
| Schedule | `0 */6 * * *` (≈6 saatte bir; RSS gecikmesi dakikalar–saatler olabilir) |
| Değişince Pages | `workflow_call` → `deploy-pages` (yalnızca `main`) |

## 4. Cloudflare Worker kurulabilir durumda mı?

**Kod: evet. Bu makinede oturum: hayır — canlı deploy yapılmadı.**

- `cloudflare-worker/` + `admin/` hazır
- Secrets listesi `cloudflare-worker/README.md` içinde
- Bu ortamda `wrangler whoami` → oturum yok / ağ-yenileme başarısız
- Canlı Worker yayımlamak için sizin Cloudflare + GitHub OAuth App kurulumunuz gerekir

## 5. Eksik hesap yetkileri (bu ortam)

| Araç | Durum |
|---|---|
| `gh` CLI | Token geçersiz (`gh auth refresh` / tarayıcı ile yeniden giriş) |
| Repo write / Actions / Pages ayarı | Bu ajan doğrulayamadı (Forbidden) |
| Wrangler / Cloudflare | Oturum yok — canlı Worker değiştirilmedi |
| Google Cloud (eski API key) | Erişim yok |

**Geniş PAT veya şifre istemiyoruz.** Resmî ekranlar:

```bash
gh auth login
npx wrangler login
```

## 6. Google API anahtarı iptal edildi mi?

**Hayır — doğrulanamadı → güvenlik görevi AÇIK.**

- Çalışma ağacında anahtar pattern’i: **yok** (kod kullanmıyor)
- Git geçmişinde `AIza` izi: **1 commit** (`initial commit`) — geçmişte silmek iptal değildir
- Google Cloud erişimi olmadığı için iptal işlemi yapılamadı
- Anahtar değeri hiçbir rapora yazılmadı

**Sizin iş:** Google Cloud Console → Credentials → ilgili anahtarı Restrict/Delete.

## 7. Geçen testler

| Test | Sonuç |
|---|---|
| `tests.test_sync_youtube` (+ yeni senaryolar) | OK |
| `tests.test_security_v25` | OK |
| `tests.test_design_guards` / `test_content_v24` | OK |
| `scripts/nav_test.mjs` | **82/82** |
| YouTube RSS dry-run | 15/15 eşleşme |
| `prepare_pages_artifact.py` | CNAME + boyut OK |

## 8. Henüz yapılamayan üretim testleri

- Canlı `ibrahimgunduz.com.tr` duman testi (branch yayınlanmadı)
- Gerçek Worker OAuth E2E
- Gerçek admin → GitHub → Pages zinciri
- Google anahtar iptalinin API ile teyidi
- Akakçe/Nadir 403 arkası ürün gövdesi (bot)

## 9. Geri alma planı

1. **Pages:** Actions → önceki başarılı **Deploy GitHub Pages** run → Re-run; veya `main`’i bilinen iyi commit’e revert + push  
2. **İçerik:** `assets/external-articles.json` / `videos.json` revert  
3. **Worker:** Wrangler’da önceki sürümü deploy; secrets aynı kalır  
4. **DNS:** Dokunulmadı; geri alma gerekmez  
5. Başarısız deploy, concurrency sayesinde yarım kalmış artifact’ı canlıya zorlamaz; bir önceki başarılı deployment Pages’te kalır (GitHub’ın deployment geçmişi)

## 10. Kullanıcının minimum işlemleri

Sıra önemli:

### A) Güvenlik (önce)

1. Google Cloud’da eski API anahtarını iptal/kısıtla  
2. `gh auth login` (geçersiz oturumu yenile)

### B) GitHub repo (bir kez)

3. **Settings → Pages → Source = GitHub Actions**  
4. Bu branch için PR açıp inceleyin; **sizin onayınızla** `main`’e merge  
5. Actions’ta `Deploy GitHub Pages` yeşil mi bakın  
6. `https://ibrahimgunduz.com.tr` duman: ana sayfa, bir makale, bir kitap, bir video

### C) YouTube (otomatik)

7. Merge sonrası `YouTube videolarını senkronize et` workflow’unun enabled olduğundan emin olun (manuel Run ile de test edilebilir)

### D) Admin panel (isteğe bağlı ama önerilir)

8. `npx wrangler login` → Worker deploy  
9. GitHub OAuth App (callback = `https://<worker>/auth/callback`, scope `read:user`)  
10. Secrets: `GITHUB_CLIENT_ID/SECRET`, `GITHUB_TOKEN` (**contents:write** + **actions:write**), `ALLOWED_GITHUB_USERS`, `SESSION_SECRET`, `REPO_*`  
11. `admin/` panelinde Worker URL’sini kaydedin → giriş → taslak/yayın dumanı

---

## Bu turda yapılan teknik işler (özet)

1. 410 kaynak URL’si yerel not ile değiştirildi  
2. `deploy-pages` / `sync-youtube` / `process-documents` hizalandı (`workflow_call`, `[skip ci]` kaldırıldı)  
3. Worker → Pages `workflow_dispatch`  
4. YouTube fixture senaryoları genişletildi  
5. UNVERIFIED listesi belgelendi  
6. Canlı servis **değiştirilmedi**

## Yayın durumu

**READY WITH EXTERNAL CONFIGURATION PENDING**

Yerel + Actions tanımları hazır. Eksik olan: sizin hesap yetkilendirmeleri, Pages Source ayarı, API key iptali ve **son yayın onayı (merge/deploy).**
