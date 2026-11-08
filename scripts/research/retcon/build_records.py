#!/usr/bin/env python3
"""Build content/retcon.json from fact-checked sources already in the repo, plus Wikidata extras.

- debuts: content/characters.json (cover month, checked against Wikipedia; see content/FACTCHECK.md)
- MCU releases: content/research/mcu_casts.json (first U.S. release, from each title's Wikipedia page)
- other screen releases and comic events: content/_research/wd/screen.json and events.json, when present
- milestones: content/research/retcon_milestones.json (hand-checked)

Usage: python3 scripts/research/retcon/build_records.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WD = ROOT / 'content' / '_research' / 'wd'


def slug(s):
    s = re.sub(r"['’.]", '', s.lower())
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def wiki(title):
    return 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_')


def debuts():
    out = []
    for c in json.loads((ROOT / 'content/characters.json').read_text()):
        if not re.fullmatch(r'\d{4}-\d{2}', c['debutDate']):
            continue
        real = c.get('realName')
        detail = c['debutIssue'] + (f' · {real}' if real and real not in c['name'] else '')
        out.append({
            'id': f"debut-{c['id']}", 'text': f"First appearance: {c['name']}", 'detail': detail,
            'date': c['debutDate'], 'kind': 'debut', 'sources': c['sources'][:1],
            'difficulty': c['difficulty'],
        })
    return out


def series_kind(page):
    if '(film)' in page or 'film)' in page:
        return 'film'
    if 'TV special' in page or 'Holiday Special' in page or 'One Last Kill' in page:
        return 'special'
    return None


SERIES = {'WandaVision', 'The Falcon and the Winter Soldier', 'Loki', 'Hawkeye', 'Moon Knight', 'Ms. Marvel',
          'She-Hulk: Attorney at Law', 'Secret Invasion', 'Echo', 'Agatha All Along', 'Daredevil: Born Again',
          'Ironheart', 'Wonder Man', 'VisionQuest'}
SPECIALS = {'Werewolf by Night', 'The Guardians of the Galaxy Holiday Special', 'The Punisher: One Last Kill'}


def mcu():
    out = []
    for title, v in json.loads((ROOT / 'content/research/mcu_casts.json').read_text()).items():
        if title in SERIES:
            text, platform = f'{title} premieres', 'MCU series · Disney+'
        elif title in SPECIALS:
            text, platform = f'{title} premieres', 'MCU special · Disney+'
        else:
            text, platform = f'{title} opens in theaters', 'MCU film · U.S. release'
        out.append({'id': f'mcu-{slug(title)}', 'text': text, 'detail': platform, 'date': v['released'],
                    'kind': 'screen', 'sources': [wiki(v['page'])], 'difficulty': 1})
    return out


def optional(name):
    p = WD / f'{name}.json'
    return json.loads(p.read_text()) if p.exists() else []


def main():
    records = debuts() + mcu()
    records += optional('retcon_screen') + optional('retcon_events')
    m = ROOT / 'content/research/retcon_milestones.json'
    if m.exists():
        records += json.loads(m.read_text())
    seen, final = set(), []
    for r in sorted(records, key=lambda r: (r['date'], r['id'])):
        if r['id'] in seen:
            continue
        seen.add(r['id'])
        final.append(r)
    (ROOT / 'content/retcon.json').write_text(json.dumps(final, indent=1, ensure_ascii=False) + '\n')
    kinds = {}
    for r in final:
        kinds[r['kind']] = kinds.get(r['kind'], 0) + 1
    print(f'retcon: {len(final)} records', kinds)


if __name__ == '__main__':
    main()
