"""Prototype: original geometric two-tone stencil letterforms (cap height 100)."""
import math, json, sys
from shapely.geometry import box, Point, Polygon
from shapely.ops import unary_union
from shapely import affinity

G = 6.0      # stencil gap
S = 30.0     # stem
QS = 48      # arc smoothness

def rect(x0, y0, x1, y1): return box(x0, y0, x1, y1)
def disc(cx, cy, r): return Point(cx, cy).buffer(r, quad_segs=QS)
def ring(cx, cy, ro, ri):
    d = disc(cx, cy, ro)
    return d.difference(disc(cx, cy, ri)) if ri > 0 else d
def half(geom, side, cx=None, cy=None):
    b = geom.bounds; big = 1000
    if side == 'R': return geom.intersection(box(cx, -big, big, big))
    if side == 'L': return geom.intersection(box(-big, -big, cx, big))
    if side == 'T': return geom.intersection(box(-big, cy, big, big))
    if side == 'B': return geom.intersection(box(-big, -big, big, cy))
def poly(*pts): return Polygon(pts)
def sector(cx, cy, ro, ri, a0, a1):
    """annular sector, angles in degrees CCW from +x"""
    n = 96
    outer = [(cx + ro*math.cos(math.radians(a0 + (a1-a0)*i/n)), cy + ro*math.sin(math.radians(a0 + (a1-a0)*i/n))) for i in range(n+1)]
    if ri > 0:
        inner = [(cx + ri*math.cos(math.radians(a1 - (a1-a0)*i/n)), cy + ri*math.sin(math.radians(a1 - (a1-a0)*i/n))) for i in range(n+1)]
    else:
        inner = [(cx, cy)]
    return Polygon(outer + inner)

# glyph := (advance, [(tone, geom), ...]) ; earlier components win, later ones get cut by gap
def g_I(): return 30, [('L', rect(0,0,30,100))]
def g_L(): return 70, [('L', rect(0,0,30,100)), ('D', rect(0,0,70,28))]
def g_E(): return 70, [('L', rect(0,0,30,100)), ('D', rect(0,72,70,100)), ('D', rect(0,36,60,64)), ('D', rect(0,0,70,28))]
def g_F(): return 70, [('L', rect(0,0,30,100)), ('D', rect(0,72,70,100)), ('D', rect(0,36,60,64))]
def g_T(): return 84, [('L', rect(0,72,84,100)), ('D', rect(27,0,57,100))]
def g_H(): return 92, [('L', rect(0,0,30,100)), ('L', rect(62,0,92,100)), ('D', rect(0,36,92,64))]
def g_D(): return 86, [('L', rect(0,0,30,100)), ('D', half(ring(36,50,50,15),'R',cx=36))]
def g_O(): 
    r = ring(50,50,50,15)
    return 100, [('L', half(r,'L',cx=50)), ('D', half(r,'R',cx=50))]
def g_C():
    r = ring(50,50,50,15)
    return 92, [('L', half(r,'L',cx=50)), ('D', sector(50,50,50,15,38,90)), ('D', sector(50,50,50,15,-90,-38))]
def g_G():
    r = ring(50,50,50,15)
    return 100, [('L', half(r,'L',cx=50)), ('D', sector(50,50,50,15,38,90)), ('D', sector(50,50,50,15,-90,0)), ('D', rect(56,36,100,50))]
def g_U():
    return 92, [('L', rect(0,46,30,100)), ('L', rect(62,46,92,100)), ('D', half(ring(46,46,46,16),'B',cy=46))]
def g_S():
    up = half(ring(31,69,31,7),'L',cx=31)
    lo = half(ring(47,31,31,7),'R',cx=47)
    return 78, [('L', unary_union([up, rect(31,76,78,100)])), ('D', unary_union([lo, rect(0,0,47,24), rect(25,38,47,62)]))]

def g_P():
    return 70, [('L', rect(0,0,30,100)), ('D', half(ring(36,70,30,9),'R',cx=36))]
def g_R():
    return 84, [('L', rect(0,0,30,100)), ('D', half(ring(36,70,30,9),'R',cx=36)), ('L', poly((36,40),(62,40),(84,0),(56,0)))]

def g_W():
    v1 = poly((0,100),(34,100),(52,30),(70,100),(104,100),(52,0))
    return 140, [('L', poly((0,100),(30,100),(48,30),(36,0))), ('D', poly((48,100),(70,0),(92,100))), ('L', poly((110,100),(140,100),(104,0),(92,30)))]
def g_X():
    a = poly((0,100),(32,100),(92,0),(60,0)); b = poly((60,100),(92,100),(32,0),(0,0))
    return 92, [('L', a), ('D', b)]
def g_Y():
    return 92, [('L', poly((0,100),(32,100),(56,56),(36,40))), ('D', poly((60,100),(92,100),(62,44),(46,44))), ('D', rect(31,0,61,48))]
def g_Z():
    return 84, [('L', rect(0,72,84,100)), ('D', poly((84,72),(84,72),(30,28),(0,28),(54,72))), ('L', rect(0,0,84,28))]
def g_hyphen(): return 44, [('D', rect(0,38,44,62))]
def g_space(): return 40, []

def g_A():
    t = poly((0,0),(50,100),(100,0)).difference(poly((30,0),(50,58),(70,0)))
    bar = rect(0,14,100,30).intersection(poly((30,0),(50,58),(70,0)))
    return 100, [('L', half(t,'L',cx=50)), ('D', half(t,'R',cx=50)), ('D', bar)]
def g_M():
    v = unary_union([poly((0,100),(36,100),(80,22),(44,22)), poly((84,100),(124,100),(80,22),(44,22))])
    return 124, [('L', rect(0,0,30,100)), ('L', rect(94,0,124,100)), ('D', v)]
def g_N():
    return 108, [('L', rect(0,0,30,100)), ('L', rect(78,0,108,100)), ('D', poly((0,100),(44,100),(108,0),(64,0)))]
def g_V():
    t = poly((0,100),(100,100),(50,0)).difference(poly((36,100),(64,100),(50,56)))
    return 100, [('L', half(t,'L',cx=50)), ('D', half(t,'R',cx=50))]
def g_B():
    return 68, [('L', rect(0,0,30,100)), ('D', half(ring(36,76,24,7),'R',cx=36)), ('D', half(ring(36,27,27,8),'R',cx=36))]
def g_K():
    return 90, [('L', rect(0,0,30,100)), ('D', poly((36,40),(60,100),(90,100),(56,24))), ('L', poly((44,60),(68,60),(90,0),(60,0)))]

GLYPHS = {c: globals()[f'g_{c}'] for c in 'ABCDEFGHIKLMNOPRSTUVWXYZ' if f'g_{c}' in globals()}
GLYPHS['-'] = g_hyphen; GLYPHS[' '] = g_space

def build(ch):
    adv, comps = GLYPHS[ch]()
    out = []; taken = None
    for tone, geom in comps:
        g = geom
        if taken is not None:
            g = g.difference(taken.buffer(G, join_style='mitre', quad_segs=QS))
        g = g.intersection(box(-50, 0, adv+50, 100))  # clip to cap band
        out.append((tone, g))
        taken = geom if taken is None else unary_union([taken, geom])
    return adv, out

def to_path(geom, dx):
    if geom.is_empty: return ''
    polys = [geom] if geom.geom_type == 'Polygon' else [p for p in getattr(geom, 'geoms', []) if p.geom_type == 'Polygon']
    d = []
    for p in polys:
        for ring_ in [p.exterior, *p.interiors]:
            pts = list(ring_.coords)
            d.append('M' + ' L'.join(f'{x+dx:.1f},{100-y:.1f}' for x, y in pts) + 'Z')
    return ''.join(d)

def word_svg(word, track=12, light='#f4630c', dark='#b3450c', h=120):
    x = 0; L = []; D = []
    for ch in word:
        adv, parts = build(ch)
        for tone, g in parts:
            (L if tone == 'L' else D).append(to_path(g, x))
        x += adv + track
    w = x - track
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 {w+8} 108" height="{h}"><path fill="{light}" d="{"".join(L)}"/><path fill="{dark}" d="{"".join(D)}"/></svg>'

if __name__ == '__main__':
    words = sys.argv[1:] or ['MARVELOUS', 'UNMASKED', 'B-LIST', 'RETCON', 'ABCDEFGHIKLMNOP', 'RSTUVWXYZ']
    html = ['<!doctype html><html><body style="margin:0;padding:24px;background:#f0dfb8;width:1400px">']
    for w in words:
        html.append(f'<div style="margin:0 0 28px">{word_svg(w)}</div>')
    html.append('</body></html>')
    open('words.html', 'w').write(''.join(html))
    print('ok')
