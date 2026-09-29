"""
Builds the site's self-hosted faces (assets/fonts/, read by config/fonts.ts
and config/era-fonts.ts). Every face is self-hosted, so `next build` never
downloads fonts: next/font/google fetching a dozen faces at build time made
CI builds fail now and then.

Google serves Caveat and Fraunces as variable fonts covering every weight
(Caveat 75 KB, Fraunces 37 KB upright + 46 KB italic, latin subset). The site
sets them at one or two weights, so this cuts static instances of just those
weights from Google's latin files: about half the bytes, the same glyphs and
OpenType features (Caveat keeps its contextual alternates).

Every other face (Karla and each Era's display face) is saved as Google
serves it, latin subset only, with its licence.

Run from the repo root, then commit the output:
    uv run --with fonttools --with brotli python scripts/build-fonts.py
"""

import io
import re
import urllib.error
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


# Faces kept as Google serves them: (family, css2 axes or "", output name).
# One file per style in the latin subset: "<name>.woff2", or "<name>-italic.woff2".
AS_SERVED = [
    ("Karla", "wght@200..800", "karla"),
    ("Rye", "", "rye"),
    ("Cinzel", "wght@600..700", "cinzel"),
    ("Pinyon Script", "", "pinyon-script"),
    ("Abril Fatface", "", "abril-fatface"),
    ("Permanent Marker", "", "permanent-marker"),
    ("UnifrakturMaguntia", "", "unifraktur-maguntia"),
    ("Pacifico", "", "pacifico"),
    ("IM Fell English", "ital@0;1", "im-fell-english"),
    ("Cormorant Garamond", "ital,wght@1,600..700", "cormorant-garamond"),
    ("Bodoni Moda", "wght@500..700", "bodoni-moda"),
    ("Special Elite", "", "special-elite"),
    ("Bebas Neue", "", "bebas-neue"),
]


def licence(family: str) -> bytes:
    """The family's licence from Google Fonts' repository (OFL, or Apache for a few)."""
    folder = family.lower().replace(" ", "")
    for path in (f"ofl/{folder}/OFL.txt", f"apache/{folder}/LICENSE.txt"):
        try:
            return fetch(f"https://raw.githubusercontent.com/google/fonts/main/{path}")
        except urllib.error.HTTPError:
            continue
    raise SystemExit(f"No licence found for {family}")


for family, axes, name in AS_SERVED:
    query = family.replace(" ", "+") + (f":{axes}" if axes else "")
    css = fetch(f"https://fonts.googleapis.com/css2?family={query}&display=swap").decode()
    blocks = re.findall(r"/\* latin \*/\s*@font-face\s*{([^}]*)}", css)
    if not blocks:
        raise SystemExit(f"No latin subset for {family}")
    for block in blocks:
        italic = "font-style: italic" in block
        src = re.search(r"url\((\S+?)\) format\('woff2'\)", block).group(1)
        path = OUT / f"{name}{'-italic' if italic else ''}.woff2"
        path.write_bytes(fetch(src))
        print(f"{path}: {path.stat().st_size} bytes")
    (OUT / f"LICENSE-{name}.txt").write_bytes(licence(family))
