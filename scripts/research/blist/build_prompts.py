#!/usr/bin/env python3
"""Build content/blist.json: B-List prompts with complete-as-sourced answer lists and preset tiers.

Sources (all public):
- Wikidata's Earth-616 and MCU items (content/_research/wd/, from fetch_wikidata.py): names, English
  aliases, team memberships, creators, enemies, abilities, species, occupations, first appearances,
  and sitelinks (how many language Wikipedias cover the item: the fame signal).
- content/characters.json: the fact-checked Unmasked characters (teams, real names, aliases).
- content/research/mcu_casts.json: Wikipedia main-cast sections of every MCU title.

Preset tiers (spec section 8): each answer's share of a prompt is estimated from fame, weight =
(1 + sitelinks)^ALPHA, x MCU_BOOST for characters with an MCU counterpart; shares map to tiers by
the spec's pick-rate thresholds (Common >= 10%, Filed 3-10%, Restricted 1-3%, Classified 0.2-1%,
Sealed < 0.2%). Main-cast prompts weight by billing order instead.

Usage: python3 scripts/research/blist/build_prompts.py
"""
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
WD = ROOT / 'content' / '_research' / 'wd'
ALPHA = 1.7
MCU_BOOST = 3.0
MIN_ANSWERS = 8
UNIVERSE_616 = 'Q2246088'
UNIVERSE_MCU = 'Q642878'


def load(name, default=None):
    p = WD / f'{name}.json'
    return json.loads(p.read_text()) if p.exists() else (default if default is not None else [])


qid = lambda url: url.rsplit('/', 1)[-1]


def key(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn').lower()
    s = s.replace('&', ' and ')
    s = re.sub(r"['’‘`.]", '', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s).strip()
    if s.startswith('the '):
        s = s[4:]
    abbr = {'dr': 'doctor', 'mr': 'mister', 'mrs': 'missus', 'ms': 'miss', 'prof': 'professor', 'st': 'saint',
            'capt': 'captain', 'cpt': 'captain', 'sgt': 'sergeant', 'gen': 'general', 'lt': 'lieutenant'}
    return ''.join(abbr.get(w, w) for w in s.split())


def clean_label(label):
    label = re.sub(r'\s*\((?:Marvel Comics|Earth-616|comics|character|Marvel|Marvel Cinematic Universe|MCU)[^)]*\)\s*$', '', label)
    return label.strip()


# ---------------------------------------------------------------- items

CHARACTER_TYPES_EXCLUDED = re.compile(
    r'organization|location|facility|planet|object|weapon|armor|building|residence|apartment|restaurant|'
    r'drinking|store|newspaper|television network|vehicle|device|company|country|city|dimension|battle|'
    r'occurrence|prison|house|mansion|species|class of|team|group of|several fictional characters|'
    r'superhero team|supervillain team|event|storyline|comic|film|series|episode|work', re.I)


class Item:
    __slots__ = ('qid', 'name', 'aliases', 'sitelinks', 'article', 'universes', 'types', 'mcu', 'primary', 'teams')

    def __init__(self, q):
        self.qid, self.name, self.aliases, self.sitelinks = q, None, set(), 0
        self.article, self.universes, self.types, self.mcu = None, set(), set(), False
        self.primary, self.teams = None, set()


def load_items():
    items = {}
    for r in load('items'):
        q = qid(r['c'])
        it = items.setdefault(q, Item(q))
        it.name = clean_label(r['label'])
        it.sitelinks = max(it.sitelinks, int(r['sl']))
        it.universes.add(qid(r['u']))
        if r.get('article'):
            it.article = r['article']
    for r in load('aliases'):
        it = items.get(qid(r['c']))
        if it:
            it.aliases.add(clean_label(r['alias']))
    for r in load('rel_instance'):
        it = items.get(qid(r['c']))
        if it and r.get('vl'):
            it.types.add(r['vl'])
    # Fold in the fact-checked Unmasked data: aliases, real names, and the MCU flag.
    by_key = defaultdict(list)
    for it in items.values():
        if it.name:
            by_key[key(it.name)].append(it)
    team_names = {t['id']: key(t['name']) for t in json.loads((ROOT / 'content/teams.json').read_text())}
    for c in json.loads((ROOT / 'content/characters.json').read_text()):
        for it in by_key.get(key(re.sub(r'\s*\(.*\)$', '', c['name'])), []):
            if UNIVERSE_616 not in it.universes:
                continue
            it.aliases.update(c['aliases'])
            if c.get('realName'):
                it.aliases.add(c['realName'])
            it.mcu = it.mcu or c['mcu']
            it.primary = team_names.get(c['primaryTeam'])
            it.teams = {team_names[t] for t in c['teams'] if t in team_names}
    # MCU counterparts: a 616 character whose name also labels an MCU item counts as on screen.
    mcu_names = {key(it.name) for it in items.values() if it.name and UNIVERSE_MCU in it.universes}
    for it in items.values():
        if it.name and UNIVERSE_616 in it.universes and key(it.name) in mcu_names:
            it.mcu = True
    return items


GROUPS = set()  # qids used as teams or organizations; filled in main()


def is_character(it):
    if not it.name or it.qid in GROUPS or re.search(r"['’]s\b", it.name):
        return False
    if not it.types:
        return True
    return not any(CHARACTER_TYPES_EXCLUDED.search(t) for t in it.types) or any(
        re.search(r'character|human|mutant|mutate|Asgardian|Eternal|Skrull|Kree|Inhuman|deity|demon|vampire|robot|android|cyborg|entity|humanoid', t)
        for t in it.types)


FAMOUS = {}  # key(name) -> fame of the most famous item with that name; filled in main()


def prune_aliases(it):
    keep = set()
    mine = fame(it)
    for a in it.aliases:
        k = key(a)
        if len(k) < 3 or re.search(r"['’]s\b|\d{3,}|\(| and |\bof the\b.*\bof\b", a) or len(a.split()) > 4:
            continue
        if FAMOUS.get(k, 0) > mine and k != key(it.name):
            continue  # another, more famous character answers to this name
        keep.add(a)
    it.aliases = keep


# ---------------------------------------------------------------- tiers

TIER_ORDER = ['common', 'filed', 'restricted', 'classified', 'sealed']


def tier_for(share):
    if share >= 0.10:
        return 'common'
    if share >= 0.03:
        return 'filed'
    if share >= 0.01:
        return 'restricted'
    if share >= 0.002:
        return 'classified'
    return 'sealed'


def finish(answers, weights):
    total = sum(weights) or 1
    out = []
    for a, w in zip(answers, weights):
        share = w / total
        out.append({**a, 'share': round(share, 5), 'tier': tier_for(share)})
    out.sort(key=lambda a: (-a['share'], a['name']))
    return out


def fame(it):
    return (1 + it.sitelinks) ** ALPHA * (MCU_BOOST if it.mcu else 1)


# ---------------------------------------------------------------- answers

def answer_from(it):
    aliases = sorted({a for a in it.aliases if a and key(a) != key(it.name) and len(key(a)) >= 3})
    return {'name': it.name, 'aliases': aliases}


def dedupe(answers_items):
    """One answer per display name; aliases claimed by two answers go to the more famous one."""
    best = {}
    for a, it in answers_items:
        k = key(a['name'])
        if k not in best or fame(it) > fame(best[k][1]):
            best[k] = (a, it)
    pairs = sorted(best.values(), key=lambda p: -fame(p[1]))
    owner = {}
    for a, _ in pairs:
        owner.setdefault(key(a['name']), a['name'])
    for a, _ in pairs:
        kept = []
        for al in a['aliases']:
            k = key(al)
            if k in owner and owner[k] != a['name']:
                continue
            owner[k] = a['name']
            kept.append(al)
        a['aliases'] = kept
    return pairs


def character_prompt(pid, text, category, members, sources, team=None, salience=None):
    pairs = dedupe([(answer_from(it), it) for it in members if it.name])
    if len(pairs) < MIN_ANSWERS:
        return None

    def weight(it):
        # On a team prompt, the team's core members are what most agents would name first.
        boost = 1.0
        if team:
            if it.primary == team:
                boost = 12.0
            elif team in it.teams:
                boost = 3.0
        return fame(it) * boost * (salience.get(it.qid, 1) if salience else 1)

    answers = finish([a for a, _ in pairs], [weight(it) for _, it in pairs])
    # How many answers a casual fan would know: items covered by 15+ language Wikipedias, or on screen.
    renown = sum(1 for _, it in pairs if it.sitelinks >= 15 or it.mcu)
    return {'id': pid, 'text': text, 'category': category, 'answers': answers, 'sources': sources, 'renown': renown}


def slug(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', '-', re.sub(r"['’.]", '', s)).strip('-')


WD_SRC = 'https://www.wikidata.org/wiki/'


def relation(name):
    """value label -> (value qid, [subject qids])"""
    groups = defaultdict(set)
    labels = {}
    for r in load(f'rel_{name}'):
        if not r.get('vl'):
            continue
        v = qid(r['v'])
        labels[v] = clean_label(r['vl'])
        groups[v].add(qid(r['c']))
    return labels, groups


def build_relation_prompts(items, rel, make_text, category, keep=lambda label, n: True, inverse=False):
    labels, groups = relation(rel)
    out = []
    for v, subs in groups.items():
        label = labels[v]
        members = {s for s in subs}
        if inverse:  # enemy is symmetric: also count items that name v's subject as their enemy
            pass
        chars = [items[q] for q in members if q in items and UNIVERSE_616 in items[q].universes and is_character(items[q])]
        if category == 'team':  # add the fact-checked Unmasked memberships
            have = {it.qid for it in chars}
            chars += [it for it in items.values() if key(label) in it.teams and it.qid not in have and is_character(it)]
        if not keep(label, len(chars)):
            continue
        team = key(label) if category == 'team' else None
        p = character_prompt(f'{category}-{slug(label)}', make_text(label), category, chars, [WD_SRC + v], team=team)
        if p:
            out.append(p)
    return out


# ---------------------------------------------------------------- families

THE_SUFFIX = ('s', 'Men', 'Force', 'Flight', 'Club', 'Guard', 'Corps', 'Hand', 'Foundation', 'Ring', 'Four',
              'Six', 'Pack', 'Sons', 'Legion', 'Order', 'Initiative', 'Squad', 'Brigade')
SKIP_ORGS = {'United States Army', 'New York City Police Department', 'Daily Bugle', 'Alchemax',
             'United States Marine Corps', 'United States Navy', 'Central Intelligence Agency',
             'Federal Bureau of Investigation', 'Roxxon', 'Stark Industries', 'Oscorp', 'Fantastic Four Incorporated'}


def team_name(label):
    if label.startswith('The '):
        return 'the ' + label[4:]
    if label.endswith(THE_SUFFIX) or label in ('Generation X', 'Brotherhood of Mutants', 'Masters of Evil', 'Lethal Legion'):
        return 'the ' + label
    return label


def teams(items):
    return build_relation_prompts(
        items, 'member', lambda l: f'Name a member of {team_name(l)}', 'team',
        keep=lambda label, n: label not in SKIP_ORGS and n >= MIN_ANSWERS)


def creators(items):
    return build_relation_prompts(
        items, 'creator', lambda l: f'Name a character co-created by {l}', 'creator',
        keep=lambda label, n: n >= 10 and not label.startswith('Q'))


def enemies(items):
    labels, groups = relation('enemy')
    own = defaultdict(set)  # v -> enemies v itself lists
    for r in load('rel_enemy'):
        own[qid(r['c'])].add(qid(r['v']))
    out = []
    for v, subs in groups.items():
        target = items.get(v)
        if not target or UNIVERSE_616 not in target.universes:
            continue
        members = (subs | own.get(v, set())) - {v}
        chars = [items[q] for q in members if q in items and UNIVERSE_616 in items[q].universes and is_character(items[q])]
        p = character_prompt(f'enemy-{slug(labels[v])}', f'Name an enemy of {team_name(labels[v]) if not is_character(target) else labels[v]}',
                             'enemy', chars, [WD_SRC + v])
        if p:
            out.append(p)
    return out


ABILITIES = {
    'telepathy': 'Name a Marvel telepath',
    'teleportation': 'Name a Marvel character who can teleport',
    'shapeshifting': 'Name a Marvel shapeshifter',
    'healing factor': 'Name a Marvel character with a healing factor',
    'intangibility': 'Name a Marvel character who can turn intangible',
    'pyrokinesis': 'Name a Marvel character with fire powers',
    'telekinesis': 'Name a Marvel telekinetic',
    'reality warping': 'Name a Marvel reality warper',
    'technopathy': 'Name a Marvel character who can control machines with their mind',
    'astral projection': 'Name a Marvel character who can project their astral form',
    'precognition': 'Name a Marvel character who can see the future',
    'electrokinesis': 'Name a Marvel character with electric powers',
}

SPECIES = {
    'mutant': 'Name a Marvel mutant',
    'Asgardian': 'Name an Asgardian',
    'Eternal': 'Name one of the Eternals',
    'Skrull': 'Name a Skrull',
    'Kree': 'Name a Kree',
    'Inhuman': 'Name an Inhuman',
    "Shi'ar": "Name a Shi'ar",
    'vampire in Marvel Universe': 'Name a Marvel vampire',
    'fictional demon': 'Name a Marvel demon',
    'fictional deity': 'Name a god or goddess from Marvel Comics',
    'fictional robot': 'Name a Marvel robot',
    'cyborg in a work of fiction': 'Name a Marvel cyborg',
    'fictional android': 'Name a Marvel android',
    'cosmic entity': 'Name a Marvel cosmic entity',
    'Symbiote': 'Name a symbiote',
    'gamma mutate': 'Name a character powered by gamma radiation',
    'mutate': 'Name a Marvel mutate (powers from an outside accident or experiment)',
    'fictional clone': 'Name a Marvel clone',
    'supersoldier': 'Name a Marvel super-soldier',
}


def by_label_map(items, rel, table, category):
    labels, groups = relation(rel)
    by_label = {labels[v]: (v, subs) for v, subs in groups.items()}
    # How many values each character has for this relation: a power that is one of two defines a
    # character far more than one of twelve, so it is what agents would think of first.
    breadth = Counter(qid(r['c']) for r in load(f'rel_{rel}'))
    out = []
    for label, text in table.items():
        if label not in by_label:
            continue
        v, subs = by_label[label]
        chars = [items[q] for q in subs if q in items and UNIVERSE_616 in items[q].universes and is_character(items[q])]
        salience = {it.qid: 1 / max(1, breadth[it.qid]) ** 1.5 for it in chars} if rel == 'ability' else None
        p = character_prompt(f'{category}-{slug(label)}', text, category, chars, [WD_SRC + v], salience=salience)
        if p:
            out.append(p)
    return out


# ---------------------------------------------------------------- MCU main casts

CAST_LINE = re.compile(r"^\*\s*(?P<actor>[^*]+?)\s+(?:as|voices|portrays)\s+(?P<role>[^:]+?)(?::|$)")


def parse_cast(text):
    rows = []
    for line in text.split('\n'):
        line = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', line)
        line = re.sub(r'<ref[^>]*/>|<ref[^>]*>.*?</ref>|\{\{[^{}]*\}\}', '', line).strip()
        m = CAST_LINE.match(line)
        if not m:
            continue
        actor = m['actor'].strip().strip("'")
        role = re.sub(r'\s*\(.*?\)', '', m['role']).strip().strip("'")
        roles = [r.strip() for r in re.split(r'\s+and\s+|,\s*', role) if r.strip()]
        rows.append((actor, roles))
    return rows


def mcu_prompts():
    casts = json.loads((ROOT / 'content/research/mcu_casts.json').read_text())
    out = []
    for title, v in casts.items():
        rows = parse_cast(v.get('cast_text', ''))
        src = ['https://en.wikipedia.org/wiki/' + v['page'].replace(' ', '_')]
        chars, actors = [], []
        for rank, (actor, roles) in enumerate(rows, 1):
            w = 1 / rank ** 1.4
            for role in roles[:1]:
                parts = [p.strip().strip('"') for p in role.split(' / ') if p.strip()]
                if not parts:
                    continue
                name = parts[-1]
                aliases = [p for p in parts[:-1]]
                # "James "Rhodey" Rhodes" also answers to "Rhodey"
                for p in parts:
                    nick = re.findall(r'"([^"]+)"', p)
                    aliases += nick
                aliases = [re.sub(r'"[^"]+"\s*', '', a).strip() for a in aliases]
                chars.append(({'name': re.sub(r'"[^"]+"\s*', '', name).strip(), 'aliases': sorted(set(a for a in aliases if a))}, w))
            surname = actor.split()[-1] if len(actor.split()) > 1 else None
            actors.append(({'name': actor, 'aliases': [surname] if surname and len(surname) > 3 else []}, w))
        kind = 'series' if v['page'].endswith(('series)', 'miniseries)')) or title in (
            'WandaVision', 'The Falcon and the Winter Soldier', 'Agatha All Along', 'Daredevil: Born Again', 'VisionQuest',
            'She-Hulk: Attorney at Law') else 'title'
        shown = f"{title} ({v['released'][:4]})"
        for what, rows_, text in (
            ('cast', chars, f'Name a main-cast character in {shown}'),
            ('actor', actors, f'Name an actor from the main cast of {shown}'),
        ):
            seen, uniq = {}, []
            for a, w in rows_:
                k = key(a['name'])
                if k and k not in seen:
                    seen[k] = True
                    uniq.append((a, w))
            # surnames shared by two actors are dropped
            counts = Counter(key(al) for a, _ in uniq for al in a['aliases'])
            for a, _ in uniq:
                a['aliases'] = [al for al in a['aliases'] if counts[key(al)] == 1 and key(al) not in seen]
            if len(uniq) < 6:
                continue
            answers = finish([a for a, _ in uniq], [w for _, w in uniq])
            out.append({'id': f'mcu-{what}-{slug(title)}', 'text': text, 'category': f'mcu-{what}', 'answers': answers, 'sources': src})
    return out


# ---------------------------------------------------------------- name wordplay

STARTS = ['Captain', 'Doctor', 'Black', 'Iron', 'Silver', 'Mister', 'Baron', 'King', 'Lady', 'Madame', 'Red',
          'Blue', 'Green', 'White', 'Dark', 'Kid', 'Ultra', 'Super', 'Star', 'Night', 'Death', 'Blood', 'Shadow',
          'Fire', 'Thunder', 'Storm', 'Golden', 'Big', 'Crimson', 'Count', 'Lord', 'Miss', 'General', 'Professor',
          'Agent', 'Sister', 'Major', 'Princess', 'Queen', 'Ghost', 'Steel', 'Mad', 'Moon', 'Sun', 'War', 'Wonder']
ENDS = {'man': 'ends in "-man"', 'woman': 'ends in "-woman"', 'girl': 'ends in "-girl"', 'boy': 'ends in "-boy"',
        'master': 'ends in "-master"', 'king': 'ends in "-king"'}
CONTAINS = {
    'an animal': ['spider', 'ant', 'wasp', 'hawk', 'cat', 'wolf', 'lion', 'tiger', 'panther', 'bird', 'falcon',
                  'eagle', 'owl', 'vulture', 'rhino', 'scorpion', 'lizard', 'beetle', 'jackal', 'fox', 'snake', 'cobra',
                  'viper', 'python', 'bat', 'bear', 'bull', 'shark', 'octopus', 'squid', 'crow', 'raven', 'hornet',
                  'mantis', 'moth', 'leopard', 'jaguar', 'puma', 'lynx', 'gorilla', 'ape', 'kangaroo', 'rat',
                  'mongoose', 'hyena', 'boar', 'stag', 'unicorn', 'dragon', 'griffin', 'phoenix', 'beaver', 'squirrel',
                  'goat', 'ram', 'ox', 'yak', 'swan', 'dove', 'mockingbird', 'hummingbird', 'locust', 'cricket',
                  'grasshopper', 'firefly', 'tarantula', 'gecko', 'chameleon', 'turtle', 'frog', 'toad', 'eel',
                  'piranha', 'whale', 'dolphin', 'walrus', 'buzzard', 'condor', 'kestrel', 'sparrow', 'hound', 'dog',
                  'horse', 'stallion', 'mustang', 'colt', 'elephant', 'mammoth', 'tick', 'flea', 'bee', 'worm', 'slug'],
    'a color': ['red', 'blue', 'green', 'black', 'white', 'grey', 'gray', 'silver', 'gold', 'golden', 'crimson',
                'scarlet', 'purple', 'violet', 'yellow', 'orange', 'pink', 'brown', 'indigo', 'jade', 'emerald',
                'ruby', 'sapphire', 'onyx', 'ivory', 'ebony', 'copper', 'bronze', 'amber', 'magenta', 'cyan', 'azure'],
    'a metal': ['iron', 'steel', 'silver', 'gold', 'golden', 'titanium', 'adamantium', 'vibranium', 'copper',
                'bronze', 'platinum', 'mercury', 'cobalt', 'chrome', 'lead', 'tin', 'nickel', 'zinc', 'uranium', 'metal'],
    'a body part': ['hand', 'fist', 'head', 'heart', 'eye', 'skull', 'bone', 'arm', 'face', 'claw', 'tooth',
                    'teeth', 'fang', 'brain', 'blood', 'skin', 'nail', 'tongue', 'lip', 'foot', 'leg', 'wing', 'tail',
                    'spine', 'knuckle', 'jaw', 'mouth', 'brow', 'mind'],
    'a royal or noble title': ['king', 'queen', 'prince', 'princess', 'baron', 'baroness', 'count', 'countess', 'lord',
                               'lady', 'duke', 'duchess', 'emperor', 'empress', 'sultan', 'czar', 'tsar', 'khan',
                               'majesty', 'monarch', 'regent', 'sire', 'dame', 'sir', 'earl', 'marquis', 'pharaoh'],
    'a military rank': ['captain', 'major', 'general', 'colonel', 'sergeant', 'commander', 'admiral', 'lieutenant',
                        'private', 'corporal', 'marshal', 'commodore', 'cadet', 'warrant', 'brigadier', 'ensign'],
    'a word from outer space': ['star', 'moon', 'sun', 'comet', 'nova', 'galaxy', 'galactic', 'cosmic', 'cosmo', 'nebula',
                                'mars', 'venus', 'saturn', 'jupiter', 'quasar', 'pulsar', 'meteor', 'meteorite', 'solar',
                                'lunar', 'eclipse', 'orbit', 'astro', 'planet', 'asteroid', 'starlight', 'stellar',
                                'supernova', 'void', 'space', 'universe', 'celestial', 'zodiac', 'orion', 'polaris'],
    'a weapon': ['sword', 'blade', 'dagger', 'arrow', 'bow', 'gun', 'spear', 'axe', 'hammer', 'shield', 'whip',
                 'knife', 'lance', 'scythe', 'bullet', 'bomb', 'cannon', 'rocket', 'missile', 'mace', 'saber', 'sabre',
                 'trident', 'pistol', 'rifle', 'grenade', 'boomerang', 'sling', 'crossbow', 'cleaver', 'katana', 'machete'],
    'a job title': ['doctor', 'professor', 'nurse', 'judge', 'sheriff', 'ranger', 'hunter', 'knight', 'ninja', 'samurai',
                    'monk', 'priest', 'witch', 'wizard', 'sorcerer', 'sorceress', 'agent', 'soldier', 'pilot',
                    'trapster', 'tinkerer', 'jester', 'clown', 'executioner', 'enchantress', 'magician', 'guardian',
                    'sentry', 'watcher', 'collector', 'grandmaster', 'gladiator', 'mercenary', 'assassin', 'ringmaster'],
    'a weather word': ['storm', 'thunder', 'lightning', 'rain', 'snow', 'ice', 'frost', 'blizzard', 'cyclone',
                       'tornado', 'hurricane', 'typhoon', 'wind', 'cloud', 'fog', 'mist', 'hail', 'sleet', 'sun',
                       'sunfire', 'sunspot', 'heat', 'chill', 'tempest', 'monsoon', 'whirlwind', 'gale'],
}


def name_pool(items):
    """(display name, item) for every 616 character name and alias."""
    pool = []
    for it in items.values():
        if not it.name or UNIVERSE_616 not in it.universes or not is_character(it):
            continue
        for n in [it.name, *it.aliases]:
            if not n or not 3 <= len(n) <= 40 or re.search(r'\(|Earth-|\d{4}', n) or n[:1].islower():
                continue
            # aliases must look like names, not epithets ("God of Thunder", "Merc with a Mouth")
            if n != it.name and any(w[:1].islower() for w in re.split(r'[\s]+', n)):
                continue
            pool.append((n, it))
    return pool


def words(name):
    return re.findall(r'[a-z]+', name.lower().replace("'", ''))


def _ends(n, end):
    # codename-style endings only: "Iron Man", "Spider-Man", "Sandman"; not surnames like "Rushman"
    parts = re.split(r'[\s-]+', n.strip())
    last = parts[-1].lower()
    if end == 'man' and last.endswith('woman'):
        return False
    return last == end or (len(parts) == 1 and last.endswith(end) and len(last) > len(end) + 1)


def wordplay(items):
    pool = name_pool(items)
    out = []

    def make(pid, text, test):
        per_item = defaultdict(list)
        for n, it in pool:
            if test(n):
                per_item[it.qid].append((n, it))
        # One answer per character: its main name if that fits, else its shortest matching alias.
        owner = {}
        pairs = []
        for q, names in sorted(per_item.items(), key=lambda kv: -fame(kv[1][0][1])):
            it = names[0][1]
            ns = [n for n, _ in names]
            main_name = it.name if it.name in ns else min(ns, key=len)
            forms = [n for n in dict.fromkeys([main_name, *ns]) if key(n) not in owner]
            if not forms or forms[0] != main_name:
                continue
            for n in forms:
                owner[key(n)] = q
            pairs.append(({'name': main_name, 'aliases': forms[1:]}, it))
        if len(pairs) < MIN_ANSWERS:
            return
        # An alias is a far less likely answer than a character's main name.
        answers = finish([a for a, _ in pairs], [fame(it) * (1 if a['name'] == it.name else 0.03) for a, it in pairs])
        out.append({'id': pid, 'text': text, 'category': 'wordplay', 'answers': answers,
                    'sources': ['https://www.wikidata.org/'], 'notes': 'Answers are Marvel character names and aliases on file at Wikidata.'})

    for w in STARTS:
        lw = w.lower()
        make(f'starts-{slug(w)}', f'Name a Marvel character whose name starts with "{w}"', lambda n, lw=lw: (words(n) or [''])[0] == lw)
    for end, label in ENDS.items():
        make(f'ends-{end}', f'Name a Marvel character whose name {label}',
             lambda n, end=end: _ends(n, end))
    for label, vocab in CONTAINS.items():
        vs = set(vocab)
        make(f'contains-{slug(label)}', f'Name a Marvel character whose name contains {label}',
             lambda n, vs=vs: any(w in vs for w in words(n)) or any(re.fullmatch(rf'({"|".join(vs)})(man|woman|girl|boy|s|es)?', w) for w in words(n)))
    return out


# ---------------------------------------------------------------- combinations

OVERLAPS = [
    ('X-Men', 'New Mutants'), ('X-Men', 'X-Force'), ('Avengers', 'Defenders'), ('X-Men', 'Brotherhood of Mutants'),
    ('Excalibur', 'X-Men'), ('X-Men', 'X-Factor'), ('X-Men', 'Hellfire Club'), ('Thunderbolts', 'Masters of Evil'),
    ('Avengers', 'The Fantastic Four'), ('Hellions', 'New Mutants'),
]


def overlaps(items):
    labels, groups = relation('member')
    by_label = {labels[v]: v for v in groups}
    out = []
    for a, b in OVERLAPS:
        if a not in by_label or b not in by_label:
            continue
        sa, sb = groups[by_label[a]], groups[by_label[b]]
        chars = [items[q] for q in sa & sb if q in items and is_character(items[q])]
        chars += [it for it in items.values() if key(a) in it.teams and key(b) in it.teams and it.qid not in sa & sb and is_character(it)]
        p = character_prompt(f'both-{slug(a)}-{slug(b)}', f'Name a character who has been a member of both {team_name(a)} and {team_name(b)}',
                             'team-pair', chars, [WD_SRC + by_label[a], WD_SRC + by_label[b]])
        if p:
            out.append(p)
    return out


CREATOR_PAIRS = [('Stan Lee', 'Jack Kirby'), ('Stan Lee', 'Steve Ditko'), ('Dave Cockrum', 'Chris Claremont'),
                 ('John Byrne', 'Chris Claremont'), ('Stan Lee', 'John Romita Sr.'), ('Stan Lee', 'Don Heck'),
                 ('Louise Simonson', 'June Brigman'), ('Roy Thomas', 'Werner Roth'), ('Roy Thomas', 'Neal Adams'),
                 ('Chris Claremont', 'Sal Buscema'), ('Rob Liefeld', 'Fabian Nicieza'), ('Roy Thomas', 'John Buscema'),
                 ('Bill Mantlo', 'Sal Buscema'), ('Joss Whedon', 'John Cassaday')]


def creator_pairs(items):
    labels, groups = relation('creator')
    by_label = {labels[v]: v for v in groups}
    out = []
    for a, b in CREATOR_PAIRS:
        if a not in by_label or b not in by_label:
            continue
        both = groups[by_label[a]] & groups[by_label[b]]
        chars = [items[q] for q in both if q in items and is_character(items[q])]
        p = character_prompt(f'creators-{slug(a)}-{slug(b)}', f'Name a character co-created by {a} and {b}', 'creator-pair',
                             chars, [WD_SRC + by_label[a], WD_SRC + by_label[b]])
        if p:
            out.append(p)
    return out


OCCUPATIONS = {
    'circus performer': 'Name a Marvel character who has worked in a circus',
    'private investigator': 'Name a Marvel private investigator',
    'reporter': 'Name a Marvel reporter or journalist',
    'astronaut': 'Name a Marvel astronaut',
    'lawyer': 'Name a Marvel lawyer',
    'ruler': 'Name a Marvel monarch or ruler',
    'mercenary': 'Name a Marvel mercenary',
    'contract killer': 'Name a Marvel assassin',
    'crime boss': 'Name a Marvel crime boss',
    'geneticist': 'Name a Marvel geneticist',
    'herald': 'Name a herald of Galactus or another cosmic master',
    'physician': 'Name a Marvel medical doctor',
    'magician': 'Name a Marvel stage magician or illusionist',
    'teacher': 'Name a Marvel teacher',
    'aircraft pilot': 'Name a Marvel pilot',
}

PHASES = {
    'Phase One': ['Iron Man', 'The Incredible Hulk', 'Iron Man 2', 'Thor', 'Captain America: The First Avenger', 'The Avengers'],
    'Phase Two': ['Iron Man 3', 'Thor: The Dark World', 'Captain America: The Winter Soldier', 'Guardians of the Galaxy',
                  'Avengers: Age of Ultron', 'Ant-Man'],
    'Phase Three': ['Captain America: Civil War', 'Doctor Strange', 'Guardians of the Galaxy Vol. 2', 'Spider-Man: Homecoming',
                    'Thor: Ragnarok', 'Black Panther', 'Avengers: Infinity War', 'Ant-Man and the Wasp', 'Captain Marvel',
                    'Avengers: Endgame', 'Spider-Man: Far From Home'],
}
SERIES_TITLES = {'WandaVision', 'The Falcon and the Winter Soldier', 'Loki', 'Hawkeye', 'Moon Knight', 'Ms. Marvel',
                 'She-Hulk: Attorney at Law', 'Secret Invasion', 'Echo', 'Agatha All Along', 'Daredevil: Born Again',
                 'Ironheart', 'Wonder Man', 'VisionQuest'}
FRANCHISES = {
    'the Iron Man films': ['Iron Man', 'Iron Man 2', 'Iron Man 3'],
    'the Thor films': ['Thor', 'Thor: The Dark World', 'Thor: Ragnarok', 'Thor: Love and Thunder'],
    'the Captain America films': ['Captain America: The First Avenger', 'Captain America: The Winter Soldier',
                                  'Captain America: Civil War', 'Captain America: Brave New World'],
    'the Guardians of the Galaxy films': ['Guardians of the Galaxy', 'Guardians of the Galaxy Vol. 2', 'Guardians of the Galaxy Vol. 3'],
    'the MCU Spider-Man films': ['Spider-Man: Homecoming', 'Spider-Man: Far From Home', 'Spider-Man: No Way Home', 'Spider-Man: Brand New Day'],
    'the Avengers films': ['The Avengers', 'Avengers: Age of Ultron', 'Avengers: Infinity War', 'Avengers: Endgame'],
    'the Ant-Man films': ['Ant-Man', 'Ant-Man and the Wasp', 'Ant-Man and the Wasp: Quantumania'],
    'the Black Panther films': ['Black Panther', 'Black Panther: Wakanda Forever'],
    'the Doctor Strange films': ['Doctor Strange', 'Doctor Strange in the Multiverse of Madness'],
}


def mcu_titles():
    casts = json.loads((ROOT / 'content/research/mcu_casts.json').read_text())
    released = {t: v['released'] for t, v in casts.items()}
    films = [t for t in casts if t not in SERIES_TITLES and 'Special' not in t and 'Werewolf' not in t and 'One Last Kill' not in t]
    out = []
    src = ['https://en.wikipedia.org/wiki/List_of_Marvel_Cinematic_Universe_films']

    def titles_prompt(pid, text, titles):
        if len(titles) < 5:
            return
        # Older and tentpole titles come to mind first: weight by age.
        ws = [1 + (2026 - int(released[t][:4])) ** 1.3 + (8 if t.startswith(('Avengers', 'The Avengers')) else 0) for t in titles]
        answers = []
        for t in titles:
            aliases = []
            if ':' in t:
                aliases.append(t.split(':', 1)[1].strip())
            if t.startswith('The '):
                aliases.append(t[4:])
            answers.append({'name': t, 'aliases': aliases})
        # drop aliases that collide
        counts = Counter(key(a) for x in answers for a in x['aliases'])
        names = {key(x['name']) for x in answers}
        for x in answers:
            x['aliases'] = [a for a in x['aliases'] if counts[key(a)] == 1 and key(a) not in names]
        out.append({'id': pid, 'text': text, 'category': 'mcu-titles', 'answers': finish(answers, ws), 'sources': src})

    for phase, ts in PHASES.items():
        titles_prompt(f'mcu-{slug(phase)}', f'Name an MCU film from {phase}', [t for t in ts if t in casts])
    titles_prompt('mcu-films-2010s', 'Name an MCU film released in the 2010s', [t for t in films if released[t][:3] == '201'])
    titles_prompt('mcu-films-2020s', 'Name an MCU film released in the 2020s', [t for t in films if released[t][:3] == '202'])
    titles_prompt('mcu-disney-series', 'Name an MCU series made for Disney+', [t for t in casts if t in SERIES_TITLES])
    return out


def mcu_franchises():
    casts = json.loads((ROOT / 'content/research/mcu_casts.json').read_text())
    out = []
    for label, titles in FRANCHISES.items():
        chars, actors = {}, {}
        for t in titles:
            if t not in casts:
                continue
            for rank, (actor, roles) in enumerate(parse_cast(casts[t].get('cast_text', '')), 1):
                w = 1 / rank ** 1.4
                if roles:
                    parts = [re.sub(r'"[^"]+"\s*', '', p).strip() for p in roles[0].split(' / ') if p.strip()]
                    if parts:
                        k = key(parts[-1])
                        prev = chars.get(k)
                        chars[k] = ({'name': parts[-1], 'aliases': sorted(set(parts[:-1]) | set(prev[0]['aliases'] if prev else []))},
                                    (prev[1] if prev else 0) + w)
                k = key(actor)
                actors[k] = ({'name': actor, 'aliases': []}, (actors[k][1] if k in actors else 0) + w)
        src = ['https://en.wikipedia.org/wiki/' + casts[t]['page'].replace(' ', '_') for t in titles if t in casts]
        for what, table, text in (('cast', chars, f'Name a main-cast character from {label}'),
                                  ('actor', actors, f'Name an actor from the main cast of {label}')):
            if len(table) < 8:
                continue
            pairs = list(table.values())
            counts = Counter(key(a) for x, _ in pairs for a in x['aliases'])
            for x, _ in pairs:
                x['aliases'] = [a for a in x['aliases'] if counts[key(a)] == 1 and key(a) not in table]
            out.append({'id': f'mcu-{what}-{slug(label)}', 'text': text, 'category': f'mcu-{what}',
                        'answers': finish([x for x, _ in pairs], [w for _, w in pairs]), 'sources': src})
    return out


# ---------------------------------------------------------------- debuts

def debut_index(items):
    """qid -> (year, series) for Earth-616 characters; fact-checked Unmasked debuts win."""
    out = {}
    for r in load('first_appearance'):
        q = qid(r['c'])
        it = items.get(q)
        if not it or UNIVERSE_616 not in it.universes or not r.get('date'):
            continue
        year = int(r['date'][:4])
        series = re.sub(r'\s*(?:#|vol\.?|volume).*$', '', r.get('il') or '', flags=re.I).strip()
        if 1939 <= year <= 2026 and (q not in out or year < out[q][0]):
            out[q] = (year, series)
    by_key = defaultdict(list)
    for it in items.values():
        if it.name and UNIVERSE_616 in it.universes:
            by_key[key(it.name)].append(it)
    for c in json.loads((ROOT / 'content/characters.json').read_text()):
        for it in by_key.get(key(re.sub(r'\s*\(.*\)$', '', c['name'])), []):
            series = re.sub(r'\s*(?:#|vol\.?|volume).*$', '', c['debutIssue'], flags=re.I).strip()
            out[it.qid] = (c['debutYear'], series)
    return out


SERIES_ALIASES = {'Uncanny X-Men': 'X-Men', 'The Uncanny X-Men': 'X-Men', 'The X-Men': 'X-Men',
                  'The Incredible Hulk': 'Incredible Hulk', 'The Avengers': 'Avengers', 'The Mighty Thor': 'Thor',
                  'The Amazing Spider-Man': 'The Amazing Spider-Man', 'Amazing Spider-Man': 'The Amazing Spider-Man',
                  'The New Mutants': 'New Mutants', 'The Fantastic Four': 'Fantastic Four'}
SERIES_TEXT = {'X-Men': 'X-Men (later Uncanny X-Men)'}


def debuts(items):
    idx = debut_index(items)
    out = []
    decades = defaultdict(list)
    years = defaultdict(list)
    series = defaultdict(list)
    for q, (year, ser) in idx.items():
        it = items[q]
        if not is_character(it):
            continue
        decades[year // 10 * 10].append(it)
        years[year].append(it)
        if ser:
            series[SERIES_ALIASES.get(ser, ser)].append(it)
    src = ['https://www.wikidata.org/wiki/Property:P4584']
    for d, chars in sorted(decades.items()):
        if not 1950 <= d <= 1980:
            continue  # sources only list a fraction of the 1940s and post-1990 debuts
        label = f"{d}s" if d < 2000 else f"{d}s"
        p = character_prompt(f'debut-{d}s', f'Name a Marvel character who first appeared in the {label}', 'debut-decade', chars, src)
        if p:
            out.append(p)
    for y, chars in sorted(years.items()):
        if len(chars) < 10 or y > 1989:
            continue
        p = character_prompt(f'debut-{y}', f'Name a Marvel character who first appeared in {y}', 'debut-year', chars, src)
        if p:
            out.append(p)
    for ser, chars in series.items():
        if len(chars) < 10 or not ser or re.search(r'Saga|Universe|Phase|film|Episode|Pilot', ser):
            continue
        p = character_prompt(f'debut-in-{slug(ser)}', f'Name a character who first appeared in an issue of {SERIES_TEXT.get(ser, ser)}',
                             'debut-series', chars, src)
        if p:
            out.append(p)
    return out


def decade_slices(items, families):
    """Strong lists cut by debut decade: "an X-Men member who first appeared in the 1970s"."""
    idx = debut_index(items)
    by_name, shared = {}, Counter()
    for it in items.values():
        if it.name and UNIVERSE_616 in it.universes and is_character(it):
            shared[key(it.name)] += 1
    for it in items.values():
        if it.name and UNIVERSE_616 in it.universes and it.qid in idx and shared[key(it.name)] == 1:
            by_name[key(it.name)] = it
    out = []
    targets = [
        ('team-x-men', 'Name an X-Men member who first appeared in the {d}'),
        ('team-avengers', 'Name an Avengers member who first appeared in the {d}'),
        ('enemy-spider-man', 'Name a Spider-Man enemy who first appeared in the {d}'),
        ('enemy-x-men', 'Name an X-Men enemy who first appeared in the {d}'),
        ('species-mutant', 'Name a mutant who first appeared in the {d}'),
        ('creator-chris-claremont', 'Name a Chris Claremont co-creation from the {d}'),
    ]
    prompts = {p['id']: p for p in families}
    for pid, template in targets:
        base = prompts.get(pid)
        if not base:
            continue
        per = defaultdict(list)
        for a in base['answers']:
            it = by_name.get(key(a['name']))
            if it and it.qid in idx:
                per[idx[it.qid][0] // 10 * 10].append(it)
        for d, chars in per.items():
            if not 1960 <= d <= 1980:
                continue
            p = character_prompt(f'{pid}-{d}s', template.format(d=f'{d}s'), 'decade-slice', chars, base['sources'])
            if p:
                out.append(p)
    return out


# ---------------------------------------------------------------- MCU introductions

def mcu_introductions(items):
    casts = json.loads((ROOT / 'content/research/mcu_casts.json').read_text())
    year = {t: v['released'][:4] for t, v in casts.items()}
    first = {}
    for r in load('first_appearance'):
        it = items.get(qid(r['c']))
        if not it or UNIVERSE_MCU not in it.universes or not r.get('date') or not r.get('il'):
            continue
        t = r['il'].strip()
        if t not in casts:
            continue
        if it.qid not in first or r['date'] < first[it.qid][1]:
            first[it.qid] = (t, r['date'])
    by_title = defaultdict(list)
    for q, (t, _) in first.items():
        it = items[q]
        if it.name and is_character(it) and not re.search(r"['’]s\b|\(|Realm|Universe|Dimension", it.name):
            by_title[t].append(it)
    out = []
    for t, chars in by_title.items():
        kind = 'series' if t in SERIES_TITLES else 'film'
        p = character_prompt(f'mcu-intro-{slug(t)}', f'Name a character the MCU introduced in {t} ({year[t]})', 'mcu-intro',
                             chars, ['https://www.wikidata.org/wiki/Property:P4584'])
        if p:
            out.append(p)
    return out


# ---------------------------------------------------------------- main

def difficulty(p):
    renown = p.pop('renown', None)
    if renown is None:  # MCU prompts: main casts and film titles are widely known
        return 2 if p['category'] in ('mcu-intro',) else 1
    return 1 if renown >= 6 else 2 if renown >= 3 else 3


def main():
    items = load_items()
    for rel in ('member',):
        for r in load(f'rel_{rel}'):
            GROUPS.add(qid(r['v']))
    for it in items.values():
        if it.name:
            k = key(it.name)
            FAMOUS[k] = max(FAMOUS.get(k, 0), fame(it))
    for it in items.values():
        prune_aliases(it)
    families = {
        'team': teams(items), 'enemy': enemies(items), 'creator': creators(items),
        'ability': by_label_map(items, 'ability', ABILITIES, 'ability'),
        'species': by_label_map(items, 'instance', SPECIES, 'species'),
        'mcu': mcu_prompts(), 'wordplay': wordplay(items),
        'team-pair': overlaps(items), 'creator-pair': creator_pairs(items),
        'occupation': by_label_map(items, 'occupation', OCCUPATIONS, 'occupation'),
        'mcu-titles': mcu_titles(), 'mcu-franchise': mcu_franchises(),
        'debut': debuts(items), 'mcu-intro': mcu_introductions(items),
    }
    base = [p for ps in families.values() for p in ps]
    families['decade-slice'] = decade_slices(items, base)
    prompts, seen_ids, seen_text = [], set(), set()
    for fam, ps in families.items():
        for p in ps:
            if p['id'] in seen_ids or p['text'] in seen_text:
                continue
            seen_ids.add(p['id'])
            seen_text.add(p['text'])
            p['difficulty'] = difficulty(p)
            prompts.append(p)
        print(f'{fam:10} {len(ps)}')
    prompts.sort(key=lambda p: p['id'])
    (ROOT / 'content/blist.json').write_text(json.dumps(prompts, ensure_ascii=False, indent=1) + '\n')
    tiers = Counter(a['tier'] for p in prompts for a in p['answers'])
    print(f'blist: {len(prompts)} prompts, {sum(len(p["answers"]) for p in prompts)} answers', dict(tiers))
    print('difficulty', Counter(p['difficulty'] for p in prompts))


if __name__ == '__main__':
    main()
