"""Polite, cached access to the English Wikipedia API for content research scripts.

One request at a time, at least 1.2 s apart, with backoff on 429/5xx. Responses are cached under
content/_research/cache (gitignored), so a rerun costs nothing and an interrupted run resumes.
"""
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'content' / '_research' / 'cache'
API = 'https://en.wikipedia.org/w/api.php'
UA = 'MarvelousFanGameBuilder/0.1 (content research script; contact via GitHub harry66u/marvelous)'
GAP = 1.2
_last = [0.0]


def api(params, cache=True):
    params = {**params, 'format': 'json', 'formatversion': '2'}
    url = API + '?' + urllib.parse.urlencode(sorted(params.items()))
    key = CACHE / (hashlib.sha1(url.encode()).hexdigest() + '.json')
    if cache and key.exists():
        return json.loads(key.read_text())
    for attempt in range(12):
        wait = _last[0] + GAP - time.time()
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                body = r.read()
            data = json.loads(body)
            if cache:
                CACHE.mkdir(parents=True, exist_ok=True)
                key.write_bytes(body)
            return data
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                time.sleep(min(90, 15 * (attempt + 1)))
                continue
            raise
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            # a 429 sometimes arrives as a plain-text body; treat it like one
            time.sleep(min(90, 15 * (attempt + 1)))
    raise RuntimeError(f'gave up on {url}')


def query_all(params):
    """Follow `continue` until done; yields each response page."""
    cont = {}
    while True:
        d = api({**params, **cont, 'action': 'query'})
        yield d
        if 'continue' not in d:
            return
        cont = d['continue']


def category_members(cat, ns=0):
    out = []
    for d in query_all({'list': 'categorymembers', 'cmtitle': cat, 'cmlimit': 500, 'cmnamespace': ns}):
        out += [m['title'] for m in d['query']['categorymembers']]
    return out
