# Unmasked character rubric

Shared rules for researching, classifying and adjudicating content/characters.json. Spec: docs/superpowers/specs/2026-11-06-marvelous-design.md section 7.

## Field rules

- id, name: exactly as given in the batch list.
- aliases: other names a player might type: other codenames, the real name, common nicknames ("Spidey", "Cap"), former identities. At most 8. Leave out any name that belongs primarily to a different character on the game list.
- realName: civilian name, e.g. "Ororo Munroe". Use "" when the character has no separate civilian name.
- primaryTeam: the single team id from TEAMS the character is most associated with, or "none".
- teams: notable memberships as TEAMS ids, including primaryTeam (unless "none"). Only memberships with real tenure or iconic association: no one-off appearances, alternate realities, or mere allies. At most 5.
- otherTeams: notable memberships that have no TEAMS id (free text), at most 3.
- debutYear, debutIssue, debutDate: the first appearance given in the infobox of the character's Wikipedia article (cameos count if Wikipedia lists the cameo). Comics use the cover date: e.g. 1975, "Giant-Size X-Men #1", "1975-05". If the character first appeared outside comics (TV or film), use that title and release date. debutDate is "YYYY-MM", or "YYYY" if the month is unknown.
- alignment: "hero" | "villain" | "antihero": how the character is most commonly classified across their whole publication history. Antihero = a protagonist known for lethal or morally gray methods, or a character defined by switching sides.
- origin: exactly one of
  mutant = born with the X-gene;
  inhuman = Inhuman lineage / Terrigenesis;
  mutate = gained powers from an accident or experiment (radiation, gamma, cosmic rays, spider bite, chemicals, vampirism-by-science);
  super-soldier = enhancement programs (Super-Soldier Serum and its variants, Infinity Formula, Weapon Plus);
  tech = abilities come from armor, weapons, gadgets or devices;
  magic = sorcery, mystic, demonic, vampiric or occult power, including demons and mystic entities (Mephisto, Dormammu, Dracula);
  cosmic = power granted by cosmic entities or forces (Power Cosmic, Nova Force, Quantum Bands) and cosmic beings themselves (Galactus, Death, Celestials);
  deity = gods and mythological races of any pantheon (Asgardians incl. Frost Giants, Olympians, Egyptian gods);
  alien = born to a non-human species (Kree, Skrull, Shi'ar, Zen-Whoberi, Flora colossus), plus Eternals/Deviants and symbiote hosts whose powers come from the symbiote;
  synthetic = robots, androids, AIs;
  trained = no superhuman powers: skill, training, wealth.
- gender: "male" | "female" | "other" (nonbinary, genderfluid, agender, or none), as the character is primarily written.
- mcu: true only if the character appeared on screen in live action in at least one title in MCU_TITLES. mcuFirst = earliest qualifying title, else "".
- difficulty (1–5): 1 = household name (Spider-Man, Iron Man, Hulk, Thanos); 2 = well known to casual film fans (Storm, Loki, Groot, Magneto); 3 = known to regular MCU viewers or casual comic readers (Shang-Chi, Rogue, Mysterio, Kingpin); 4 = known to regular comic readers (Bishop, Moondragon, Taskmaster); 5 = deep cut (Big Wheel, Doop, Overdrive).
- answerOk: true only if difficulty <= 4, every attribute above is clear-cut (not contested), and the character is recognizable enough to be a fair daily answer.
- caseNote: 2–3 sentences, at most 300 characters, written as a dry government memo about "Subject". Only true facts, nothing invented, no spoilers of recent issues; a deadpan last line is welcome. Example: "Subject manipulates weather on a planetary scale. Has led the X-Men in the field and served as Queen of Wakanda. Agents are advised not to schedule picnics."
- archetype: closest silhouette for an original sepia drawing: caped, cowl (full-head mask), armored, helmeted, hooded, horned, winged, longhair, shorthair, bald, synthetic, brute (huge or bulky body), creature (non-human body).
- sources: URLs you actually read (at least one).
- notes: contested calls or ambiguity explained in one or two sentences; "" if none.

## Teams vocabulary

avengers (all Avengers-branded main rosters: West Coast, New, Mighty, Secret, Uncanny Avengers), x-men (all X-Men main rosters: Blue, Gold, Uncanny, Astonishing, X-Treme), fantastic-four, guardians-of-the-galaxy (modern or 31st-century team), defenders, shield, hydra, aim, sword, inhumans (Inhuman Royal Family / Attilan), eternals, brotherhood-of-mutants, sinister-six, masters-of-evil, thunderbolts, hellfire-club, alpha-flight, young-avengers, runaways, champions, midnight-sons, illuminati, dark-avengers, heroes-for-hire, frightful-four, serpent-society, wrecking-crew, morlocks, marauders, acolytes, starjammers, shiar-imperial-guard, black-order, ravagers, nova-corps, invaders, howling-commandos, warriors-three, dora-milaje, the-hand, maggia, new-warriors, power-pack, x-force, x-factor, new-mutants, excalibur, generation-x, weapon-x, red-room, secret-warriors, heralds-of-galactus, elders-of-the-universe, great-lakes-avengers, web-warriors, agents-of-atlas, winter-guard, squadron-supreme, cabal, legion-of-monsters, annihilators, time-variance-authority, kree-empire, skrull-empire, shiar-empire, asgard, olympus, wakanda, atlantis, kun-lun, latveria

## MCU titles

Films: Iron Man (2008-05-02); The Incredible Hulk (2008-06-13); Iron Man 2 (2010); Thor (2011); Captain America: The First Avenger (2011); The Avengers (2012); Iron Man 3 (2013); Thor: The Dark World (2013); Captain America: The Winter Soldier (2014); Guardians of the Galaxy (2014); Avengers: Age of Ultron (2015); Ant-Man (2015); Captain America: Civil War (2016); Doctor Strange (2016); Guardians of the Galaxy Vol. 2 (2017); Spider-Man: Homecoming (2017); Thor: Ragnarok (2017); Black Panther (2018); Avengers: Infinity War (2018); Ant-Man and the Wasp (2018); Captain Marvel (2019); Avengers: Endgame (2019); Spider-Man: Far From Home (2019); Black Widow (2021); Shang-Chi and the Legend of the Ten Rings (2021); Eternals (2021); Spider-Man: No Way Home (2021); Doctor Strange in the Multiverse of Madness (2022); Thor: Love and Thunder (2022); Black Panther: Wakanda Forever (2022); Ant-Man and the Wasp: Quantumania (2023); Guardians of the Galaxy Vol. 3 (2023); The Marvels (2023); Deadpool & Wolverine (2024); Captain America: Brave New World (2025); Thunderbolts* (2025); The Fantastic Four: First Steps (2025-07-25); Spider-Man: Brand New Day (2026-07-31).
Series and specials: WandaVision (2021); The Falcon and the Winter Soldier (2021); Loki season 1 (2021); Hawkeye (2021); Moon Knight (2022); Ms. Marvel (2022); She-Hulk: Attorney at Law (2022); Werewolf by Night (2022 special); The Guardians of the Galaxy Holiday Special (2022); Secret Invasion (2023); Loki season 2 (2023); Echo (2024); Agatha All Along (2024); Daredevil: Born Again season 1 (2025-03-04); Ironheart (2025-06-24); Wonder Man (2026-01-27); Daredevil: Born Again season 2 (2026-03-24); The Punisher: One Last Kill (2026-05-12 special); VisionQuest (2026-10-13).
NOT counted: animation (What If...?, X-Men '97, Marvel Zombies, Eyes of Wakanda, Your Friendly Neighborhood Spider-Man), voice-only roles, Netflix/ABC/Hulu/Freeform Marvel Television shows, Fox X-Men and Fantastic Four films, Sony Spider-Man Universe films, and anything released after 2026-11-06 (e.g. Avengers: Doomsday, 2026-12-18). Cameos and live-action variants inside the titles above DO count (e.g. legacy actors appearing in Deadpool & Wolverine or Spider-Man: No Way Home).

## Sources

TOOLS AND SOURCES: First run ToolSearch with query "select:WebFetch,WebSearch". Use English Wikipedia as the primary source: fetch https://en.wikipedia.org/wiki/<Article> with WebFetch and a prompt that asks for exactly the fields you need. Pages longer than 100k characters are cut off; call WebFetch again with the offset it reports to reach later sections such as "In other media" or "Marvel Cinematic Universe". marvel.fandom.com and marvel.com block automated access, so do not use them. Use WebSearch to find the right article or to confirm 2024–2026 screen appearances. Do not create or edit any files unless told to.
