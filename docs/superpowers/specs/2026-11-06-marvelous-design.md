# Marvelous: design spec

**Date:** 2026-11-06
**Status:** Draft for review. No product code until this is approved.
**Visual direction board:** https://claude.ai/artifact/HY48idySfnUzd9S58hAkZT (private to you; source in `docs/design/`)

---

## 1. What we're building

### What you asked for

- A standalone daily Marvel games site called **Marvelous** with three daily games: **Unmasked** (identify the variant), **B-List** (records search) and **Retcon** (timeline repair).
- It should look and feel like the internal web portal of the time agency from the Loki series:
  - game screens like the TemPad
  - a curved cream CRT branch monitor on the home page
  - two-tone stencil lettering on aged paper
  - honeycomb ceilings, wood panels and checkered tile
  - CRT glow, scanlines and grain
  - an analog countdown clock
  - a CASE CLOSED stamp
  - optional sounds, off by default
  - a dry government-memo voice
- Mobile-first, fast, polished and accessible: keyboard play, readable contrast and a reduced-motion setting.
- Play without an account. Optional Google login, styled as an employee clock-in, gives each user an agent number and syncs streaks and history across devices.
- Everyone gets the same puzzles. They reset at midnight Eastern.
- The home dashboard shows the three assignments with their status, the streak ("consecutive shifts") and the countdown.
- A combined, Wordle-style share text with a link.
- A no-code way to schedule and edit puzzles in advance.
- At least 60 days of puzzles per game at launch, a verified list of several hundred characters, and fact-checked content.
- Build order: plan and design first, then home + Unmasked (check in), then B-List (check in), then Retcon (check in).

### Where I resolved a conflict or made an assumption (please correct any of these)

1. **Imagery is 100% original.** Your BRAND section allows the TVA logo and seal, Miss Minutes, the Loki logo, actor photos and stills. Your IMAGES section says all imagery must be original and never official art. I'm following IMAGES everywhere.
   - The agency is the site itself: **M.A.R.V.E.L.O.U.S.**, the *Multiversal Archive of Records, Variants, Events, Lore & Other Unfiled Stories*.
   - It has its own seal ("For the Record · Est. 1939", the year of Marvel Comics #1).
   - The show comes through in palette, materials, type and voice, not its marks.
   - Character names appear only as trivia facts.
2. **A "consecutive shift"** means a puzzle day on which all three assignments were completed, win or lose. Missing a day resets it to zero.
3. **Stack:** Supabase (your existing Pro organization) for sign-in, the database and the scheduling tools, plus Vercel (your existing team) for hosting.
4. **Admin:** your Google account is the only Scheduling Office admin at launch.
5. **Numbering:** puzzle #001 is launch day.

---

## 2. Brand, IP and voice

- **Name:** Marvelous. The in-world agency is M.A.R.V.E.L.O.U.S. ("the Archive"). Motto: *For the Record.*
- **Never used:**
  - Show and franchise marks: the TVA name or logo, the TVA seal, the Loki logo, official Marvel art or logos.
  - People and characters from the show: Miss Minutes or any lookalike mascot, actor photos, show stills.
  - Show-specific UI terms: TemPad, Sacred Timeline, Nexus event.
  - Krillion's names or art.
  - UI copy uses generic bureaucratic words instead: main line, branch, case file, agent, shift, variance allowance.
- **Footer on every page:** "Marvelous is an unofficial fan game. Not affiliated with, endorsed by, or sponsored by Marvel or Disney. Character names are used for identification only. All artwork is original."
- **Voice:** dry interoffice memo. Rules and instructions come first and must be unambiguous; the joke is a second sentence.
  - Error copy says what happened and what to do next.
  - Samples are on the board, for example: "No record on file. Three seconds have been deducted for the inconvenience."

---

## 3. Visual system

The board shows each of these at working size.

### Palette

| Token | Hex | Use |
|---|---|---|
| Signal Orange | `#F2670F` | frames, lettering tone A, exact match, primary buttons |
| Kiln Orange | `#B9470A` | lettering tone B, pressed states |
| Phosphor | `#EE8A62` | CRT branch lines and glow |
| Mustard | `#D9A23A` | close match, warnings, Filed tier |
| Chocolate | `#3B2416` | no match, panels |
| Walnut | `#5C3A22` | wood walls |
| Cream | `#F1E4C6` | text on dark, CRT bezel |
| Aged Paper | `#E9D5AC` | memos, ID cards, tickets |
| Void | `#120E0B` | base ground |
| Teal | `#7FBDB4` | hairlines only: focus rings, CRT rules, Sealed Archive tier |
| Tile Green / Tile Cream | `#6F8F6A` / `#E6DCC3` | results floor |
| Stamp Red | `#C2361B` | rubber-stamp ink only |

Measured contrast on Void: cream 15.2:1, orange 6.2:1, muted text 7.8:1. Dark ink on orange is 5.4:1 and on mustard 7.3:1. Orange on paper is only 2.2:1, so orange lettering on paper is display-only and always has a plain-text equivalent.

### Type

- **Marvelous Display:** our own geometric two-tone stencil face (prototype in `docs/design/prototype/glyphs.py`).
  - We finish A–Z, 0–9 and basic punctuation, and compile it to WOFF2 under the SIL Open Font License, so it is licensed for web use.
  - Two tones come from two stacked font layers with identical metrics (base + shade), which works in every browser.
  - Used only for the site name, game titles and a few big numbers.
- **Share Tech Mono:** terminal edges, status codes and labels.
- **IBM Plex Mono:** play text and anything the player reads at length.
- **Special Elite:** paper: memos, ID cards, tickets.
- All fonts are self-hosted, subset to Latin, and use `font-display: swap`.

### Surfaces and components

- **Surfaces:** honeycomb ceiling, walnut panelling, cafeteria tile and aged paper are all pure CSS plus small generated-noise SVGs. No photos.
- **CRT effects:** glow, scanlines and film grain. Grain and flicker turn off with reduced motion.
- **Components:**
  - terminal frame: hairline border, corner grids, icon rail, edge status codes, numbered action list
  - paper card, assignment ticket, rubber stamp
  - 24-hour countdown wall clock, branch monitor
  - ID card, tier chip, depth gauge, timeline
- **Character imagery:** an original sepia silhouette from a library of about 12 generic archetypes (caped, armored, cowled, hooded, helmeted, winged, long hair, synthetic, creature, and so on). Each card adds an origin emblem (helix for mutant, gear for tech, sigil for magic, etc.), a monogram and a case number. No official costumes or designs.
- **Motion:** one orchestrated moment per screen.
  - home: branches draw on
  - Unmasked: cells flip
  - B-List: a record drawer slides out
  - Retcon: branches retract into the main line
  - every game: a CASE CLOSED stamp at the end
- **Reduced motion:** defaults to the OS setting and can be toggled in Settings. It swaps motion for fades.
- **Sound:** typewriter keys, terminal chirp, drawer slide and stamp thud, all synthesized with Web Audio (no audio files). Off by default; the setting persists.

---

## 4. Screens and routes

| Route | Screen |
|---|---|
| `/` | **Home:** branch monitor (three branches, one per game) on a walnut wall under the honeycomb ceiling. Below it, the shift desk: three assignment tickets (Pending / In progress / Filed + result), consecutive shifts, the countdown clock, and the clock-in strip. When all three are filed, an "End of shift" banner links to the results. |
| `/unmasked`, `/b-list`, `/retcon` | Game terminals. The first visit opens the Field Manual memo with the rules. Each ends with CASE CLOSED, a result card and "Copy report". |
| `/shift` | **End of shift**, on cafeteria tile: per-game summary, combined share, stats. |
| `/agent` | **Agent file:** your own ID card, agent number, streaks, per-game stats, and a history calendar. |
| `/manual` | Field Manual (rules for all three games) and About (disclaimer, credits, licenses). |
| `/office/*` | **Scheduling Office** (admin only, lazy-loaded). |

**Phone layout:**
- The monitor fills the width. Branch labels are HTML overlays so they stay readable at 360px.
- The terminal's icon rail moves to a top row.
- Everything stacks into one column.

**Desktop:** the same screens, with the action list beside the play area.

**Error and empty states, in memo voice:**
- no puzzle scheduled
- offline (play continues from cache)
- data failed to load (retry)
- sign-in failed

---

## 5. Daily cycle and time

- The puzzle day is the calendar date in **America/New_York**. It flips at 00:00 Eastern, DST-safe.
- The client works out today's date with `Intl`. The server is the authority: the bundle endpoint refuses dates after today in Eastern time (computed in Postgres), so future puzzles never leak.
- The countdown targets the exact next Eastern midnight. At zero, the page shows "New assignments issued" and offers a refresh.
- A game you start before midnight can be finished after midnight and still counts for its own date. After midnight, home shows the new day.

---

## 6. Architecture

```
Browser (React SPA, Vite, TypeScript)
  ├─ local-first progress (localStorage, versioned schema)
  ├─ pure game logic modules (tested)
  └─ Supabase JS ─► Supabase: Postgres + Auth (Google) + RPC functions + RLS
Hosting: Vercel (static build, SPA rewrites, a preview deploy per pull request)
```

- **Frontend:** React + TypeScript + Vite, React Router, CSS Modules on global CSS tokens. No UI kit, and no animation library unless Retcon's reorder needs one (hand-rolled FLIP first).
- **Backend:** Supabase only. Postgres functions do the work; there is no custom server.
- **Modules** (each with one job and a typed interface):
  - `lib/time`: Eastern date, puzzle number, countdown
  - `lib/match`: normalization, alias and typo matching
  - `lib/progress`: history, streaks, cloud merge
  - `lib/share`: combined report text
  - `games/unmasked`, `games/blist`, `games/retcon`: each split into `logic/` (pure reducers and scoring, no DOM) and `ui/`
  - `data/`: bundle fetch, cache, types
  - `auth/`: clock-in
  - `audio/`: synthesized sounds
  - `ui/`: design-system components
  - `office/`: the admin
- **Content in the repo:** `content/` holds characters, prompts, records, schedule and sources as JSON. It's validated by tests on every commit, seeded into Supabase by a script, and can be exported back for backups. After launch, the database is the source of truth and the Office edits it directly.

### Data model (Supabase)

| Table | Key fields |
|---|---|
| `characters` | id, name, aliases[], real_name, primary_team, teams[], debut_year, debut_issue, alignment, origin, gender, mcu, mcu_first, answer_ok, difficulty, case_note, archetype, sources[], notes |
| `blist_prompts` | id, text, notes |
| `blist_answers` | id, prompt_id, name, aliases[], tier (1–5) |
| `retcon_records` | id, title, kind, year, month, detail, source |
| `schedule` | date (pk), unmasked_id, blist_ids[7], retcon_ids[6], published, note |
| `profiles` | user_id, agent_no (sequential), created_at |
| `plays` | user_id, date, game, result (json), completed_at |
| `blist_picks` | date, prompt_id, answer_id (null = miss), device_hash; unique per device and prompt |
| `admins`, `settings` | admin list; switches such as live rarity on/off and its sample size |

### RPC functions

- `get_bundle(date)`: today's three puzzles; refuses future dates.
- `get_characters()`: public fields for autocomplete, cached by version.
- `submit_pick(...)`: records a B-List answer or miss; returns the live tier when live rarity is on.
- `get_rarest(date)`: per prompt, the rarest answers found by at least two agents.
- `clock_in()`: creates the profile and agent number on first sign-in.
- `sync_plays(rows)`: merges a user's history.

### Row-level security

- Content is readable only through the RPCs.
- Admins write content.
- Users read and write only their own plays.

**Known trade-off:** today's answers reach the browser so the games respond instantly, including B-List typo matching inside a 25-second timer. A determined player could dig them out of developer tools. That's normal for daily web games. The answer is lightly obfuscated, and future days stay on the server.

---

## 7. Game 1: Unmasked ("Identify the Variant")

### Rules

- **The puzzle:** one mystery character per day, six attempts.
- **Input:** autocomplete over the full character list.
  - It matches codename, aliases and real name, ignoring case, accents and punctuation.
  - Arrow keys + Enter work, and names already guessed are dimmed.
- **Feedback:** each attempt is compared on six counts. The guessed name is a seventh signal, because two characters can match on all six (Cyclops and Iceman, for example).

| Count | Exact (orange ✓) | Close (mustard ≈) | No match (chocolate ✕) |
|---|---|---|---|
| Affiliation | same primary team | any notable team in common | nothing in common |
| Debut | same decade | adjacent decade | further apart |
| Alignment (Hero / Villain / Antihero) | same | – | different |
| Origin | same | – | different |
| Gender (Male / Female / Other) | same | – | different |
| MCU (Yes / No) | same | – | different |

  On Debut, an arrow (▲ / ▼) shows whether the subject debuted later or earlier.
- **Win:** the guessed name is the subject. The end screen shows the ID card (redacted until then), CASE CLOSED, and two or three factual sentences of case notes in memo voice.
- **Share:** one row of six squares per attempt (🟧 exact, 🟨 close, ⬛ no), plus `3/6` or `X/6`.

### Data rules (the fact-check rubric)

- **Debut:** the year of first published appearance (comics by cover date; other media by release date) as cited by the Marvel Database and Marvel.com. Shown as a decade in play; the exact issue appears on the ID card.
- **Affiliation:** one primary team plus up to six notable team memberships. Allies don't count. "None" is a valid primary.
- **Alignment:** how the character is most commonly classified across their publication history.
- **Origin:** exactly one of these categories:

  | Category | Definition |
  |---|---|
  | Mutant | X-gene |
  | Inhuman | Terrigenesis |
  | Mutate | accident or experiment, e.g. a spider bite, gamma, cosmic rays |
  | Super-soldier | enhancement programs |
  | Tech | armor, gadgets, devices |
  | Magic | sorcery, mystic or demonic power |
  | Cosmic | granted by cosmic entities or forces |
  | Deity | gods of any pantheon |
  | Alien | born to a non-human species |
  | Synthetic | robots, androids, AIs |
  | Trained human | no powers |

- **Gender:** as primarily written. "Other" covers nonbinary, fluid, or none.
- **MCU:** Yes if the character appeared on screen in a Marvel Studios live-action film or Disney+ series released by the data cutoff (6 Nov 2026).
  - Cameos and live-action variants count.
  - Voice-only roles, animation, Netflix/ABC/Hulu shows, and Fox's and Sony's non-MCU films don't, unless the character later appears in a Marvel Studios release.
  - *Avengers: Doomsday* (18 Dec 2026) will flip several characters to Yes. An update pass is planned, and the Office can change a flag in seconds.
- **Contested calls** (Scarlet Witch's origin, for example) are written up in `content/FACTCHECK.md`. Those characters stay guessable but are kept out of the answer pool.

### Schedule

- **Answer pool:** at least 180 recognizable characters with unambiguous attributes, out of about 450 total.
- **Spacing:** no answer repeats within 120 days.
- **Difficulty:** easier Monday to Thursday, harder Friday to Sunday, using a 1–5 difficulty score.

---

## 8. Game 2: B-List ("Records Search")

This plays like Krillion: 7 prompts, 25 seconds each, rarity scoring in five tiers, typo and alias tolerance, and depth growing with points. The tier names and the look are ours.

### Flow

1. **The prompt arrives.** "Incoming request" plays for about 1 second, then the prompt appears, the 25-second timer starts, and the input takes focus.
2. **The player types one answer.**
   - A valid answer ends the prompt.
   - An invalid answer costs **3 seconds** (the timer can't go below zero). The terminal shakes and shows "No record on file", and the text stays selected so the player can retype quickly.
3. **Valid-answer reveal.** "Retrieving record" (0.6 s), then the drawer slides out, the tier card stamps in with its points, and the depth gauge drops (10 ft per point; sublevels B1 to B7 at every 100 points).
4. **Timeout.** "Request expired" appears and the prompt scores 0.
5. **End screen:**
   - score out of 700 and the sublevel reached
   - your seven answers with their tiers
   - **the rarest answers other agents found today** for each prompt
   - share line
   - Until enough agents have played, the rarest-answers list is replaced by "Unclaimed records": a few Sealed/Classified answers nobody has found yet.

### Matching

1. **Normalize the input:** case, accents, punctuation, spacing, a leading "the", "&" → "and", and common abbreviations ("Dr." → "Doctor").
2. **Exact match** against the canonical name and aliases.
3. **Typo match:** Damerau-Levenshtein distance ≤ 1 for 5–8 characters and ≤ 2 for 9 or more. No fuzzing at 4 characters or fewer, and the best match must be unique.
4. **Guard against near-miss names:** if the input exactly matches a known Marvel name that isn't valid for this prompt, it's rejected rather than "corrected" into a different valid answer. "Ironman" never becomes "Iceman", for example.

### Scoring

| Tier | Points | Preset meaning (AI-judged familiarity) | Share |
|---|---|---|---|
| Common Record | 10 | household or MCU-headliner answers | ⬜ |
| Filed | 30 | known to most MCU fans | 🟨 |
| Restricted | 60 | known to regular comic readers | 🟧 |
| Classified | 85 | deep cuts | 🟥 |
| Sealed Archive | 100 | true obscurities | ⬛ |
| No record / timeout | 0 | – | ➖ |

### Moving from preset tiers to real pick rates

- **Recording:** every finished prompt is recorded from day one (answer or miss, one per device).
- **Live rarity:** when switched on, an answer's tier comes from a blend of its preset tier and today's real pick rate:
  `p = (picks + k × prior) / (attempts + k)`, with k ≈ 200 pseudo-agents.
  - Early in the day the preset dominates, so scoring is stable for early players. As real answers accumulate, true pick rates take over.
  - Tier thresholds: Common ≥ 10%, Filed 3–10%, Restricted 1–3%, Classified 0.2–1%, Sealed < 0.2%.
- **Locked scores:** a score never changes after it's awarded.
- **When to switch:** live rarity is off at launch. Turn it on in the Office once daily players regularly pass about 500.

### Prompts

- **Answer sets:** every prompt has a bounded answer set that we can list exhaustively from reference sources:
  - team rosters
  - rogues' galleries
  - MCU films, series, cast and characters
  - creators, storylines and events
  - locations, artifacts, species, alter egos
- **Volume:** 420 unique prompts for launch (60 days × 7, no repeats). Each day mixes categories and difficulty.

### Accessibility option

An optional extended timer (50 s), labelled on that day's share report.

---

## 9. Game 3: Retcon ("Timeline Repair")

### Play

- **The records:** six per day, mixing comic debuts, storylines and events, MCU releases, other screen releases, and publishing milestones.
- **The anchor:** the first record sits on the main line with its year shown.
- **Placing:** the other five arrive one at a time.
  - Tap a slot to place a record. On a keyboard, arrows move between slots and Enter places.
  - Screen readers hear "Place before Spider-Man debuts, 1962".
- **Feedback:**
  - A correct placement locks in, shows its year, and its branch glows.
  - A wrong placement costs one of **3 variance allowances**, and the card snaps to its true slot with its year.
- **The end:** the game ends after five placements, or when the allowances run out (remaining records file themselves into place with their years). The branches then retract into the main line and the case is stamped closed.
- **Share:** five squares (🟧 correct, ⬛ wrong) and `4/5`.

### Data rules

- Comics use their cover date (month + year). Screen releases use the first U.S. release.
- The six records on a day never share a year, and the validator enforces this.
- We need at least 360 unique records (60 days × 6, no repeats in the launch window).

---

## 10. Shared: assignments, streaks and the share report

- **Assignment status:** Pending, In progress, or Filed with its result.
- **Copy report:** each game's end screen can copy the combined report at any time (unplayed games show "Pending"). End of shift copies the complete one.
- Report format:

```
MARVELOUS #012 · 07 NOV 2026
UNMASKED 3/6
⬛🟨⬛⬛⬛⬛
🟧🟨🟧🟧🟧🟧
🟧🟧🟧🟧🟧🟧
B-LIST 370/700 · SUBLEVEL B3
🟨🟥⬜🟧⬛➖🟥
RETCON 4/5
🟧🟧⬛🟧🟧
12 consecutive shifts
https://<domain>/
```

- **Stats:** shifts worked, current and best consecutive shifts, Unmasked guess distribution, B-List average and best depth, Retcon perfect days.

---

## 11. Accounts: clocking in

- **Without an account:** progress lives in the browser.
- **Clocking in:** "Clock in with Google" through Supabase Auth.
  - **First clock-in:** creates your profile and assigns the next agent number ("Agent No. 0042"), then uploads your local history.
  - **Each later device:** merges local and cloud history. They're combined by date and game, a completed game beats one in progress, and the earliest completion wins a conflict.
- **Clocking out:** signs you out and leaves a local copy.
- **Stored data:** only the Google account ID and email (held by Supabase Auth) plus play history. Nothing is shown publicly.

**What you'll need to do once:** create a Google OAuth client in Google Cloud Console and paste its ID and secret into Supabase. I'll give you a five-step checklist when we get there.

---

## 12. The Scheduling Office (no-code puzzle management)

- `/office`, visible only to admins and enforced by the database.
- **Calendar:** the next 90 days with coverage per game. Any unscheduled day in the next 14 is flagged.
- **Day editor:** pick the Unmasked answer (search shows difficulty and when it was last used), the seven B-List prompts (search the library and preview answers), and the six Retcon records (shows years and checks the rules). Days are saved as drafts and then published.
- **Library editors:**
  - characters: every attribute, sources and notes, plus the answer-pool switch
  - prompts: text, plus an answers table with aliases and tier; bulk paste as `Name | aliases | tier`
  - Retcon records
- **Validation shown inline:** missing fields, duplicate aliases, cooldown violations, repeated years.
- **Auto-fill drafts:** fills empty days from unused items.
- **Takes effect immediately:** no redeploy.
- **Fallback:** Supabase's built-in table editor.

---

## 13. Content production and fact-checking

### Launch volumes

| Game | Content |
|---|---|
| Unmasked | ≥ 450 characters, ≥ 180 in the answer pool |
| B-List | 420 prompts with full answer lists |
| Retcon | ≥ 360 records |

Each game is scheduled for 60+ days from launch.

### Pipeline

1. **Rubrics first:** the definitions in sections 7–9.
2. **Draft from sources:** research agents work in parallel batches from the Marvel Database, Marvel.com and Wikipedia lists. Every row keeps its source URLs.
3. **Automated validation on every commit:**
   - schema and enums
   - uniqueness, and alias collisions within a prompt
   - debut year agrees with debut decade
   - every MCU flag checked against an MCU appearances table built from the cast lists of every Marvel Studios release
   - Retcon year rules
   - schedule rules
4. **Independent second pass:** every answer-pool character, plus a random 20% of everything else, is re-checked by a separate agent. I resolve disagreements against the sources.
5. **Write-up:** `content/FACTCHECK.md` records the contested calls and how each was decided.

---

## 14. Accessibility and performance

- **Keyboard:** every action works from the keyboard, with a visible teal focus ring.
  - Unmasked uses the ARIA combobox pattern.
  - B-List focuses the input automatically.
  - Retcon slots are arrow-navigable.
  - Esc closes dialogs.
- **Screen readers:** live regions announce feedback ("Affiliation: exact, X-Men. Debut: close, 1960s, subject debuted later…"). The B-List timer announces at 10 and 5 seconds.
- **Color is never the only signal:** marks ✓ ≈ ✕, arrows and tier names always accompany it.
- **Readability:** text meets WCAG AA contrast, and layouts hold up at 200% zoom.
- **Reduced motion:** defaults to the OS setting and can be toggled manually. Grain, flicker and slams are disabled, and state changes stay clear.
- **Budgets:**
  - ≤ 120 KB gzipped JS on the first route
  - about 90 KB of fonts
  - LCP under 2 s on a mid-range phone over 4G
  - CLS under 0.05
- **Loading:** game routes are code-split and the Office is lazy-loaded.

---

## 15. Testing

- **Unit tests (Vitest):**
  - Eastern time and DST boundaries
  - Unmasked comparison
  - matcher (aliases, typos, the near-miss guard, ambiguity)
  - B-List timer, penalty, scoring and live-rarity blend
  - Retcon placement, allowances and auto-filing
  - streaks and the cloud merge
  - share-text snapshots
- **Content tests:** the rules in section 13 run on every commit. A content error fails the build.
- **Database tests:** the RPCs and row-level security, run against a Supabase branch.
- **End-to-end tests (Playwright):**
  - a full play-through of each game at phone and desktop sizes
  - a keyboard-only run
  - reduced motion
  - axe accessibility scan with zero serious violations
  - midnight rollover with a mocked clock
- **Visual review:** screenshots of every screen at 390px and 1280px come with each check-in.

---

## 16. Milestones and check-ins

| # | Scope | Ends with |
|---|---|---|
| M0 | This spec + the design board | your approval, then a written implementation plan for M1 |
| M1 | Scaffold, design system, Marvelous Display font, home (branch monitor, shift desk, clock), **Unmasked** complete, ≥ 450 verified characters, 60 days of Unmasked, local progress and streaks, share (Unmasked part), Supabase project + schema + bundle API, clock-in + agent numbers + sync, Scheduling Office for Unmasked and characters, preview deploy | **check-in** with a playable preview link |
| M2 | **B-List** complete: matcher, tiers, depth gauge, 420 prompts, picks and rarity pipeline, rarest finds, Office tools for prompts | **check-in** |
| M3 | **Retcon** complete: timeline and collapse animation, ≥ 360 records, 60 days; end-of-shift screen, combined share, agent file | **check-in** |
| M4 (optional) | Domain, social preview image, final accessibility and performance pass, the post-Doomsday content update | launch |

---

## 17. Decisions I need from you

1. **Identity.** Is the original M.A.R.V.E.L.O.U.S. agency and seal OK, in place of the show's marks?
2. **Supabase.** Can I create a new project called `marvelous` in your Pro organization? That probably adds about $10/month of compute, since you already run three projects there.
3. **Google sign-in.** Will you set up the Google OAuth client when we reach clock-in? Otherwise clock-in waits.
4. **Domain.** Is there one for share links, or should we use the Vercel URL for now?
5. **Design direction.** Is the board's direction approved, or what should change?
