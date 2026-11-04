"""Regenerate reviewed derivatives; python -m pip install -r scripts/requirements-media.txt.

Usage: python scripts/prepare-exercise-media.py --originals <directory outside checkout>
Downloads pinned source URLs only when a reviewed original is missing. Verifies
original hashes before generating WebP files. Never changes exercise identity.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "web/public"
MANIFEST = PUBLIC / "images/exercises/manifest.json"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--originals", required=True, type=Path)
    args = parser.parse_args()
    originals = args.originals.resolve()
    if originals == ROOT or ROOT in originals.parents:
        parser.error("Keep originals outside the checkout")
    originals.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    catalog_file = ROOT / "api/data/exercises.json"
    catalog = json.loads(catalog_file.read_text(encoding="utf-8"))
    for entry in manifest["resources"]:
        original = entry["original"]
        source_file = originals / original["file"]
        if not source_file.exists():
            source_file.write_bytes(urlopen(original["url"], timeout=30).read())
        if sha256(source_file.read_bytes()) != original["sha256"]:
            raise ValueError(f"Source hash mismatch for {entry['id']}")
        image = ImageOps.exif_transpose(Image.open(source_file)).convert("RGB")
        if list(image.size) != [original["width"], original["height"]]:
            raise ValueError(f"Source dimensions changed for {entry['id']}")
        assets = {}
        for variant, width, quality in [("thumbnail", 192, 80), ("card", 640, 84), ("detail", 850, 90)]:
            copy = image.copy()
            copy.thumbnail((width, width), Image.Resampling.LANCZOS)  # Never crop or upscale.
            relative = f"images/exercises/{entry['id']}-{variant}.webp"
            destination = PUBLIC / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            copy.save(destination, "WEBP", quality=quality, method=6, exact=True)
            assets[variant] = {"url": f"/{relative}", "width": copy.width, "height": copy.height}
            entry["derivatives"][variant] = {
                **assets[variant], "bytes": destination.stat().st_size,
                "sha256": sha256(destination.read_bytes()), "quality": quality,
            }
        exercise = next(exercise for exercise in catalog if exercise["id"] == entry["id"])
        exercise["imageUrl"] = assets["detail"]["url"]
        exercise["images"] = assets
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    catalog_json = json.dumps(catalog, ensure_ascii=False, indent=2)
    # Preserve the existing compact tag arrays to keep the media diff reviewable.
    catalog_json = re.sub(r'"tags": \[[^\]]*\]',
        lambda match: '"tags": ' + json.dumps(json.loads(match.group()[8:]), ensure_ascii=False), catalog_json)
    catalog_file.write_text(catalog_json + "\n", encoding="utf-8", newline="\n")
    print(f"Prepared {len(manifest['resources'])} reviewed resources")


if __name__ == "__main__":
    main()
