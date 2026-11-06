"""Marvelous Display: glyph geometry for the two-tone stencil face.

Design grid: cap height 100, baseline 0, y up. Stems are 30 wide and stencil gaps 6.
Each glyph function returns (width, components), where a component is (tone, path):
tone 'A' is the base orange and tone 'B' the kiln shade. Components are cut in
order: each one loses whatever lies within GAP of the components listed before it,
so earlier components stay whole and later ones carry the stencil gaps.

Shapes are skia-pathops paths made of lines and quadratic arcs, so they go straight
into TrueType outlines. Started from docs/design/prototype/glyphs.py.
"""
from __future__ import annotations

import math
from collections.abc import Callable

import pathops
from pathops import LineCap, LineJoin, Path, PathOp

GAP = 6.0
CAP = 100.0
ARC_STEPS = 12  # quadratic segments per full circle; radial error stays under 0.07%
FAR = 1000.0

Component = tuple[str, Path]
GlyphFn = Callable[[], tuple[float, list[Component]]]


# ---------------------------------------------------------------- primitives

def _path(points) -> Path:
    p = Path()
    (x, y), *rest = points
    p.moveTo(x, y)
    for x, y in rest:
        p.lineTo(x, y)
    p.close()
    return p


def rect(x0, y0, x1, y1) -> Path:
    return _path([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


def poly(*points) -> Path:
    return _path(points)


def disc(cx, cy, r) -> Path:
    step = 2 * math.pi / ARC_STEPS
    reach = r / math.cos(step / 2)  # off-curve distance for a quadratic arc
    p = Path()
    p.moveTo(cx + r, cy)
    for i in range(ARC_STEPS):
        mid, end = (i + 0.5) * step, (i + 1) * step
        p.quadTo(cx + reach * math.cos(mid), cy + reach * math.sin(mid),
                 cx + r * math.cos(end), cy + r * math.sin(end))
    p.close()
    return p


def _op(a: Path, b: Path, operator) -> Path:
    return pathops.op(a, b, operator, fix_winding=True, keep_starting_points=False)


def union(*paths: Path) -> Path:
    out = Path()
    for p in paths:
        out = _op(out, p, PathOp.UNION)
    return out


def cut(a: Path, b: Path) -> Path:
    return _op(a, b, PathOp.DIFFERENCE)


def clip(a: Path, b: Path) -> Path:
    return _op(a, b, PathOp.INTERSECTION)


def ring(cx, cy, ro, ri) -> Path:
    return cut(disc(cx, cy, ro), disc(cx, cy, ri)) if ri > 0 else disc(cx, cy, ro)


def half(p: Path, side: str, at: float) -> Path:
    """Keep the part of p left of / right of / below / above the line at `at`."""
    keep = {'L': rect(-FAR, -FAR, at, FAR), 'R': rect(at, -FAR, FAR, FAR),
            'B': rect(-FAR, -FAR, FAR, at), 'T': rect(-FAR, at, FAR, FAR)}[side]
    return clip(p, keep)


def band(p: Path, y0: float, y1: float) -> Path:
    return clip(p, rect(-FAR, y0, FAR, y1))


def wedge(cx, cy, a0, a1) -> Path:
    n = max(1, math.ceil(abs(a1 - a0) / 30))
    angles = [math.radians(a0 + (a1 - a0) * i / n) for i in range(n + 1)]
    return _path([(cx, cy)] + [(cx + FAR * math.cos(a), cy + FAR * math.sin(a)) for a in angles])


def sector(cx, cy, ro, ri, a0, a1) -> Path:
    """Annular sector from angle a0 to a1, in degrees counter-clockwise from +x."""
    return clip(ring(cx, cy, ro, ri), wedge(cx, cy, a0, a1))


def bar(x0, y0, x1, y1, w) -> Path:
    """A stroke of width w centred on the segment, ends square to it."""
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    nx, ny = -dy / length * w / 2, dx / length * w / 2
    return _path([(x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)])


def moved(p: Path, dx=0.0, dy=0.0) -> Path:
    return p.transform(1, 0, 0, 1, dx, dy)


def mirrored(p: Path, width: float) -> Path:
    """Mirror left-right within [0, width]."""
    return p.transform(-1, 0, 0, 1, width, 0)


def turned(p: Path, cx: float, cy: float) -> Path:
    """Rotate 180 degrees about (cx, cy)."""
    return p.transform(-1, 0, 0, -1, 2 * cx, 2 * cy)


def grow(p: Path, d: float) -> Path:
    edge = Path(p)
    edge.stroke(2 * d, LineCap.BUTT_CAP, LineJoin.MITER_JOIN, 5)
    return union(p, edge)


# ---------------------------------------------------------------- registry

GLYPHS: dict[str, tuple[GlyphFn, tuple[float, float]]] = {}


def glyph(*chars: str, ink=(0.0, CAP)):
    """Register a glyph function; `ink` is the vertical band its outline may occupy."""
    def register(fn: GlyphFn) -> GlyphFn:
        for ch in chars:
            GLYPHS[ch] = (fn, ink)
        return fn
    return register


def build(ch: str) -> tuple[float, dict[str, Path]]:
    """Width and the finished outline of each tone, stencil gaps applied."""
    fn, (lo, hi) = GLYPHS[ch]
    width, components = fn()
    tones = {'A': Path(), 'B': Path()}
    taken: Path | None = None
    for tone, shape in components:
        part = shape if taken is None else cut(shape, grow(taken, GAP))
        tones[tone] = union(tones[tone], band(part, lo, hi))
        taken = shape if taken is None else union(taken, shape)
    return width, tones


# ---------------------------------------------------------------- letters

def _o_ring():
    return ring(50, 50, 50, 15)


@glyph('A')
def _A():
    outer = cut(poly((0, 0), (50, 100), (100, 0)), poly((30, 0), (50, 58), (70, 0)))
    crossbar = clip(rect(0, 14, 100, 30), poly((30, 0), (50, 58), (70, 0)))
    return 100, [('A', half(outer, 'L', 50)), ('B', half(outer, 'R', 50)), ('B', crossbar)]


@glyph('B')
def _B():
    return 68, [('A', rect(0, 0, 30, 100)),
                ('B', half(ring(36, 76, 24, 7), 'R', 36)),
                ('B', half(ring(36, 27, 27, 8), 'R', 36))]


@glyph('C')
def _C():
    r = _o_ring()
    return 92, [('A', half(r, 'L', 50)),
                ('B', sector(50, 50, 50, 15, 38, 90)),
                ('B', sector(50, 50, 50, 15, -90, -38))]


@glyph('D')
def _D():
    return 86, [('A', rect(0, 0, 30, 100)), ('B', half(ring(36, 50, 50, 15), 'R', 36))]


@glyph('E')
def _E():
    return 70, [('A', rect(0, 0, 30, 100)), ('B', rect(0, 72, 70, 100)),
                ('B', rect(0, 36, 60, 64)), ('B', rect(0, 0, 70, 28))]


@glyph('F')
def _F():
    return 70, [('A', rect(0, 0, 30, 100)), ('B', rect(0, 72, 70, 100)), ('B', rect(0, 36, 60, 64))]


@glyph('G')
def _G():
    lower = clip(union(sector(50, 50, 50, 15, -90, 0), rect(65, 0, 100, 56)), disc(50, 50, 50))
    return 100, [('A', half(_o_ring(), 'L', 50)), ('B', sector(50, 50, 50, 15, 42, 90)), ('B', lower)]


@glyph('H')
def _H():
    return 92, [('A', rect(0, 0, 30, 100)), ('A', rect(62, 0, 92, 100)), ('B', rect(0, 36, 92, 64))]


@glyph('I')
def _I():
    return 30, [('A', rect(0, 0, 30, 100))]


@glyph('J')
def _J():
    return 76, [('A', rect(46, 38, 76, 100)), ('B', half(ring(38, 38, 38, 8), 'B', 38))]


@glyph('K')
def _K():
    return 90, [('A', rect(0, 0, 30, 100)),
                ('B', poly((36, 40), (60, 100), (90, 100), (56, 24))),
                ('A', poly((44, 60), (68, 60), (90, 0), (60, 0)))]


@glyph('L')
def _L():
    return 70, [('A', rect(0, 0, 30, 100)), ('B', rect(0, 0, 70, 28))]


@glyph('M')
def _M():
    v = union(poly((0, 100), (36, 100), (80, 22), (44, 22)), poly((84, 100), (124, 100), (80, 22), (44, 22)))
    return 124, [('A', rect(0, 0, 30, 100)), ('A', rect(94, 0, 124, 100)), ('B', v)]


@glyph('N')
def _N():
    return 108, [('A', rect(0, 0, 30, 100)), ('A', rect(78, 0, 108, 100)),
                 ('B', poly((0, 100), (44, 100), (108, 0), (64, 0)))]


@glyph('O')
def _O():
    r = _o_ring()
    return 100, [('A', half(r, 'L', 50)), ('B', half(r, 'R', 50))]


@glyph('P')
def _P():
    return 70, [('A', rect(0, 0, 30, 100)), ('B', half(ring(36, 70, 30, 9), 'R', 36))]


@glyph('Q', ink=(-14, CAP))
def _Q():
    r = _o_ring()
    return 100, [('A', bar(60, 30, 88, -10, 28)), ('A', half(r, 'L', 50)), ('B', half(r, 'R', 50))]


@glyph('R')
def _R():
    return 84, [('A', rect(0, 0, 30, 100)), ('B', half(ring(36, 70, 30, 9), 'R', 36)),
                ('A', poly((36, 40), (62, 40), (84, 0), (56, 0)))]


@glyph('S')
def _S():
    upper = union(sector(39, 69, 31, 7, 90, 270), rect(39, 76, 78, 100))
    lower = union(sector(39, 31, 31, 7, -90, 90), rect(0, 0, 39, 24))
    return 78, [('A', upper), ('B', lower)]


@glyph('T')
def _T():
    return 84, [('A', rect(0, 72, 84, 100)), ('B', rect(27, 0, 57, 100))]


@glyph('U')
def _U():
    return 92, [('A', rect(0, 46, 30, 100)), ('A', rect(62, 46, 92, 100)),
                ('B', half(ring(46, 46, 46, 16), 'B', 46))]


@glyph('V')
def _V():
    v = cut(poly((0, 100), (100, 100), (50, 0)), poly((36, 100), (64, 100), (50, 56)))
    return 100, [('A', half(v, 'L', 50)), ('B', half(v, 'R', 50))]


@glyph('W')
def _W():
    def vee(x):
        return cut(poly((x, 100), (x + 84, 100), (x + 42, 0)), poly((x + 28, 100), (x + 56, 100), (x + 42, 48)))
    w = union(vee(0), vee(66))
    return 150, [('A', half(w, 'L', 42)), ('A', half(w, 'R', 108)), ('B', w)]


@glyph('X')
def _X():
    return 92, [('A', poly((0, 100), (32, 100), (92, 0), (60, 0))),
                ('B', poly((60, 100), (92, 100), (32, 0), (0, 0)))]


@glyph('Y')
def _Y():
    top = band(cut(poly((0, 100), (92, 100), (46, 17)), poly((32, 100), (60, 100), (46, 62))), 44, 100)
    return 92, [('A', top), ('B', rect(31, 0, 61, 50))]


@glyph('Z')
def _Z():
    # The diagonal owns both corners; the bar remnants carry slanted stencil gaps.
    top, bottom = rect(0, 72, 84, 100), rect(0, 0, 84, 28)
    diagonal = union(poly((50, 100), (84, 100), (34, 0), (0, 0)),
                     clip(top, poly((0, 0), (50, 100), (FAR, 100), (FAR, 0))),
                     clip(bottom, poly((34, 0), (84, 100), (-FAR, 100), (-FAR, 0))))
    return 84, [('B', diagonal), ('A', top), ('A', bottom)]


# ---------------------------------------------------------------- digits
# Tabular: every digit is DIGIT wide so changing counters do not jitter.

DIGIT = 76


def _pill(x0, y0, x1, y1):
    r = (x1 - x0) / 2
    cx = (x0 + x1) / 2
    return union(disc(cx, y0 + r, r), disc(cx, y1 - r, r), rect(x0, y0 + r, x1, y1 - r))


@glyph('0')
def _0():
    shape = cut(_pill(0, 0, 76, 100), _pill(28, 28, 48, 72))
    return DIGIT, [('A', half(shape, 'L', 38)), ('B', half(shape, 'R', 38))]


@glyph('1')
def _1():
    return DIGIT, [('A', rect(36, 0, 66, 100)), ('B', poly((6, 46), (36, 76), (36, 100), (6, 70)))]


@glyph('2')
def _2():
    shoulder = sector(38, 63, 37, 10, -12, 160)
    diagonal = poly((47.8, 60.9), (74.2, 55.3), (33, 0), (0, 0))
    return DIGIT, [('B', rect(0, 0, 76, 26)), ('A', union(shoulder, diagonal))]


@glyph('3')
def _3():
    return DIGIT, [('A', sector(38, 73, 27, 8, -90, 150)),
                   ('B', sector(38, 30, 30, 9, -150, 90))]


@glyph('4')
def _4():
    return DIGIT, [('A', rect(44, 0, 72, 100)),
                   ('B', union(band(bar(58, 108, -4, 30, 30), 22, 100), rect(0, 22, 76, 48)))]


@glyph('5')
def _5():
    top = union(rect(6, 74, 72, 100), rect(6, 46, 34, 100))
    bowl = union(half(ring(40, 31, 31, 8), 'R', 40), rect(6, 39, 40, 62), rect(4, 0, 40, 23))
    return DIGIT, [('A', top), ('B', bowl)]


def _nine():
    return [('A', ring(38, 64, 36, 10)), ('B', poly((50, 54), (74, 64), (34, 0), (6, 0)))]


@glyph('6')
def _6():
    return DIGIT, [(tone, turned(p, 38, 50)) for tone, p in _nine()]


@glyph('7')
def _7():
    return DIGIT, [('A', rect(0, 72, 76, 100)), ('B', band(bar(60, 86, 22, 0, 30), 0, 100))]


@glyph('8')
def _8():
    return DIGIT, [('A', ring(38, 75, 25, 7)), ('B', ring(38, 28, 28, 8))]


@glyph('9')
def _9():
    return DIGIT, _nine()


# ---------------------------------------------------------------- punctuation

@glyph(' ')
def _space():
    return 40, []


@glyph('.')
def _period():
    return 30, [('A', rect(0, 0, 30, 28))]


@glyph(',', ink=(-26, CAP))
def _comma():
    return 30, [('A', union(rect(0, 0, 30, 28), poly((8, 2), (30, 2), (14, -24), (-6, -24))))]


@glyph('!')
def _exclam():
    return 30, [('A', poly((0, 100), (30, 100), (25, 36), (5, 36))), ('B', rect(0, 0, 30, 28))]


@glyph('?')
def _question():
    hook = union(sector(36, 70, 30, 9, -90, 165), rect(22, 34, 36, 50))
    return 70, [('A', hook), ('B', rect(22, 0, 52, 28))]


@glyph('-')
def _hyphen():
    return 44, [('B', rect(0, 38, 44, 62))]


def _tick(x):
    return poly((x, 100), (x + 24, 100), (x + 19, 62), (x + 5, 62))


@glyph("'")
def _quotesingle():
    return 24, [('A', _tick(0))]


@glyph('"')
def _quotedbl():
    return 60, [('A', _tick(0)), ('B', _tick(36))]


@glyph(':')
def _colon():
    return 30, [('A', rect(0, 50, 30, 78)), ('B', rect(0, 0, 30, 28))]


@glyph('/')
def _slash():
    return 64, [('A', poly((0, 0), (30, 0), (64, 100), (34, 100)))]


@glyph('#')
def _numbersign():
    grid = union(rect(14, 0, 38, 100), rect(54, 0, 78, 100), rect(0, 18, 92, 40), rect(0, 60, 92, 82))
    return 92, [('A', half(grid, 'T', 50)), ('B', half(grid, 'B', 50))]


@glyph('&')
def _ampersand():
    return 96, [('A', ring(32, 77, 22, 7)), ('A', band(bar(18, 65, 88, -5, 28), 0, CAP)),
                ('B', sector(36, 31, 31, 9, 72, 338)), ('B', rect(68, 36, 96, 56))]


@glyph('+')
def _plus():
    return DIGIT, [('A', rect(24, 12, 52, 88)), ('B', rect(0, 37, 76, 63))]


@glyph('%')
def _percent():
    return 92, [('A', poly((4, 0), (32, 0), (88, 100), (60, 100))),
                ('B', ring(21, 77, 21, 7)), ('B', ring(71, 23, 21, 7))]


def _paren():
    arc = moved(sector(70, 50, 70, 46, 125, 235), -8, 0)
    return [('A', half(arc, 'T', 50)), ('B', half(arc, 'B', 50))]


@glyph('(', ink=(-20, 120))
def _parenleft():
    return 40, _paren()


@glyph(')', ink=(-20, 120))
def _parenright():
    return 40, [(tone, mirrored(p, 40)) for tone, p in _paren()]
