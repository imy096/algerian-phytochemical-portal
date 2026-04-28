import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = PROJECT_ROOT / "public" / "assets" / "plant-images" / "raw"
OUT_FILE = PROJECT_ROOT / "public" / "assets" / "plant-images" / "manifest.json"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

def normalize_name(name: str) -> str:
    name = name.lower()
    name = re.sub(r"\.(jpg|jpeg|png|webp)$", "", name)
    name = re.sub(r"[_\-]+", " ", name)
    name = re.sub(r"\b(l|sp|spp|subsp|var)\b\.?", "", name)
    name = re.sub(r"[^a-z0-9 ]+", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name

def main():
    manifest = {}

    if not RAW_DIR.exists():
        print(f"Missing folder: {RAW_DIR}")
        return

    for folder in RAW_DIR.iterdir():
        if not folder.is_dir():
            continue

        images = [
            img for img in folder.iterdir()
            if img.is_file() and img.suffix.lower() in IMAGE_EXTS
        ]

        if not images:
            continue

        images = sorted(images, key=lambda p: p.name.lower())
        first_image = images[0]

        key = normalize_name(folder.name)
        url = f"/assets/plant-images/raw/{folder.name}/{first_image.name}"

        manifest[key] = url

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Created {OUT_FILE}")
    print(f"Images mapped: {len(manifest)}")

if __name__ == "__main__":
    main()