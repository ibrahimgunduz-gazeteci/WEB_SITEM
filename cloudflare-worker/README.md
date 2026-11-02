# Yazı yönetim API’si (Cloudflare Worker) — kurulum

Bu Worker, GitHub Pages üzerindeki statik siteye **güvenli yazı ekleme** sağlar.  
Frontend’de GitHub token, OAuth secret veya `GITHUB_TOKEN` **yoktur**.

## Endpoint’ler

| Yol | Açıklama |
|-----|----------|
| `GET /auth/login` | GitHub OAuth başlat |
| `GET /auth/callback` | OAuth dönüş + HttpOnly oturum çerezi |
| `POST /auth/logout` | Oturumu kapat |
| `GET /auth/me` | Oturum + CSRF token |
| `POST /api/fetch-meta` | URL’den OG meta (CSRF + allowlist/SSRF koruması) |
| `GET /api/articles` | `external-articles.json` oku |
| `POST /api/articles` | Tüm listeyi güvenli biçimde yaz |
| `POST /api/articles/upsert` | Tek yazı ekle/güncelle |
| `GET /api/discovery-queue` | İnceleme kuyruğu |
| `GET /api/health` | Yapılandırma durumu (secret değerleri yok) |

## Sizin yapmanız gerekenler

1. Cloudflare’de Worker oluşturun (`wrangler deploy` veya Dashboard).
2. GitHub OAuth App: Callback `https://<worker>/auth/callback`.
3. Secrets (`wrangler secret put ...`):

```
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_TOKEN          # repo contents:write (fine-grained tercih)
ALLOWED_GITHUB_USERS  # örn. askingunduz
ALLOWED_GITHUB_IDS    # isteğe bağlı; sayısal GitHub user id (ek sıkılaştırma)
SESSION_SECRET        # uzun rastgele
REPO_OWNER
REPO_NAME
REPO_BRANCH           # genelde main
```

İsteğe bağlı varsayılanlar / env:

```
ALLOWED_ORIGINS=https://ibrahimgunduz.com.tr,http://127.0.0.1:8765
ADMIN_SUCCESS_URL=https://ibrahimgunduz.com.tr/admin/
```

OAuth `state` çerezi doğrulanır; admin redirect host allowlist ile sınırlıdır. Meta çekiminde yönlendirmeler manuel takip edilip her hop yeniden SSRF kontrolünden geçer.

4. `admin/` panelinde «API adresini ayarla» ile Worker URL’sini girin.
5. GitHub ile giriş → yazı ekle.

**Secrets kurulmadan panel yayın yapamaz** — bilinçlidir.

### Pages güncellemesi

`POST /api/articles` veya `upsert` başarılı olunca Worker:

1. `assets/external-articles.json` dosyasını GitHub Contents API ile yazar.
2. `deploy-pages.yml` için `workflow_dispatch` çağırır (PAT’ın push ile workflow tetiklememesi ihtimaline karşı).

`GITHUB_TOKEN` secret’ının fine-grained / classic PAT olarak `actions: write` (workflow tetikleme) + `contents: write` yetkisine ihtiyacı vardır. Yalnızca `contents: write` varsa içerik yine yazılır; manuel veya bir sonraki `main` push yayınını bekler.

Yerel CLI (Worker’sız):

```bash
python3 scripts/manage_articles.py add "https://..." --draft
python3 scripts/manage_articles.py publish <id>
```

## Güvenlik özeti

- OAuth allowlist (`ALLOWED_GITHUB_USERS`)
- HttpOnly + Secure oturum; POST’larda CSRF
- SSRF: özel IP / metadata host engeli
- XSS: HTML strip + alan uzunluk sınırları
- Rate limit (yumuşak, isolate içi)
- CORS allowlist
