# İbrahim Gündüz — Kişisel web sitesi

Statik site (HTML/CSS/JS + yardımcı Python) · GitHub Pages · `ibrahimgunduz.com.tr`

## Özellikler (2.5)

- Koyu tema kontrast düzeltmeleri (kitap detay / satıcı kartları / CTA)
- Güvenlik sertleştirme (OAuth state, SSRF hop, HTML sanitizer, Actions SHA pin)
- Denetim: [RAPOR-2.5.md](RAPOR-2.5.md) · [SECURITY-AUDIT.md](SECURITY-AUDIT.md)

## Özellikler (2.4)

- Görünür tasarım rafinesi (`refinement.css` v2.3) + tutarlı header (**Videolarım** → `#videos`)
- Açık/koyu tema (`ig-theme`)
- YouTube: RSS → `assets/videos.json` (Actions, ~6 saatte bir; API anahtarı yok)
- Yazılar: 72 legacy arşiv + haricî linkler (`external-articles.json`)
- Yazı yönetimi: CLI + `admin/` panel (Worker OAuth; secrets sizin)
- SEO: `sitemap.xml`, `robots.txt`, temel meta / JSON-LD
- Pages: Actions deploy hazır — kaynak ayarı sizin  
- Canlıya geçiş: [YAYINA-GECIS-REHBERI.md](YAYINA-GECIS-REHBERI.md) · [RAPOR-2.4.md](RAPOR-2.4.md)

## Yerel önizleme

```bash
python3 -m http.server 8765
# http://127.0.0.1:8765/
```

## Sık kullanılan komutlar

```bash
python3 scripts/sync_youtube.py
python3 scripts/manage_articles.py add "https://..." --draft
python3 scripts/manage_articles.py list
python3 scripts/migrate_legacy_articles.py --backup
python3 scripts/discover_articles.py
python3 scripts/prepare_pages_artifact.py
python3 -m unittest discover -s tests -v
```

## Dokümanlar

- [RAPOR-FINAL.md](RAPOR-FINAL.md) — son teslim özeti
- [YOUTUBE-OTOMATIK-GUNCELLEME.md](YOUTUBE-OTOMATIK-GUNCELLEME.md)
- [YAZI-EKLEME-REHBERI.md](YAZI-EKLEME-REHBERI.md)
- [cloudflare-worker/README.md](cloudflare-worker/README.md)
- [TEKNIK-BORC-NOTU.md](TEKNIK-BORC-NOTU.md)

## Dal / yayın

Çalışma dalı: `feature/minimal-refresh`.  
Canlı: `main` + GitHub Pages. Bu ortamda commit/push/PR yapılmaz; siz onayladıktan sonra birleştirin.

**Bir kez (sizin):** Settings → Pages → Source = **GitHub Actions**.  
`YOUTUBE_SYNC_TOKEN` gerekmez.

Tasarım & kod: [@askingunduzz](https://www.linkedin.com/in/askin-gunduz/)
