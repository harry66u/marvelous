#!/usr/bin/env python3
"""Flag each infobox in content/research/infoboxes.json as reliable or not.

Reliable = the resolved page is a character page (not a "List of ..." page) whose title
shares a significant word with the character's name, parenthetical, real name or aliases
(real name and aliases come from the recovered drafts when available).
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
R = ROOT / 'content/research'
STOP = {'the', 'of', 'a', 'and', 'marvel', 'comics', 'character', 'man', 'woman', 'girl', 'boy', 'film', 'tv', 'series'}


def words(s):
    return {w for w in re.sub(r'[^a-z0-9 ]', ' ', (s or '').lower()).split() if len(w) > 2 and w not in STOP}


def main():
    boxes = json.loads((R / 'infoboxes.json').read_text())
    cands = {c['id']: c for c in json.loads((R / 'candidates.json').read_text())}
    drafts = {}
    for f in (R / 'draft').glob('B*.json'):
        for rec in json.loads(f.read_text())['characters']:
            drafts[rec['id']] = rec
    unreliable = []
    for cid, box in boxes.items():
        title = box.get('title') or ''
        d = drafts.get(cid, {})
        names = words(cands[cid]['name']) | words(d.get('realName')) | set().union(*[words(a) for a in d.get('aliases', [])] or [set()])
        fields = box.get('fields', {})
        flat = lambda x: re.sub(r'[^a-z0-9]', '', (x or '').lower())
        info = flat(' '.join([title, fields.get('alter_ego', ''), fields.get('full_name', ''), fields.get('aliases', '')]))
        base = re.sub(r'\s*\(.*\)$', '', cands[cid]['name'])
        paren = re.search(r'\((.*)\)$', cands[cid]['name'])
        if not title or title.startswith('List of'):
            ok = False
        elif paren:  # disambiguated names must match the specific person
            ok = flat(paren.group(1)) in info
        else:
            ok = bool(words(title) & names) or flat(re.sub(r'\s*\(.*\)$', '', title)) == flat(base) or flat(base) in info
        box['reliable'] = ok
        if not ok:
            unreliable.append(f"{cands[cid]['name']} -> {title or '—'}")
    (R / 'infoboxes.json').write_text(json.dumps(boxes, indent=1, ensure_ascii=False))
    print(f'{len(boxes) - len(unreliable)} reliable, {len(unreliable)} unreliable')
    print('\n'.join(unreliable))


if __name__ == '__main__':
    main()
