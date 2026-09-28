"""
Builds the journal's self-hosted faces (assets/fonts/, read by config/fonts.ts).

Google serves Caveat and Fraunces as variable fonts covering every weight
(Caveat 75 KB, Fraunces 37 KB upright + 46 KB italic, latin subset). The site
sets them at one or two weights, so this cuts static instances of just those
weights from Google's latin files: about half the bytes, the same glyphs and
OpenType features (Caveat keeps its contextual alternates).

Run from the repo root, then commit the output:
    uv run --with fonttools --with brotli python scripts/build-fonts.py
"""

import io
import re
import urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = Path("assets/fonts")
# A current Chrome user agent: Google answers it with woff2, split by subset.
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"

# (family, style, weight to instance, output file)
FACES = [
    ("Caveat", "normal", 700, "caveat-700.woff2"),
    ("Fraunces", "normal", 600, "fraunces-600.woff2"),
    ("Fraunces", "italic", 600, "fraunces-italic-600.woff2"),
]


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA})) as response:
        return response.read()


def latin_source(family: str, style: str) -> bytes:
    """The variable latin woff2 Google serves for a family and style."""
    axes = "ital,wght@1,100..900" if style == "italic" else "wght@100..900"
    if family == "Caveat":
        axes = "wght@400..700"
    css = fetch(f"https://fonts.googleapis.com/css2?family={family}:{axes}").decode()
    block = re.search(r"/\* latin \*/\s*@font-face\s*{([^}]*)}", css)
    if not block:
        raise SystemExit(f"No latin subset for {family} {style}")
    src = re.search(r"url\((\S+?)\) format\('woff2'\)", block.group(1))
    return fetch(src.group(1))


OUT.mkdir(parents=True, exist_ok=True)
for family, style, weight, filename in FACES:
    font = TTFont(io.BytesIO(latin_source(family, style)))
    static = instancer.instantiateVariableFont(font, {"wght": weight})
    static.flavor = "woff2"
    static.save(OUT / filename)
    print(f"{OUT / filename}: {(OUT / filename).stat().st_size} bytes")
