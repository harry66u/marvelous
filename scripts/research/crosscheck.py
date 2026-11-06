#!/usr/bin/env python3
"""Cross-check character records against Wikipedia infoboxes and the MCU cast table.

Inputs:  content/research/draft/B*.json, content/research/classified/B*.json (records),
         content/research/infoboxes.json, content/research/mcu_matches.json, content/teams.json
Output:  content/research/discrepancies.json  [{id, name, field, record, evidence}]

Only disagreements are listed; an adjudication pass resolves them.
Usage: python3 scripts/research/crosscheck.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
R = ROOT / 'content/research'

# loose keyword -> team id map for infobox "alliances" text
TEAM_KEYWORDS = {
    'avengers': 'avengers', 'x-men': 'x-men', 'fantastic four': 'fantastic-four',
    'guardians of the galaxy': 'guardians-of-the-galaxy', 'defenders': 'defenders',
    's.h.i.e.l.d': 'shield', 'shield': 'shield', 'hydra': 'hydra', 'a.i.m': 'aim',
    'inhuman': 'inhumans', 'eternals': 'eternals', 'brotherhood': 'brotherhood-of-mutants',
    'sinister six': 'sinister-six', 'masters of evil': 'masters-of-evil', 'thunderbolts': 'thunderbolts',
    'hellfire club': 'hellfire-club', 'alpha flight': 'alpha-flight', 'young avengers': 'young-avengers',
    'runaways': 'runaways', 'champions': 'champions', 'midnight sons': 'midnight-sons',
    'illuminati': 'illuminati', 'dark avengers': 'dark-avengers', 'heroes for hire': 'heroes-for-hire',
    'frightful four': 'frightful-four', 'serpent society': 'serpent-society', 'wrecking crew': 'wrecking-crew',
    'morlocks': 'morlocks', 'marauders': 'marauders', 'acolytes': 'acolytes', 'starjammers': 'starjammers',
    'imperial guard': 'shiar-imperial-guard', 'black order': 'black-order', 'ravagers': 'ravagers',
    'nova corps': 'nova-corps', 'invaders': 'invaders', 'howling commandos': 'howling-commandos',
    'warriors three': 'warriors-three', 'dora milaje': 'dora-milaje', 'the hand': 'the-hand',
    'maggia': 'maggia', 'new warriors': 'new-warriors', 'power pack': 'power-pack', 'x-force': 'x-force',
    'x-factor': 'x-factor', 'new mutants': 'new-mutants', 'excalibur': 'excalibur',
    'generation x': 'generation-x', 'weapon x': 'weapon-x', 'red room': 'red-room',
    'secret warriors': 'secret-warriors', 'heralds of galactus': 'heralds-of-galactus',
    'elders of the universe': 'elders-of-the-universe', 'great lakes avengers': 'great-lakes-avengers',
    'web-warriors': 'web-warriors', 'agents of atlas': 'agents-of-atlas', 'winter guard': 'winter-guard',
    'squadron supreme': 'squadron-supreme', 'cabal': 'cabal', 'legion of monsters': 'legion-of-monsters',
    'annihilators': 'annihilators', 'time variance authority': 'time-variance-authority',
    'kree': 'kree-empire', 'skrull': 'skrull-empire', "shi'ar": 'shiar-empire', 'asgard': 'asgard',
    'olympus': 'olympus', 'olympian': 'olympus', 'wakanda': 'wakanda', 'atlantis': 'atlantis',
    "k'un-lun": 'kun-lun', 'latveria': 'latveria', 'sword': 'sword', 's.w.o.r.d': 'sword',
}


def load_records():
    recs = {}
    for folder in ('draft', 'classified'):
        for f in sorted((R / folder).glob('B*.json')):
            for rec in json.loads(f.read_text())['characters']:
                recs[rec['id']] = rec
    return recs


def first_year(text):
    years = [int(y) for y in re.findall(r'\b(19[3-9]\d|20[0-2]\d)\b', text or '')]
    return min(years) if years else None


def main():
    recs = load_records()
    boxes = json.loads((R / 'infoboxes.json').read_text())
    mcu = json.loads((R / 'mcu_matches.json').read_text())
    out = []

    def flag(rec, field, record_value, evidence):
        out.append({'id': rec['id'], 'name': rec['name'], 'field': field,
                    'record': record_value, 'evidence': evidence})

    for cid, rec in sorted(recs.items()):
        box = boxes.get(cid, {})
        fields = box.get('fields', {})
        # debut year
        y = first_year(fields.get('debut', ''))
        if y is None:
            flag(rec, 'debut', rec['debutYear'], f'no infobox debut ({box.get("status")}, page {box.get("title")})')
        elif y != rec['debutYear']:
            flag(rec, 'debut', f'{rec["debutYear"]} {rec["debutIssue"]}', f'infobox ({box.get("title")}): {fields.get("debut")}')
        # real name
        alter = fields.get('alter_ego') or fields.get('full_name') or ''
        real = rec.get('realName') or ''
        if real and alter and real.lower() not in alter.lower() and not any(
                part.lower() in alter.lower() for part in real.split() if len(part) > 3):
            flag(rec, 'realName', real, f'infobox alter ego: {alter}')
        # primary team present in alliances?
        alliances = (fields.get('alliances') or '').lower()
        if rec['primaryTeam'] != 'none' and alliances:
            found = {tid for kw, tid in TEAM_KEYWORDS.items() if kw in alliances}
            if rec['primaryTeam'] not in found:
                flag(rec, 'primaryTeam', rec['primaryTeam'], f'infobox alliances: {fields.get("alliances")}')
        # MCU flag vs cast-section matches
        hits = mcu.get(cid, [])
        if rec['mcu'] and not hits:
            flag(rec, 'mcu', f'true ({rec.get("mcuFirst")})', 'name not found in any MCU cast section (cameo? check)')
        elif not rec['mcu'] and hits:
            flag(rec, 'mcu', 'false', ' | '.join(f'{h["title"]}: …{h["snippet"]}…' for h in hits[:4]))
        elif rec['mcu'] and hits and rec.get('mcuFirst') and hits[0]['title'] != rec['mcuFirst']:
            flag(rec, 'mcuFirst', rec['mcuFirst'], f'earliest cast match: {hits[0]["title"]}: …{hits[0]["snippet"]}…')

    (R / 'discrepancies.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))
    by_field = {}
    for d in out:
        by_field[d['field']] = by_field.get(d['field'], 0) + 1
    print(f'{len(recs)} records checked, {len(out)} discrepancies', by_field)


if __name__ == '__main__':
    main()
