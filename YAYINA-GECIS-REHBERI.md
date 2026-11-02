# Canlıya geçiş rehberi (basit adımlar)

Bu rehber, teknik olmayan birinin de uygulayabileceği şekilde yazıldı.  
Kod tarafı `feature/minimal-refresh` dalında hazırdır. **Bu agent commit / merge / canlı ayar yapmaz.**

---

## A. GitHub Pages

### 1) Branch’i onaylayın
1. GitHub’da repoyu açın.
2. `feature/minimal-refresh` dalına bakın (veya bilgisayarınızda yerelde kontrol edin: `python3 -m http.server 8765`).
3. Ana sayfa, Videolarım, bir kitap sayfası, bir eski makale (`haber.html?file=...`) çalışıyorsa devam edin.

### 2) Güvenli birleştirme (merge)
1. Pull Request açın: `feature/minimal-refresh` → `main` (**siz**).
2. Değişiklikleri gözden geçirin.
3. Merge edin. Force-push / hard reset kullanmayın.

### 3) Pages kaynağını Actions yapın (bir kez)
1. Repo → **Settings → Pages**
2. **Build and deployment → Source** = **GitHub Actions**
3. Kaydedin.  
   (Şu an “Deploy from a branch / main” ise otomatik bot güncellemeleri kaçabilir.)

### 4) Deploy’u başlatın
1. **Actions** sekmesi → **Deploy GitHub Pages**
2. **Run workflow** (manuel) veya `main`’e push sonrası otomatik çalışır.
3. Yeşil tik gelince siteyi açın: `https://ibrahimgunduz.com.tr`

### 5) Kontrol listesi
- [ ] Ana sayfa açılıyor
- [ ] Açık / koyu tema
- [ ] Videolarım bölümü + menü
- [ ] Eski bir yazı linki
- [ ] Bir kitap / satın al sayfası
- [ ] Favicon / özel alan adı (CNAME aynı kalmalı)

### 6) Sorun olursa geri dönüş
1. Actions’taki son başarılı deploy’a bakın.
2. Gerekirse önceki `main` commit’ine geri dönüp yeniden deploy edin (ekibinizle).
3. DNS / Turhost / CNAME’e dokunmayın; sorun çoğunlukla Pages kaynağı veya merge’dedir.

---

## B. YouTube

### 1) Kanal kimliği
Kodda kanal: `UCzIAIU2njG3-av6aTEHSyjw`  
Yanlışsa `scripts/sync_youtube.py` ve dokümana bakın.

### 2) Senkronizasyonu başlatın
1. Actions → **YouTube videolarını senkronize et**
2. **Run workflow**
3. `assets/videos.json` güncellenir; değişiklik varsa bot commit eder.
4. Pages kaynağı Actions ise aynı iş akışı (veya sonraki deploy) siteyi yeniler.  
   **PAT (`YOUTUBE_SYNC_TOKEN`) gerekmez.**

### 3) Doğrulama
1. Yeni herkese açık video yükleyin (veya mevcut listeyi kontrol edin).
2. Sync bitince ana sayfa **Videolarım** ve `tum-videolar.html` en yeni videoyu göstersin.
3. Zamanlama: yaklaşık 6 saatte bir.

### 4) Not
Pages Source hâlâ “branch” ise bot commit’i canlıyı yenilemeyebilir. Önce A.3’ü yapın.

---

## C. Yazı yönetimi

İki yol vardır:

### C1) Kolay yol — bilgisayar (CLI)
Worker kurmadan yazı ekler:

```bash
cd /path/to/IbrahimGunduz
python3 scripts/manage_articles.py add "https://kisadalga.net/...." --draft
python3 scripts/manage_articles.py publish <ID>
```

Dosya: `assets/external-articles.json` → siteyle birlikte yayınlanır.

### C2) Web paneli — Cloudflare Worker (önerilen uzun vadeli)

#### Dış hesap işlemleri (zorunlu)
1. **Cloudflare** hesabı + Worker deploy (`cloudflare-worker/`)
2. **GitHub OAuth App** (Callback: `https://<worker>/auth/callback`)
3. **GitHub token** (repo’ya `contents:write`)
4. Worker secrets (değerleri koda yazmayın):

| Secret | Ne için |
|--------|---------|
| `GITHUB_CLIENT_ID` | OAuth |
| `GITHUB_CLIENT_SECRET` | OAuth |
| `GITHUB_TOKEN` | JSON dosyasına yazma |
| `ALLOWED_GITHUB_USERS` | Yetkili GitHub kullanıcı adları |
| `SESSION_SECRET` | Oturum imzası |
| `REPO_OWNER` / `REPO_NAME` / `REPO_BRANCH` | Hedef repo |

Ayrıntı: `cloudflare-worker/README.md`

#### Panelde ilk yazı
1. `https://ibrahimgunduz.com.tr/admin/` (veya yerel `/admin/`)
2. API adresini Worker URL yapın
3. GitHub ile giriş
4. **Yeni Yazı Ekle** → URL yapıştır → Bilgileri çek → düzenle → Yayımla
5. Ana sayfa / Tüm Yazılar’da kartı kontrol edin (“Yazının Tamamını Oku” kaynak siteyi açmalı)

#### Keşif kuyruğu
```bash
python3 scripts/discover_articles.py
```
Adaylar **İnceleme Bekleyenler**’e düşer; otomatik yayım **yok**.

---

## Kısa özet sıra

1. Yerelde kontrol  
2. PR merge → `main`  
3. Pages Source = GitHub Actions  
4. Deploy + YouTube sync birer kez  
5. (İsteğe bağlı) Worker + OAuth + admin paneli  
6. Eski istemci YouTube API anahtarını Google’da temizleyin  
