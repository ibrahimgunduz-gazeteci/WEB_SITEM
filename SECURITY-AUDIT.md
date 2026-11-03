# Güvenlik denetimi — v2.5

Kapsam: statik site, CLI, Worker, admin, Actions, YouTube sync.  
**Gerçek secret değerleri bu belgede yoktur.**

## Tehdit modeli (özet)

| Bileşen | Tehditler | Azaltmalar |
|---------|-----------|------------|
| GitHub Pages | XSS, açık yönlendirme, path traversal | Sanitizer, `noopener`, `file=` allowlist eşleşmesi |
| Haricî meta CLI/Worker | SSRF, XSS meta | HTTPS/SSRF guard, HTML strip, manuel fallback |
| Admin + OAuth | Yetki yükseltme, CSRF, open redirect | Allowlist login(+opsiyonel ID), CSRF, state cookie, redirect host allowlist |
| GitHub API yazma | Token sızıntısı, IDOR | Token yalnızca Worker secret; oturumsuz yazma yok |
| Actions | Supply-chain, aşırı izin | SHA pin, minimum permissions, concurrency |
| YouTube RSS | Veri kaybı | Hata → mevcut JSON korunur |

## Bulgular

### H-1 — OAuth `state` doğrulanmıyordu (YÜKSEK → düzeltildi)
- **Dosya:** `cloudflare-worker/src/index.js`
- **Risk:** CSRF OAuth
- **Düzeltme:** `ig_oauth_state` HttpOnly çerez + callback eşleşmesi
- **Doğrulama:** `test_security_v25.py::test_worker_oauth_state_and_redirect_guards`

### H-2 — Meta fetch otomatik redirect (YÜKSEK → azaltıldı)
- **Dosya:** Worker `fetchMeta`
- **Risk:** Redirect ile SSRF
- **Düzeltme:** `redirect: "manual"`, max 4 hop, her hedef `assertSafeFetchUrl`
- **Kalan:** Workers’ta DNS rebinding için OS-level bind yok → bilinçli sınır; başarısızsa manuel meta

### H-3 — Admin redirect open-ended (ORTA → düzeltildi)
- **Dosya:** Worker `safeAdminRedirect`
- **Risk:** `ADMIN_SUCCESS_URL` kötüye kullanımı
- **Düzeltme:** Host allowlist

### H-4 — `haber.html` innerHTML + title attr (YÜKSEK → düzeltildi)
- **Dosya:** `haber.html`, `assets/js/sanitize-html.js`
- **Risk:** Stored XSS (legacy HTML)
- **Düzeltme:** Allowlist sanitizer; `textContent` başlık; `file=` path traversal reddi
- **Doğrulama:** güvenlik unit testleri

### H-5 — Actions tag floating (ORTA → düzeltildi)
- **Dosya:** `.github/workflows/*.yml`
- **Risk:** Supply-chain
- **Düzeltme:** Actions commit SHA pin

### H-6 — Dolu buton kontrastı (ORTA → düzeltildi)
- **Dosya:** `refinement.css`
- **Risk:** Erişilebilirlik (WCAG AA)
- **Düzeltme:** CTA kırmızısı `#c0392b` (marka ailesi); audit 0 fail

### H-7 — Git geçmişi (ORTA — operasyonel) — v2.8’de HÂLÂ AÇIK
- **Bulgu:** Eski istemci YouTube API key / admin şifre ifadeleri geçmiş commit’lerde geçmiş olabilir.
- **v2.8:** Çalışma ağacında `AIza`/`ghp_` yok; `git log -S AIza` → 1 historical commit. Google Cloud erişimi olmadığı için **iptal doğrulanamadı**.
- **Not:** Dosyadan / geçmişten silmek anahtarı iptal etmez.
- **Aksiyon (kullanıcı):** Eski Google API key’i kısıtla/sil; varsa PAT rotasyonu.
- **Doğrulama:** Anahtar değeri raporlara yazılmaz; iptal edilene kadar bu madde tamamlanmış sayılmaz.

### H-8 — Canlı Worker/Pages E2E (BİLGİ)
- Secrets olmadan canlı yetki zinciri test edilmedi.
- Fail-closed: secrets yoksa OAuth 503.

## Secret / credential taraması

- Kaynak yüzey (py/js/html/yml/json/css): hardcoded `ghp_`, `github_pat_`, `AIza…`, private key, `ibrahim2024` **yok** (unit test).
- `gitleaks` kurulu değil → pattern + history spot-check yapıldı.
- `.gitignore`: `.env`, `*.pem`, `credentials.json` eklendi.

## Dependency

- Proje ağır npm runtime bağımlılığı taşımıyor (Playwright yalnızca yerel test).
- Actions: `python-docx` / `Pillow` process-documents’te — üretim admin yüzeyi değil.
- Kapsamlı SCA (npm audit / pip-audit) CI’ya eklenebilir; bu turda kritik CVE taraması ortamda otomatik koşturulmadı → **atlanmış / düşük öncelik**.

## Yetkilendirme matrisi (Worker)

| Endpoint | Auth | CSRF | Not |
|----------|------|------|-----|
| `/auth/login` | — | state | rate limit |
| `/auth/callback` | code+state | — | allowlist user |
| `/auth/me` | session | — | |
| `/auth/logout` | — | — | cookie clear |
| `/api/fetch-meta` | session | evet | SSRF |
| `/api/articles` GET/POST | session | POST evet | size limit |
| `/api/articles/upsert` | session | evet | |
| `/api/discovery-queue` | session | — | |
| `/api/health` | — | — | secret sızdırmaz |

## Test özeti

| Suite | Sonuç |
|-------|--------|
| Python unittest | 32 OK |
| Node article_utils | 5 OK |
| Contrast audit | 0 light / 0 dark fail |
| Playwright 320 overflow | ok (düzeltme sonrası) |

## Release gate

- Kritik kod açıkları (yerel): **kapalı / azaltılmış**
- Canlı OAuth/Pages doğrulama: **kullanıcı yapılandırması bekliyor**
- Sıfır güvenlik açığı garantisi: **yok** (bilinçli)
