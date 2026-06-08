#!/usr/bin/env python3
"""
Download Poppins (headings) and Inter (body) fonts for Pillow slide rendering.
Run once: python backend/scripts/download_fonts.py
All fonts are OFL licensed — safe to commit to git.

Why Poppins not Outfit:
  Outfit only ships as a variable font (Outfit[wght].ttf). Pillow/FreeType cannot
  select a specific weight axis from a variable font — it always renders the default
  instance (regular weight). Poppins is geometrically near-identical to Outfit but
  ships static TTF files per weight. Use Poppins-ExtraBold for hero text.

Why Inter not DM Sans:
  DM Sans also only ships as a variable font in the Google Fonts GitHub repo.
  Inter ships static OTF files and is visually interchangeable with DM Sans.
"""
import io
import struct
import urllib.request
import zipfile
from pathlib import Path

FONTS_DIR = Path(__file__).parent.parent / "assets" / "fonts"
FONTS_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {"User-Agent": "Mozilla/5.0"}
GH_RAW = "https://raw.githubusercontent.com/google/fonts/main/ofl"

DIRECT = [
    ("Poppins-ExtraBold.ttf", f"{GH_RAW}/poppins/Poppins-ExtraBold.ttf"),
    ("Poppins-Bold.ttf",      f"{GH_RAW}/poppins/Poppins-Bold.ttf"),
]

INTER_ZIP = "https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip"
INTER_FILES = {
    "DMSans-Regular.ttf": "Inter-Regular.otf",
    "DMSans-Medium.ttf":  "Inter-Medium.otf",
}


def is_valid_font(data: bytes) -> bool:
    return len(data) > 4 and data[:4] in (b'\x00\x01\x00\x00', b'OTTO', b'true', b'typ1')


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


print("Downloading fonts to", FONTS_DIR)

for filename, url in DIRECT:
    dest = FONTS_DIR / filename
    if dest.exists():
        print(f"  SKIP {filename}")
        continue
    print(f"  GET  {filename} ...")
    data = fetch(url)
    if not is_valid_font(data):
        print(f"  FAIL {filename}: not a valid font (magic={data[:4].hex()})")
        continue
    dest.write_bytes(data)
    print(f"  OK   {filename}  ({len(data)//1024} KB)")

inter_needed = [n for n in INTER_FILES if not (FONTS_DIR / n).exists()]
if inter_needed:
    print(f"  GET  Inter-4.0.zip (for {inter_needed}) ...")
    data = fetch(INTER_ZIP)
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        names = z.namelist()
        for dest_name in inter_needed:
            inter_name = INTER_FILES[dest_name]
            matches = [n for n in names if n.endswith(inter_name)]
            if not matches:
                print(f"  WARN {inter_name} not in ZIP")
                continue
            font_data = z.read(matches[0])
            (FONTS_DIR / dest_name).write_bytes(font_data)
            print(f"  OK   {dest_name} (Inter, {len(font_data)//1024} KB)")
else:
    print("  SKIP Inter (already downloaded)")

print("\nResult:")
all_files = [f for f, _ in DIRECT] + list(INTER_FILES.keys())
for filename in all_files:
    p = FONTS_DIR / filename
    print(f"  {'OK' if p.exists() else 'MISSING':7} {filename}" + (f" ({p.stat().st_size//1024}KB)" if p.exists() else ""))

print("\nDone. Commit backend/assets/fonts/ to git (OFL license).")
