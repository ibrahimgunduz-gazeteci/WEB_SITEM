#!/usr/bin/env python3
"""
Resim Dosyası ASCII Düzeltici — BİR KEZ ÇALIŞTIRIN
====================================================
Sorun: macOS dosya adlarını NFD Unicode formatında saklar.
       GitHub Pages (Linux) NFC bekler → resimler yüklenemez.

Çözüm: Tüm Türkçe karakterli resim adlarını ASCII'ye çevirir,
        JSON'u günceller ve değişiklikleri GitHub'a gönderir.

Kullanım (Terminal'de repo kökünden):
    python3 scripts/fix_image_names.py
"""

import os, re, shutil, subprocess, unicodedata, json
from pathlib import Path

IMG_DIR   = Path("assets/images/articles")
JSON_PATH = Path("assets/yazilar.json")

TR = str.maketrans("ğĞüÜşŞıİöÖçÇ", "gGuUsSiIoOcC")

def to_ascii(name: str) -> str:
    name = unicodedata.normalize("NFC", name)
    name = name.translate(TR)
    name = name.encode("ascii", errors="ignore").decode("ascii")
    return re.sub(r"\s+", " ", name).strip()

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode, r.stdout.strip(), r.stderr.strip()

def main():
    if not IMG_DIR.exists():
        print("HATA: Bu scripti repo kökünden çalıştırın.")
        print(f"  Beklenen klasör: {IMG_DIR.absolute()}")
        return

    print("Resim dosyaları taranıyor...")

    # ── 1. Eski (Türkçe/NFD) dosyaları tespit et ──────────────────────
    rename_map = {}  # eski_ad → yeni_ascii_ad
    for fname in os.listdir(IMG_DIR):
        if fname.startswith("."):
            continue
        ascii_name = to_ascii(fname)
        if ascii_name != unicodedata.normalize("NFC", fname):
            rename_map[fname] = ascii_name

    if not rename_map:
        print("✅  Tüm resim adları zaten ASCII. Bir şey yapılmadı.")
        return

    print(f"Düzeltilecek dosya: {len(rename_map)}")

    # ── 2. Yeni ASCII dosyaları oluştur ───────────────────────────────
    created = 0
    for old, new in rename_map.items():
        src = IMG_DIR / old
        dst = IMG_DIR / new
        if not dst.exists():
            shutil.copy2(src, dst)
            created += 1
    print(f"ASCII kopyalar oluşturuldu: {created}")

    # ── 3. JSON'u güncelle ─────────────────────────────────────────────
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        text = f.read()

    updated = text
    for old, new in rename_map.items():
        updated = updated.replace(
            f"assets/images/articles/{old}",
            f"assets/images/articles/{new}"
        )

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        f.write(updated)
    print("JSON güncellendi.")

    # ── 4. Git: yeni dosyaları ekle, eskileri kaldır ─────────────────
    # Yeni ASCII dosyaları ekle
    run(["git", "add", str(IMG_DIR), str(JSON_PATH)])

    # Eski Türkçe adlı dosyaları git'ten kaldır
    removed = 0
    for old in rename_map:
        rc, _, _ = run(["git", "rm", "-f", "--ignore-unmatch",
                        str(IMG_DIR / old)])
        if rc == 0:
            removed += 1
    print(f"Eski dosyalar git'ten kaldırıldı: {removed}")

    # ── 5. Commit ──────────────────────────────────────────────────────
    rc, out, err = run([
        "git", "commit", "-m",
        "fix: resim adlari ASCII yapildi - GitHub Pages NFD/NFC sorunu giderildi"
    ])
    if rc == 0:
        print("Commit: ✓")
    elif "nothing to commit" in out + err:
        print("Commit: Değişiklik yok, zaten güncel.")
    else:
        print(f"Commit hatası: {err}")
        print("Lütfen Terminal'de 'git status' çalıştırın.")
        return

    # ── 6. Push ────────────────────────────────────────────────────────
    print("GitHub'a gönderiliyor...")
    rc, out, err = run(["git", "push"])
    if rc == 0:
        print("\n✅  Başarılı! Resimler artık canlı sitede görünecek.")
        print("   (GitHub Pages'in yayınlaması ~1 dakika sürer.)")
    else:
        print(f"\n❌  Push hatası: {err}")
        print("İnternet bağlantınızı kontrol edip 'git push' yazın.")

if __name__ == "__main__":
    main()
