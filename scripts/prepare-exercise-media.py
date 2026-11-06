"""Regenerate reviewed derivatives; python -m pip install -r scripts/requirements-media.txt.

Usage: python scripts/prepare-exercise-media.py --originals <directory outside checkout>
Downloads pinned source URLs only when a reviewed original is missing. Verifies
original hashes before generating WebP files. Never changes exercise identity.
"""
import argparse
import hashlib
import html
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
        for variant, width, quality, budget in [("thumbnail", 192, 80, 100000), ("card", 640, 84, 180000), ("detail", 1600, 90, 350000)]:
            if variant == "detail":
                width = min(width, entry.get("detailMaxWidth", width))
            copy = image.copy()
            copy.thumbnail((width, width), Image.Resampling.LANCZOS)  # Never crop or upscale.
            relative = f"images/exercises/{entry['id']}-{variant}.webp"
            destination = PUBLIC / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            while True:
                copy.save(destination, "WEBP", quality=quality, method=6, exact=True)
                if destination.stat().st_size <= budget:
                    break
                quality -= 5
                if quality < 60:
                    raise ValueError(f"Image budget exceeded for {entry['id']} {variant}")
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
    credits = []
    for entry in manifest["resources"]:
        exercise = next(exercise for exercise in catalog if exercise["id"] == entry["id"])
        esc = html.escape
        credits.append(f'''<li><h2>{esc(exercise['name'])}</h2>
<p>{esc(entry['author'] or 'Autor no indicado por la fuente')} · <a href="{esc(entry['sourcePage'], quote=True)}">Fuente original</a> ·
<a href="{esc(entry['licenseUrl'], quote=True)}">{esc(entry['license'])}</a></p>
<p>Adaptación: cambio de tamaño y compresión WebP, sin recorte adicional.</p></li>''')
    (PUBLIC / "media-credits.html").write_text('''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Créditos de imágenes · Healthy Life</title>
<style>@font-face{font-family:Inter;src:url('/fonts/InterVariable.woff2')}*{box-sizing:border-box}body{font:16px/1.65 Inter,sans-serif;color:#17191d;background:#f5f6f8;margin:0;padding:24px}main{max-width:70ch;margin:auto}h1,h2{line-height:1.3}h2{font-size:20px}a{color:#9a0011;text-underline-offset:4px;display:inline-block;padding-block:8px;overflow-wrap:anywhere}a:focus-visible{outline:3px solid #17191d;outline-offset:3px}ul{list-style:none;padding:0}li{border-top:1px solid #dce0e5;padding-block:16px}p{margin-block:8px}</style></head>
<body><main><a href="/#/catalogo">Volver a Healthy Life</a><h1>Créditos de imágenes</h1>
<p>Las fotografías ayudan a identificar los ejercicios. Las licencias enlazadas corresponden a cada recurso; sus autores no avalan la aplicación.</p><ul>
''' + "\n".join(credits) + "\n</ul></main></body></html>\n", encoding="utf-8")
    print(f"Prepared {len(manifest['resources'])} reviewed resources")


if __name__ == "__main__":
    main()
