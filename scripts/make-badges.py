#!/usr/bin/env python3
"""Generate the "built with wowlua" badges in public/badge/.

The text is converted to outlines from the site's fonts, so the badges look the
same on any site without loading a web font. Needs fontTools:

    python3 -m venv .venv && .venv/bin/pip install fonttools
    .venv/bin/python scripts/make-badges.py

Variants:
  built-with-wowlua-dark.svg   for dark pages (36 px high)
  built-with-wowlua-light.svg  for light pages (36 px high)
  built-with-wowlua.svg        flat, 20 px high, for READMEs next to other badges
"""
import os
import re

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "public", "badge")

PLEX = TTFont(os.path.join(ROOT, "app", "fonts", "IBMPlexMono-Regular.ttf"))
PLEX_SEMI = TTFont(os.path.join(ROOT, "app", "fonts", "IBMPlexMono-SemiBold.ttf"))
MARTIAN = TTFont(os.path.join(ROOT, "lib", "og-fonts", "MartianMono-StdxBd.ttf"))

# The wordmark from the design system (components/Logo.tsx): viewBox 0 0 195.69 48.
LOGO_SRC = open(os.path.join(ROOT, "components", "Logo.tsx"), encoding="utf-8").read()
LOGO = re.search(r"LOGO_FULL_SVG = '(<svg.*?</svg>)'", LOGO_SRC).group(1)
LOGO_INNER = re.search(r"<svg[^>]*>(.*)</svg>", LOGO).group(1)
LOGO_W, LOGO_H = 195.69, 48.0


def text_path(font, text, size, x, baseline):
    """SVG path data for `text` set at `size` px, starting at x on `baseline`; returns (d, end x)."""
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = size / font["head"].unitsPerEm
    pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    cx = x
    for ch in text:
        name = cmap[ord(ch)]
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, cx, baseline)))
        cx += glyphs[name].width * scale
    return pen.getCommands(), cx


def advance(font, text, size):
    return text_path(font, text, size, 0, 0)[1]


def logo(x, y, height, ink, amber):
    s = height / LOGO_H
    inner = LOGO_INNER.replace("currentColor", ink).replace("var(--amber-ink)", amber)
    return f'<g transform="translate({x:.2f} {y:.2f}) scale({s:.4f})">{inner}</g>'


def card(theme):
    c = {
        "dark": dict(bg="#14120e", line="#353027", muted="#a39b8a", ink="#ece6d6", amber="#ffb547"),
        "light": dict(bg="#f7f6f2", line="#dcd8cc", muted="#5c5548", ink="#1a1813", amber="#975200"),
    }[theme]
    h, pad, gap, size, logo_h = 36, 12, 8, 12, 22
    label_w = advance(PLEX, "built with", size)
    w = pad + label_w + gap + LOGO_W * logo_h / LOGO_H + pad
    d, _ = text_path(PLEX, "built with", size, pad, h / 2 + size * 0.36)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h}" viewBox="0 0 {w:.2f} {h}" role="img" aria-label="built with wowlua">
<title>built with wowlua</title>
<rect x="0.5" y="0.5" width="{w - 1:.2f}" height="{h - 1}" fill="{c['bg']}" stroke="{c['line']}"/>
<path fill="{c['muted']}" d="{d}"/>
{logo(pad + label_w + gap, (h - logo_h) / 2, logo_h, c['ink'], c['amber'])}
</svg>
"""


def flat():
    h, pad, size = 20, 6, 11
    left, right = "built with", "wowlua"
    lw = pad + advance(PLEX, left, size) + pad
    rw = pad + advance(MARTIAN, right, size) + pad
    base = h / 2 + size * 0.36
    ld, _ = text_path(PLEX, left, size, pad, base)
    rd, _ = text_path(MARTIAN, right, size, lw + pad, base)
    w = lw + rw
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h}" viewBox="0 0 {w:.2f} {h}" role="img" aria-label="built with wowlua">
<title>built with wowlua</title>
<rect width="{lw:.2f}" height="{h}" fill="#2e2920"/>
<rect x="{lw:.2f}" width="{rw:.2f}" height="{h}" fill="#ffb547"/>
<path fill="#ece6d6" d="{ld}"/>
<path fill="#1a1308" d="{rd}"/>
</svg>
"""


os.makedirs(OUT, exist_ok=True)
for name, svg in [("built-with-wowlua-dark.svg", card("dark")), ("built-with-wowlua-light.svg", card("light")), ("built-with-wowlua.svg", flat())]:
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"public/badge/{name}: {len(svg)} bytes")
