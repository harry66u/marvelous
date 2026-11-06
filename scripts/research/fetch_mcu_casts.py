#!/usr/bin/env python3
"""Build an MCU appearance table from the cast sections of every Marvel Studios
live-action release up to 2026-11-06 (spec section 7, MCU rule).

Writes:
  content/research/mcu_casts.json    {title: {page, released, cast_text}}
  content/research/mcu_matches.json  {character_id: [{title, released, term, snippet}]}

Usage: python3 scripts/research/fetch_mcu_casts.py
"""
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = 'https://en.wikipedia.org/w/api.php'
UA = 'MarvelousFanGameBuilder/0.1 (content research script; contact via GitHub harry66u/marvelous)'

# (display title, Wikipedia page, first U.S. release)
TITLES = [
    ('Iron Man', 'Iron Man (2008 film)', '2008-05-02'),
    ('The Incredible Hulk', 'The Incredible Hulk (film)', '2008-06-13'),
    ('Iron Man 2', 'Iron Man 2', '2010-05-07'),
    ('Thor', 'Thor (film)', '2011-05-06'),
    ('Captain America: The First Avenger', 'Captain America: The First Avenger', '2011-07-22'),
    ('The Avengers', 'The Avengers (2012 film)', '2012-05-04'),
    ('Iron Man 3', 'Iron Man 3', '2013-05-03'),
    ('Thor: The Dark World', 'Thor: The Dark World', '2013-11-08'),
    ('Captain America: The Winter Soldier', 'Captain America: The Winter Soldier', '2014-04-04'),
    ('Guardians of the Galaxy', 'Guardians of the Galaxy (film)', '2014-08-01'),
    ('Avengers: Age of Ultron', 'Avengers: Age of Ultron', '2015-05-01'),
    ('Ant-Man', 'Ant-Man (film)', '2015-07-17'),
    ('Captain America: Civil War', 'Captain America: Civil War', '2016-05-06'),
    ('Doctor Strange', 'Doctor Strange (2016 film)', '2016-11-04'),
    ('Guardians of the Galaxy Vol. 2', 'Guardians of the Galaxy Vol. 2', '2017-05-05'),
    ('Spider-Man: Homecoming', 'Spider-Man: Homecoming', '2017-07-07'),
    ('Thor: Ragnarok', 'Thor: Ragnarok', '2017-11-03'),
    ('Black Panther', 'Black Panther (film)', '2018-02-16'),
    ('Avengers: Infinity War', 'Avengers: Infinity War', '2018-04-27'),
    ('Ant-Man and the Wasp', 'Ant-Man and the Wasp', '2018-07-06'),
    ('Captain Marvel', 'Captain Marvel (film)', '2019-03-08'),
    ('Avengers: Endgame', 'Avengers: Endgame', '2019-04-26'),
    ('Spider-Man: Far From Home', 'Spider-Man: Far From Home', '2019-07-02'),
    ('WandaVision', 'WandaVision', '2021-01-15'),
    ('The Falcon and the Winter Soldier', 'The Falcon and the Winter Soldier', '2021-03-19'),
    ('Loki', 'Loki (TV series)', '2021-06-09'),
    ('Black Widow', 'Black Widow (2021 film)', '2021-07-09'),
    ('Shang-Chi and the Legend of the Ten Rings', 'Shang-Chi and the Legend of the Ten Rings', '2021-09-03'),
    ('Eternals', 'Eternals (film)', '2021-11-05'),
    ('Hawkeye', 'Hawkeye (2021 TV series)', '2021-11-24'),
    ('Spider-Man: No Way Home', 'Spider-Man: No Way Home', '2021-12-17'),
    ('Moon Knight', 'Moon Knight (TV series)', '2022-03-30'),
    ('Doctor Strange in the Multiverse of Madness', 'Doctor Strange in the Multiverse of Madness', '2022-05-06'),
    ('Ms. Marvel', 'Ms. Marvel (TV series)', '2022-06-08'),
    ('Thor: Love and Thunder', 'Thor: Love and Thunder', '2022-07-08'),
    ('She-Hulk: Attorney at Law', 'She-Hulk: Attorney at Law', '2022-08-18'),
    ('Werewolf by Night', 'Werewolf by Night (TV special)', '2022-10-07'),
    ('Black Panther: Wakanda Forever', 'Black Panther: Wakanda Forever', '2022-11-11'),
    ('The Guardians of the Galaxy Holiday Special', 'The Guardians of the Galaxy Holiday Special', '2022-11-25'),
    ('Ant-Man and the Wasp: Quantumania', 'Ant-Man and the Wasp: Quantumania', '2023-02-17'),
    ('Guardians of the Galaxy Vol. 3', 'Guardians of the Galaxy Vol. 3', '2023-05-05'),
    ('Secret Invasion', 'Secret Invasion (TV series)', '2023-06-21'),
    ('The Marvels', 'The Marvels', '2023-11-10'),
    ('Echo', 'Echo (TV series)', '2024-01-09'),
    ('Deadpool & Wolverine', 'Deadpool & Wolverine', '2024-07-26'),
    ('Agatha All Along', 'Agatha All Along', '2024-09-18'),
    ('Captain America: Brave New World', 'Captain America: Brave New World', '2025-02-14'),
    ('Daredevil: Born Again', 'Daredevil: Born Again', '2025-03-04'),
    ('Thunderbolts*', 'Thunderbolts*', '2025-05-02'),
    ('Ironheart', 'Ironheart (TV series)', '2025-06-24'),
    ('The Fantastic Four: First Steps', 'The Fantastic Four: First Steps', '2025-07-25'),
    ('Wonder Man', 'Wonder Man (TV series)', '2026-01-27'),
    ('The Punisher: One Last Kill', 'The Punisher: One Last Kill', '2026-05-12'),
    ('Spider-Man: Brand New Day', 'Spider-Man: Brand New Day', '2026-07-31'),
    ('VisionQuest', 'VisionQuest', '2026-10-13'),
]


def api(params):
    params = {**params, 'format': 'json', 'formatversion': '2'}
    url = API + '?' + urllib.parse.urlencode(params)
    for attempt in range(8):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                time.sleep(0.4)
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(float(e.headers.get('Retry-After') or 0) or min(60, 5 * (attempt + 1)))
                continue
            raise
        except Exception:  # noqa: BLE001
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f'gave up on {url}')


def page_wikitext(page):
    d = api({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
             'redirects': '1', 'titles': page})
    p = d['query']['pages'][0]
    if p.get('missing'):
        return None, None
    return p['title'], p['revisions'][0]['slots']['main']['content']


def strip_markup(t):
    t = re.sub(r'<ref[^>]*/>', '', t)
    t = re.sub(r'<ref[^>]*>.*?</ref>', '', t, flags=re.S)
    t = re.sub(r'\{\{[Ss]fn[^{}]*\}\}', '', t)
    t = re.sub(r'\[\[(?:File|Image):[^\]]*\]\]', '', t)
    t = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', t)
    t = re.sub(r"'''?", '', t)
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'[ \t]+', ' ', t)


def cast_section(text):
    lines = text.split('\n')
    start = None
    for i, line in enumerate(lines):
        if re.match(r'^==\s*(Cast|Cast and characters|Cast and crew|Voice cast)\s*==\s*$', line.strip(), re.I):
            start = i
            break
    if start is None:
        return None
    end = len(lines)
    for j in range(start + 1, len(lines)):
        if re.match(r'^==[^=].*==\s*$', lines[j].strip()):
            end = j
            break
    return strip_markup('\n'.join(lines[start:end]))


def terms_for(c, draft, box):
    name = c['name']
    base = re.sub(r'\s*\(.*\)$', '', name).strip()
    paren = re.search(r'\((.*)\)$', name)
    terms = {base}
    if paren:
        terms.add(paren.group(1))
    real = (draft or {}).get('realName') or (box or {}).get('fields', {}).get('alter_ego', '')
    for r in re.split(r';|/', real or ''):
        r = re.sub(r'\(.*?\)', '', r).strip()
        if len(r) >= 5:
            terms.add(r)
    return sorted(t for t in terms if len(t) >= 3)


def main():
    out_casts = ROOT / 'content/research/mcu_casts.json'
    casts = json.loads(out_casts.read_text()) if out_casts.exists() else {}
    for display, page, released in TITLES:
        if display in casts and casts[display].get('cast_text'):
            continue
        title, text = page_wikitext(page)
        section = cast_section(text) if text else None
        casts[display] = {'page': title, 'released': released, 'cast_text': section or ''}
        print(f'{display}: {"ok" if section else "NO CAST SECTION"} ({len(section or "")} chars)', file=sys.stderr)
        out_casts.write_text(json.dumps(casts, indent=1, ensure_ascii=False))

    cands = json.loads((ROOT / 'content/research/candidates.json').read_text())
    drafts = {}
    for f in (ROOT / 'content/research/draft').glob('B*.json'):
        for rec in json.loads(f.read_text())['characters']:
            drafts[rec['id']] = rec
    boxes_path = ROOT / 'content/research/infoboxes.json'
    boxes = json.loads(boxes_path.read_text()) if boxes_path.exists() else {}

    matches = {}
    for c in cands:
        hits = []
        for term in terms_for(c, drafts.get(c['id']), boxes.get(c['id'])):
            pat = re.compile(r'(?<![A-Za-z])' + re.escape(term) + r'(?![A-Za-z])', re.I)
            for display, released, *_ in [(d, v['released']) for d, v in casts.items()]:
                text = casts[display]['cast_text']
                m = pat.search(text)
                if m:
                    s = max(0, m.start() - 90)
                    hits.append({'title': display, 'released': released, 'term': term,
                                 'snippet': text[s:m.end() + 90].replace('\n', ' ').strip()})
        hits.sort(key=lambda h: h['released'])
        matches[c['id']] = hits
    (ROOT / 'content/research/mcu_matches.json').write_text(json.dumps(matches, indent=1, ensure_ascii=False))
    missing = [d for d, v in casts.items() if not v['cast_text']]
    print('titles without cast section:', missing)
    print('characters with any match:', sum(1 for v in matches.values() if v))


if __name__ == '__main__':
    main()
