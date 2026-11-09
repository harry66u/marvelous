#!/usr/bin/env python3
"""Give every Unmasked character a "world": the broad corner of Marvel they belong to.

Ten worlds a casual fan recognizes (Avengers, X-Men, Spider-Man, Fantastic Four, Cosmic, Asgard,
Mystic, Street level, Agencies) replace the 70-team affiliation clue. A character's world comes
from their primary team, then from hand-made calls for characters with no team or whose own corner
of Marvel is not their team's (Spider-Man is an Avenger but belongs to the Spider-Man world).

Usage: python3 scripts/research/unmasked/assign_worlds.py
"""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

TEAM_WORLD = {
    'avengers': 'avengers', 'young-avengers': 'avengers', 'dark-avengers': 'avengers', 'champions': 'avengers',
    'masters-of-evil': 'avengers', 'thunderbolts': 'avengers', 'invaders': 'avengers', 'great-lakes-avengers': 'avengers',
    'wrecking-crew': 'avengers', 'new-warriors': 'avengers', 'runaways': 'avengers', 'power-pack': 'avengers',
    'cabal': 'avengers', 'wakanda': 'avengers', 'dora-milaje': 'avengers',
    'x-men': 'x-men', 'new-mutants': 'x-men', 'brotherhood-of-mutants': 'x-men', 'x-force': 'x-men', 'x-factor': 'x-men',
    'hellfire-club': 'x-men', 'morlocks': 'x-men', 'acolytes': 'x-men', 'marauders': 'x-men', 'excalibur': 'x-men',
    'generation-x': 'x-men', 'alpha-flight': 'x-men',
    'sinister-six': 'spider-man', 'web-warriors': 'spider-man', 'maggia': 'spider-man',
    'fantastic-four': 'fantastic-four', 'frightful-four': 'fantastic-four', 'latveria': 'fantastic-four',
    'inhumans': 'fantastic-four', 'atlantis': 'fantastic-four',
    'guardians-of-the-galaxy': 'cosmic', 'black-order': 'cosmic', 'kree-empire': 'cosmic', 'skrull-empire': 'cosmic',
    'shiar-empire': 'cosmic', 'shiar-imperial-guard': 'cosmic', 'starjammers': 'cosmic', 'nova-corps': 'cosmic',
    'ravagers': 'cosmic', 'elders-of-the-universe': 'cosmic', 'eternals': 'cosmic', 'heralds-of-galactus': 'cosmic',
    'asgard': 'asgard', 'warriors-three': 'asgard', 'olympus': 'asgard',
    'defenders': 'street', 'heroes-for-hire': 'street', 'the-hand': 'street',
    'midnight-sons': 'mystic',
    'shield': 'agencies', 'hydra': 'agencies', 'aim': 'agencies', 'time-variance-authority': 'agencies',
    'howling-commandos': 'agencies', 'secret-warriors': 'agencies', 'winter-guard': 'agencies',
}

# Hand-made calls by name: characters with no team, and characters whose own corner of Marvel is
# not their primary team's.
BY_NAME = {
    'avengers': ['Whiplash', 'Namor', 'Abomination', 'Batroc the Leaper', 'Battlestar', 'Devil Dinosaur', 'Ghost (Iron Man villain)', 'Graviton',
                 'Grim Reaper', 'He Who Remains', 'Iron Monger', 'Justin Hammer', 'Kang the Conqueror', 'Killmonger',
                 'Living Laser', 'Machine Man', 'Mandarin', 'Pepper Potts', 'Radioactive Man', 'Skaar', 'Taskmaster',
                 'The Angel (Thomas Halloway)', 'The Leader', 'Titanium Man', 'Ultron', 'Wendigo'],
    'x-men': ['Anole', 'Apocalypse', 'Arcade', 'Azazel', 'Bastion', 'Bolivar Trask', 'Cassandra Nova', 'Hellion',
              'Ka-Zar', 'Lady Deathstrike', 'Mercury', 'Mojo', 'Omega Red', 'Onslaught', 'Proteus', 'Rockslide',
              'Sauron', 'Shanna the She-Devil', 'Silver Samurai', 'Spiral', 'Stryfe'],
    'spider-man': ['Big Wheel', 'Black Cat', 'Calypso', 'Cardiac', 'Carnage', 'Harry Osborn',
                   'Hobgoblin (Roderick Kingsley)', "Jack O'Lantern", 'Jackal', 'Knull', 'Living Brain', 'Lizard',
                   'Madame Web', 'Man-Wolf', 'Mister Negative', 'Molten Man', 'Montana', 'Morlun', 'Prowler (Hobie Brown)',
                   'Puma', 'Rocket Racer', 'Scarlet Spider (Ben Reilly)', 'Scream', 'Shriek', 'Silver Sable',
                   'Spider-Slayer (Alistair Smythe)', 'Spot', 'Stegron', 'Swarm', 'Tarantula', 'Tinkerer', 'Tombstone',
                   'Venom', 'White Rabbit'],
    'fantastic-four': ['Alicia Masters', 'Annihilus', 'Blastaar', 'Diablo', 'Dragon Man', 'Impossible Man', 'Mad Thinker',
                       'Mole Man', 'Molecule Man', 'Psycho-Man', 'Puppet Master', 'Wyatt Wingfoot'],
    'cosmic': ['Arishem', 'Ayesha', 'Beyonder', 'Death', 'Eternity', 'Galactus', 'High Evolutionary', 'Howard the Duck',
               'Kro', 'Living Tribunal', 'Magus', 'Thane', 'The Stranger', 'Uatu the Watcher'],
    'asgard': ['Thor', 'Jane Foster', 'Enchantress', 'Executioner', 'Beta Ray Bill', 'Hercules', 'Gorr the God Butcher', 'Kurse', 'Laufey', 'Malekith', 'Mangog', 'Surtur', 'Throg', 'Ulik'],
    'mystic': ['Agatha Harkness', 'Baron Mordo', 'Blackheart', 'Blade', 'Chthon', 'Deacon Frost', 'Dormammu', 'Dracula',
               'Elsa Bloodstone', 'Ghost Rider (Danny Ketch)', 'Ghost Rider (Johnny Blaze)', 'Hannibal King',
               'Jennifer Kale', 'Khonshu', 'Man-Thing', 'Mephisto', 'Morgan le Fay', 'Nightmare', 'Satana',
               'Shuma-Gorath', 'The Ancient One', 'Werewolf by Night', 'Zarathos', 'Doctor Strange', 'Wong',
               'Clea', 'Doctor Voodoo', 'Brother Voodoo'],
    'street': ['Black Mariah', 'Cloak', 'Cottonmouth', 'Dagger', 'Gladiator (Melvin Potter)', 'Jigsaw', 'Moon Knight',
               'Muse', 'Night Nurse', 'Punisher', 'Purple Man', 'Stick', 'The Owl', 'White Tiger (Hector Ayala)',
               'Daredevil', 'Kingpin', 'Bullseye', 'Elektra', 'Jessica Jones', 'Luke Cage', 'Iron Fist', 'Echo'],
}
SPIDER_WORDS = ('Spider', 'Venom', 'Green Goblin', 'Mary Jane', 'Gwen Stacy', 'Aunt May', 'J. Jonah', 'Doctor Octopus',
                'Vulture', 'Mysterio', 'Sandman', 'Electro', 'Rhino', 'Kraven', 'Scorpion', 'Shocker', 'Chameleon',
                'Hammerhead', 'Silk', 'Morbius')

LABELS = {'avengers': 'Avengers', 'x-men': 'X-Men', 'spider-man': 'Spider-Man', 'fantastic-four': 'Fantastic Four',
          'cosmic': 'Cosmic', 'asgard': 'Asgard', 'mystic': 'Mystic', 'street': 'Street level', 'agencies': 'Agencies'}


def main():
    path = ROOT / 'content/characters.json'
    chars = json.loads(path.read_text())
    by_name = {n: w for w, names in BY_NAME.items() for n in names}
    for c in chars:
        name = c['name']
        if name in by_name:
            c['world'] = by_name[name]
        elif any(w in name for w in SPIDER_WORDS) or (c.get('realName') or '').startswith(('Peter Parker', 'Miles Morales')):
            c['world'] = 'spider-man'
        elif c['primaryTeam'] in TEAM_WORLD:
            c['world'] = TEAM_WORLD[c['primaryTeam']]
        else:
            c['world'] = None
    missing = [c['name'] for c in chars if not c['world']]
    path.write_text(json.dumps(chars, indent=2, ensure_ascii=False) + '\n')
    print(Counter(c['world'] for c in chars))
    print('unassigned:', missing)


if __name__ == '__main__':
    main()
