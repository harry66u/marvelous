#!/usr/bin/env python3
"""Write the launch Unmasked schedule: 90 days from 2026-11-06 (spec section 7 rules).

Launch week is curated with famous answers; the rest follows the weekday difficulty bands
(Mon-Thu 1-3, Fri-Sun 2-4), never repeats an answer (120-day cooldown), and avoids the
same primary team on consecutive days. Deterministic (seeded by date).
Usage: python3 scripts/research/initial_schedule.py
"""
import datetime as dt
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
START, DAYS = dt.date(2026, 11, 6), 90
LAUNCH_WEEK = ['storm', 'spider-man-peter-parker', 'iron-man', 'wolverine', 'thor', 'hulk', 'captain-america']

chars = {c['id']: c for c in json.loads((ROOT / 'content/characters.json').read_text())}
pool = [c for c in chars.values() if c['answerOk']]
for cid in LAUNCH_WEEK:
    assert chars[cid]['answerOk'], cid
used, days, prev_team = set(), {}, None
for i in range(DAYS):
    date = START + dt.timedelta(days=i)
    if i < len(LAUNCH_WEEK):
        pick = chars[LAUNCH_WEEK[i]]
    else:
        lo, hi = (1, 3) if date.isoweekday() <= 4 else (2, 4)
        rng = random.Random(date.isoformat())
        options = sorted((c for c in pool if c['id'] not in used and lo <= c['difficulty'] <= hi
                          and c['primaryTeam'] != prev_team), key=lambda c: c['id'])
        pick = rng.choice(options)
    used.add(pick['id'])
    prev_team = pick['primaryTeam']
    days[date.isoformat()] = {'unmasked': pick['id']}

(ROOT / 'content/schedule.json').write_text(json.dumps({'launchDate': START.isoformat(), 'days': days}, indent=2) + '\n')
diff = {}
for v in days.values():
    d = chars[v['unmasked']]['difficulty']
    diff[d] = diff.get(d, 0) + 1
print(f'{len(days)} days, {len(used)} unique answers, difficulty mix {dict(sorted(diff.items()))}')
