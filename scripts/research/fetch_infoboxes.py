#!/usr/bin/env python3
"""Fetch Wikipedia infobox facts for every Unmasked candidate character.

Reads content/research/candidates.json (and draft sources for title hints),
writes content/research/infoboxes.json:
  {id: {title, url, debut, alter_ego, full_name, alliances, aliases, species, status}}

Usage: python3 scripts/research/fetch_infoboxes.py
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = 'https://en.wikipedia.org/w/api.php'
UA = 'MarvelousFanGameBuilder/0.1 (content research script; contact via GitHub harry66u/marvelous)'
FIELDS = ['debut', 'alter_ego', 'full_name', 'alliances', 'aliases', 'species', 'partners']


def api(params):
    params = {**params, 'format': 'json', 'formatversion': '2'}
    url = API + '?' + urllib.parse.urlencode(params)
    for attempt in range(8):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                time.sleep(0.15)  # stay polite: ~6 requests/second total with 2 workers
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                wait = float(e.headers.get('Retry-After') or 0) or min(60, 4 * (attempt + 1))
                time.sleep(wait)
                continue
            raise
        except Exception:  # noqa: BLE001 - network hiccup, retry
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f'gave up on {url}')


def lead_wikitext(title):
    d = api({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
             'rvsection': '0', 'redirects': '1', 'titles': title})
    pages = d.get('query', {}).get('pages', [])
    if not pages or pages[0].get('missing') or 'revisions' not in pages[0]:
        return None, None
    return pages[0]['title'], pages[0]['revisions'][0]['slots']['main']['content']


def clean(v):
    v = re.sub(r'<ref[^>]*/>', '', v)
    v = re.sub(r'<ref[^>]*>.*?</ref>', '', v, flags=re.S)
    v = re.sub(r'<br\s*/?>', '; ', v)
    v = re.sub(r'\{\{[Pp]lainlist\|', '', v)
    v = re.sub(r'\{\{(?:nowrap|small|sic)\|([^{}]*)\}\}', r'\1', v)
    v = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', v)
    v = re.sub(r"'''?", '', v)
    v = re.sub(r'<[^>]+>', '', v)
    v = re.sub(r'\{\{[^{}]*\}\}', '', v)
    v = re.sub(r'\s*\n\s*\*\s*', '; ', v)
    return re.sub(r'\s+', ' ', v).strip(' ;')


def infobox_fields(text):
    m = re.search(r'\{\{\s*Infobox comics character', text, re.I)
    if not m:
        return None
    # take the infobox body up to the matching closing braces
    depth, i = 0, m.start()
    while i < len(text):
        if text.startswith('{{', i):
            depth += 1
            i += 2
        elif text.startswith('}}', i):
            depth -= 1
            i += 2
            if depth == 0:
                break
        else:
            i += 1
    box = text[m.start():i]
    out = {}
    for key in FIELDS:
        km = re.search(r'\n\s*\|\s*' + key + r'\s*=\s*(.*?)(?=\n\s*\||\n?\}\}$)', box, re.S)
        if km and km.group(1).strip():
            out[key] = clean(km.group(1))[:600]
    return out


def title_candidates(c, drafts):
    name = c['name']
    base = re.sub(r'\s*\(.*\)$', '', name).strip()
    paren = re.search(r'\((.*)\)$', name)
    titles = []
    d = drafts.get(c['id'])
    if d:
        for s in d.get('sources', []):
            if 'en.wikipedia.org/wiki/' in s:
                titles.append(urllib.parse.unquote(s.split('/wiki/', 1)[1]).replace('_', ' ').split('#')[0])
    if paren:
        p = paren.group(1)
        titles += [f'{p} (Marvel Comics)', f'{p} (comics)', p]
    titles += [f'{base} (Marvel Comics)', f'{base} (comics)', f'{base} (character)', base]
    seen, ordered = set(), []
    for t in titles:
        if t not in seen:
            seen.add(t)
            ordered.append(t)
    return ordered


def search_titles(name):
    d = api({'action': 'query', 'list': 'search', 'srsearch': f'{name} Marvel Comics character', 'srlimit': '5'})
    return [r['title'] for r in d.get('query', {}).get('search', [])]


def resolve(c, drafts):
    tried = []
    for t in title_candidates(c, drafts) + ['__SEARCH__']:
        if t == '__SEARCH__':
            for s in search_titles(re.sub(r'[()]', ' ', c['name'])):
                if s in tried:
                    continue
                tried.append(s)
                title, text = lead_wikitext(s)
                if text and (f := infobox_fields(text)) is not None:
                    return {'title': title, 'status': 'search', 'fields': f}
            break
        tried.append(t)
        title, text = lead_wikitext(t)
        if text and (f := infobox_fields(text)) is not None:
            return {'title': title, 'status': 'ok', 'fields': f}
    return {'title': None, 'status': 'not-found', 'fields': {}, 'tried': tried[:8]}


def main():
    cands = json.loads((ROOT / 'content/research/candidates.json').read_text())
    drafts = {}
    for f in (ROOT / 'content/research/draft').glob('B*.json'):
        for rec in json.loads(f.read_text())['characters']:
            drafts[rec['id']] = rec
    out_path = ROOT / 'content/research/infoboxes.json'
    results = json.loads(out_path.read_text()) if out_path.exists() else {}
    todo = [c for c in cands if c['id'] not in results or results[c['id']]['status'] == 'not-found']

    def work(c):
        try:
            r = resolve(c, drafts)
        except Exception as e:  # noqa: BLE001 - record and continue
            return c['id'], {'title': None, 'status': 'not-found', 'fields': {}, 'error': str(e)[:200]}
        if r['title']:
            r['url'] = 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(r['title'].replace(' ', '_'))
        return c['id'], r

    with ThreadPoolExecutor(max_workers=2) as ex:
        for n, (cid, r) in enumerate(ex.map(work, todo), 1):
            results[cid] = r
            if n % 50 == 0:
                print(f'{n}/{len(todo)}', file=sys.stderr)
                out_path.write_text(json.dumps(results, indent=1, ensure_ascii=False))
    out_path.write_text(json.dumps(results, indent=1, ensure_ascii=False))
    stats = {}
    for r in results.values():
        stats[r['status']] = stats.get(r['status'], 0) + 1
    print('done', stats)
    missing = [cid for cid, r in results.items() if r['status'] == 'not-found']
    print('not found:', missing)


if __name__ == '__main__':
    main()
