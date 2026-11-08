#!/usr/bin/env python3
"""Pull the Marvel slice of Wikidata (Earth-616 and MCU items) for B-List and Retcon.

Writes content/_research/wd/<name>.json (gitignored). One SPARQL query per relation, so each stays
under the query service's time limit. Usage: python3 scripts/research/blist/fetch_wikidata.py
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'content' / '_research' / 'wd'
UA = 'MarvelousFanGameBuilder/0.1 (content research script; contact via GitHub harry66u/marvelous)'
SET = '?c wdt:P1080 ?u . VALUES ?u { wd:Q2246088 wd:Q642878 }'


def sparql(q):
    for attempt in range(10):
        try:
            req = urllib.request.Request(
                'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': q}),
                headers={'User-Agent': UA, 'Accept': 'application/sparql-results+json'})
            with urllib.request.urlopen(req, timeout=120) as r:
                rows = json.load(r)['results']['bindings']
            time.sleep(65)  # the query service allows about one request a minute from here
            return [{k: v['value'] for k, v in row.items()} for row in rows]
        except Exception as e:  # noqa: BLE001
            print('  retry', attempt, e, file=sys.stderr)
            time.sleep(70)
    raise RuntimeError('query failed')


def done(name):
    return (OUT / f'{name}.json').exists()


qid = lambda url: url.rsplit('/', 1)[-1]

QUERIES = {
    'items': f'''SELECT ?c ?label ?sl ?article ?u WHERE {{ {SET}
        ?c rdfs:label ?label . FILTER(LANG(?label)="en")
        ?c wikibase:sitelinks ?sl .
        OPTIONAL {{ ?article schema:about ?c ; schema:isPartOf <https://en.wikipedia.org/> . }} }}''',
    'aliases': f'''SELECT ?c ?alias WHERE {{ {SET} ?c skos:altLabel ?alias . FILTER(LANG(?alias)="en") }}''',
}
# relation name -> property; values come back with their English label
RELATIONS = {
    'instance': 'P31', 'member': 'P463', 'creator': 'P170', 'enemy': 'P7047', 'ability': 'P2563',
    'occupation': 'P106', 'performer': 'P175', 'birthplace': 'P19',
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, q in QUERIES.items():
        if done(name):
            continue
        rows = sparql(q)
        (OUT / f'{name}.json').write_text(json.dumps(rows))
        print(name, len(rows))
    first_appearance()
    for name, p in RELATIONS.items():
        if done(f'rel_{name}'):
            continue
        rows = sparql(f'''SELECT ?c ?v ?vl ?vsl WHERE {{ {SET} ?c wdt:{p} ?v .
            OPTIONAL {{ ?v rdfs:label ?vl . FILTER(LANG(?vl)="en") }}
            OPTIONAL {{ ?v wikibase:sitelinks ?vsl }} }}''')
        (OUT / f'rel_{name}.json').write_text(json.dumps(rows))
        print(name, len(rows))

def first_appearance():
    if done('first_appearance'):
        return
    # first appearance with the issue's publication date and series
    rows = sparql(f'''SELECT ?c ?issue ?il ?date ?series ?sl2 WHERE {{ {SET} ?c wdt:P4584 ?issue .
        OPTIONAL {{ ?issue rdfs:label ?il . FILTER(LANG(?il)="en") }}
        OPTIONAL {{ ?issue wdt:P577 ?date }}
        OPTIONAL {{ ?issue wdt:P179 ?s . ?s rdfs:label ?series . FILTER(LANG(?series)="en") }} }}''')
    (OUT / 'first_appearance.json').write_text(json.dumps(rows))
    print('first_appearance', len(rows))


if __name__ == '__main__':
    main()
