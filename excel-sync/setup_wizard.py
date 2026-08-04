#!/usr/bin/env python3
"""
Marder Ciftlik Excel Senkronizasyonu - Kurulum Sihirbazi.

Sorular sorarak config.json dosyasini otomatik olusturur, gerekli
kutuphaneleri kurar, isteniyorsa bir test calistirmasi yapar ve
Gorev Zamanlayici'ya gunluk otomatik calistirmayi ekler.

Calistirmak icin: kurulum.bat dosyasina cift tiklayin (ya da
"python setup_wizard.py").
"""

from __future__ import annotations

import getpass
import json
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "config.json"


def line():
    print("-" * 60)


def ask(prompt: str, default: str | None = None) -> str:
    suffix = f" [{default}]" if default else ""
    while True:
        value = input(f"{prompt}{suffix}: ").strip()
        if value:
            return value
        if default is not None:
            return default
        print("  (bos birakilamaz, tekrar deneyin)")


def ask_yes_no(prompt: str, default_yes: bool = True) -> bool:
    hint = "E/h" if default_yes else "e/H"
    while True:
        value = input(f"{prompt} ({hint}): ").strip().lower()
        if not value:
            return default_yes
        if value in ("e", "evet", "y", "yes"):
            return True
        if value in ("h", "hayir", "n", "no"):
            return False
        print("  Lutfen 'e' ya da 'h' yazin.")


def pick_excel_file() -> str:
    print()
    print("Excel dosyanizi secmek icin bir pencere acilacak...")
    try:
        import tkinter
        from tkinter import filedialog

        root = tkinter.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        path = filedialog.askopenfilename(
            title="Buzağı tedavileri Excel dosyasini secin",
            filetypes=[("Excel dosyalari", "*.xlsx"), ("Tum dosyalar", "*.*")],
        )
        root.destroy()
        if path:
            return path
        print("Hicbir dosya secilmedi.")
    except Exception as exc:  # noqa: BLE001
        print(f"(Dosya secme penceresi acilamadi: {exc})")
    return ask("Excel dosyasinin tam yolunu yazin (orn. C:\\Kullanicilar\\Ahmet\\...\\dosya.xlsx)")


def ensure_dependencies() -> None:
    try:
        import openpyxl  # noqa: F401
        import supabase  # noqa: F401

        print("Gerekli kutuphaneler zaten kurulu.")
        return
    except ImportError:
        pass

    print("Gerekli kutuphaneler kuruluyor (openpyxl, supabase)... Bu biraz surebilir.")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", str(SCRIPT_DIR / "requirements.txt")]
    )
    if result.returncode != 0:
        print()
        print("HATA: Kutuphaneler kurulamadi. Yukaridaki hatayi kontrol edin.")
        print("Elle denemek icin: pip install -r requirements.txt")
        sys.exit(1)
    print("Kutuphaneler kuruldu.")


def main() -> int:
    print("=" * 60)
    print("  MARDER CIFTLIK - Excel <-> Site Senkronizasyonu Kurulumu")
    print("=" * 60)
    print()
    print("Birkac soru soracagim, cevaplayin yeter. Istediginiz zaman")
    print("Ctrl+C ile durdurabilirsiniz, hicbir sey kaydedilmez.")
    print()

    line()
    print("ADIM 1/4 - Gerekli kutuphaneler")
    line()
    ensure_dependencies()

    print()
    line()
    print("ADIM 2/4 - Ayarlar")
    line()

    if CONFIG_PATH.exists():
        print(f"'{CONFIG_PATH.name}' zaten var.")
        if not ask_yes_no("Ustune yazip yeniden olusturmak ister misiniz?", default_yes=False):
            print("Mevcut ayarlar korundu. Sadece test/kurulum adimlarina geciliyor.")
            config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        else:
            config = _collect_config()
    else:
        config = _collect_config()

    print()
    print("Sunlar kaydedilecek:")
    print(f"  Excel dosyasi : {config['excel_path']}")
    print(f"  Supabase adresi: {config['supabase_url']}")
    print(f"  Senkron hesabi : {config['sync_email']}")
    print()
    if ask_yes_no("Dogru mu? Kaydedeyim mi?"):
        CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Kaydedildi: {CONFIG_PATH}")
    else:
        print("Iptal edildi, hicbir sey kaydedilmedi.")
        return 1

    print()
    line()
    print("ADIM 3/4 - Test calistirmasi")
    line()
    if ask_yes_no("Simdi bir DENEME calistirmasi yapmak ister misiniz? (hicbir sey degistirmez, sadece ne olacagini gosterir)"):
        config["dry_run"] = True
        CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
        print()
        subprocess.run([sys.executable, str(SCRIPT_DIR / "sync.py")])
        print()
        config["dry_run"] = False
        CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")
        print("(dry_run kapatildi, bir sonraki calistirma gercek olacak)")
        print()
        if ask_yes_no("Yukaridaki sonuc dogru gorunuyor mu? Simdi GERCEK bir calistirma yapayim mi?"):
            print()
            subprocess.run([sys.executable, str(SCRIPT_DIR / "sync.py")])

    print()
    line()
    print("ADIM 4/4 - Otomatik gunluk calistirma (07:00 / 19:00)")
    line()
    if ask_yes_no("Gorev Zamanlayici'ya gunde 2 kez otomatik calisacak sekilde eklensin mi?"):
        ps1 = SCRIPT_DIR / "install_task_scheduler.ps1"
        result = subprocess.run(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(ps1)]
        )
        if result.returncode != 0:
            print()
            print("Otomatik kurulum basarisiz oldu. README.md'deki 'elle kurulum'")
            print("adimlarini takip edebilirsiniz (Gorev Zamanlayici'yi elle acip).")

    print()
    line()
    print("Kurulum tamamlandi.")
    line()
    return 0


def _collect_config() -> dict:
    print("Simdi birkac bilgi soracagim.")
    excel_path = pick_excel_file()
    print()
    print("Supabase bilgileri icin: Supabase panelinizde")
    print("Project Settings -> API sayfasina gidin.")
    supabase_url = ask("Project URL (https://... .supabase.co)")
    supabase_anon_key = ask("anon public key (service_role DEGIL)")
    print()
    print("Az once Supabase'de olusturdugunuz senkronizasyon hesabinin bilgileri:")
    sync_email = ask("Senkron hesabinin e-postasi")
    sync_password = getpass.getpass("Senkron hesabinin sifresi (yazarken gorunmez): ")
    while not sync_password:
        print("  (bos birakilamaz)")
        sync_password = getpass.getpass("Senkron hesabinin sifresi: ")

    return {
        "excel_path": excel_path,
        "sheet_name": "BUZAĞI TEDAVİ 2025",
        "supabase_url": supabase_url,
        "supabase_anon_key": supabase_anon_key,
        "sync_email": sync_email,
        "sync_password": sync_password,
        "sync_window_days": 30,
        "dry_run": False,
    }


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print()
        print("Kurulum iptal edildi.")
        raise SystemExit(1)
