"""Build Marvelous Display as two stacked web fonts.

  MarvelousDisplay-Base.woff2   family "Marvelous Display": every component
  MarvelousDisplay-Shade.woff2  family "Marvelous Display Shade": tone-B components only

Both fonts share every metric (advance widths, vertical metrics, cmap), so the shade
layer drawn over the base text lines up exactly. Lowercase maps to the capitals.

Usage: python3 tools/font/build_font.py [--out DIR] [--ttf]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path as FilePath

import pathops
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.timeTools import timestampFromString
from fontTools.pens.areaPen import AreaPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable

sys.path.insert(0, str(FilePath(__file__).resolve().parent))
import glyphs  # noqa: E402

UPM = 1000
SCALE = 7            # design grid to font units: cap height 100 -> 700
SIDE = 6             # sidebearing per side, design units (12 between letters, as in the prototype)
ASCENT, DESCENT, CAP_HEIGHT = 800, -200, 700
VERSION = '1.000'
BUILD_DATE = 'Fri Nov  6 00:00:00 2026'  # fixed so rebuilds are byte-identical

FONTS = {
    'Base': {'family': 'Marvelous Display', 'ps': 'MarvelousDisplay-Regular', 'tones': ('A', 'B')},
    'Shade': {'family': 'Marvelous Display Shade', 'ps': 'MarvelousDisplayShade-Regular', 'tones': ('B',)},
}

NAMES = {
    ' ': 'space', '.': 'period', ',': 'comma', '!': 'exclam', '?': 'question', '-': 'hyphen',
    "'": 'quotesingle', '"': 'quotedbl', ':': 'colon', '/': 'slash', '#': 'numbersign',
    '&': 'ampersand', '+': 'plus', '%': 'percent', '(': 'parenleft', ')': 'parenright',
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
}
# Typographic look-alikes that should render with the same glyphs.
ALIASES = {0x00A0: ' ', 0x2010: '-', 0x2011: '-', 0x2018: "'", 0x2019: "'", 0x201C: '"', 0x201D: '"'}

REQUIRED = [chr(c) for c in range(ord('A'), ord('Z') + 1)] + list('0123456789') + list(' .,!?-\':/#&+%()"')

LICENSE = ('This Font Software is licensed under the SIL Open Font License, Version 1.1. '
           'This license is available with a FAQ at: https://openfontlicense.org')


def glyph_name(ch: str) -> str:
    return NAMES.get(ch, ch)


def to_font_units(path: pathops.Path) -> pathops.Path:
    return path.transform(SCALE, 0, 0, SCALE, SIDE * SCALE, 0)


def tt_glyph(path: pathops.Path):
    """TrueType glyph with clockwise outer contours and no overlaps."""
    pen = TTGlyphPen(None)
    clean = pathops.simplify(path, fix_winding=True, keep_starting_points=False, clockwise=True)
    clean.draw(pen)
    glyph = pen.glyph(dropImpliedOnCurves=True)
    glyph.recalcBounds(None)
    return glyph


def notdef():
    box = glyphs.cut(glyphs.rect(0, 0, 60, 100), glyphs.rect(10, 10, 50, 90))
    return 60, {'A': box, 'B': box}


def design() -> dict[str, tuple[float, dict[str, pathops.Path]]]:
    missing = [ch for ch in REQUIRED if ch not in glyphs.GLYPHS]
    if missing:
        raise SystemExit(f'glyphs.py is missing: {missing!r}')
    built = {'.notdef': notdef()}
    for ch in REQUIRED:
        built[glyph_name(ch)] = glyphs.build(ch)
    return built


def cmap() -> dict[int, str]:
    out = {ord(ch): glyph_name(ch) for ch in REQUIRED}
    out.update({ord(ch.lower()): ch for ch in REQUIRED if ch.isalpha()})
    out.update({code: glyph_name(ch) for code, ch in ALIASES.items()})
    return out


def build_font(kind: str, built) -> TTFont:
    spec = FONTS[kind]
    order = list(built)
    outlines, metrics = {}, {}
    for name, (width, tones) in built.items():
        shape = glyphs.union(*(tones[t] for t in spec['tones']))
        glyph = tt_glyph(to_font_units(shape))
        outlines[name] = glyph
        advance = round((width + 2 * SIDE) * SCALE)
        metrics[name] = (advance, glyph.xMin if glyph.numberOfContours else 0)

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap())
    fb.setupGlyf(outlines)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=ASCENT, descent=DESCENT, lineGap=0)
    fb.setupNameTable({
        'copyright': 'Copyright 2026 The Marvelous Project Authors',
        'familyName': spec['family'],
        'styleName': 'Regular',
        'uniqueFontIdentifier': f'{VERSION};NONE;{spec["ps"]}',
        'fullName': f'{spec["family"]} Regular',
        'psName': spec['ps'],
        'version': f'Version {VERSION}',
        'designer': 'The Marvelous Project Authors',
        'licenseDescription': LICENSE,
        'licenseInfoURL': 'https://openfontlicense.org',
    })
    fb.setupOS2(
        version=4, achVendID='NONE', usWeightClass=400, usWidthClass=5, fsType=0,
        fsSelection=0x40 | 0x80,  # REGULAR, USE_TYPO_METRICS
        sTypoAscender=ASCENT, sTypoDescender=DESCENT, sTypoLineGap=0,
        usWinAscent=ASCENT, usWinDescent=-DESCENT,
        sCapHeight=CAP_HEIGHT, sxHeight=CAP_HEIGHT,
        ulCodePageRange1=1,  # Latin 1
    )
    fb.setupPost(keepGlyphNames=False)
    gasp = newTable('gasp')
    gasp.version = 1
    gasp.gaspRange = {0xFFFF: 0x000F}  # unhinted: smooth at every size
    fb.font['gasp'] = gasp

    head = fb.font['head']
    head.fontRevision = float(VERSION)
    head.created = head.modified = timestampFromString(BUILD_DATE)
    fb.font.recalcTimestamp = False
    return fb.font


def check(fonts: dict[str, TTFont]) -> None:
    """Fail the build on wrong winding, overlaps, or base/shade drift."""
    base, shade = fonts['Base'], fonts['Shade']
    assert base.getGlyphOrder() == shade.getGlyphOrder(), 'glyph order differs'
    assert base.getBestCmap() == shade.getBestCmap(), 'cmap differs'
    for name in base.getGlyphOrder():
        assert base['hmtx'][name][0] == shade['hmtx'][name][0], f'{name}: advance differs'
    for kind, font in fonts.items():
        glyph_set = font.getGlyphSet()
        for name in font.getGlyphOrder():
            area = AreaPen(glyph_set)
            glyph_set[name].draw(area)
            outline = pathops.Path()
            glyph_set[name].draw(outline.getPen())
            if not outline.area:
                continue
            # AreaPen is positive for counter-clockwise; TrueType outers run clockwise.
            assert area.value < 0, f'{kind} {name}: outer contours are not clockwise'
            merged = pathops.simplify(outline, fix_winding=False, clockwise=True)
            drift = abs(merged.area - outline.area) / outline.area
            assert drift < 0.001, f'{kind} {name}: overlapping contours ({drift:.4f})'


def main() -> None:
    root = FilePath(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--out', type=FilePath, default=root / 'src' / 'ui' / 'fonts')
    parser.add_argument('--ttf', action='store_true', help='also write .ttf files (for inspection)')
    args = parser.parse_args()

    built = design()
    fonts = {kind: build_font(kind, built) for kind in FONTS}
    check(fonts)
    args.out.mkdir(parents=True, exist_ok=True)
    for kind, font in fonts.items():
        if args.ttf:
            font.flavor = None
            font.save(args.out / f'MarvelousDisplay-{kind}.ttf')
        font.flavor = 'woff2'
        target = args.out / f'MarvelousDisplay-{kind}.woff2'
        font.save(target)
        print(f'{target.relative_to(root) if target.is_relative_to(root) else target}: '
              f'{target.stat().st_size} bytes, {len(font.getGlyphOrder())} glyphs')


if __name__ == '__main__':
    main()
