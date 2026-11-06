# M1: Home + Unmasked Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable Marvelous site with the branch-monitor home page, the complete Unmasked game, ≥ 450 verified characters, 60+ days of scheduled answers, local progress and streaks, the share report, and a Git-backed Scheduling Office, deployed on Vercel.

**Architecture:** A static React SPA (Vite, TypeScript) plus one Vercel Function, `/api/day` (Vercel's non-Next.js `export default { fetch }` form), which serves a day's puzzle bundle from `content/schedule.json` and refuses future dates. All game logic lives in pure, unit-tested modules; UI components consume them. Progress is local-first in `localStorage`. Content is JSON in `content/`, validated at build and edited by the Office through GitHub's contents API.

**Tech Stack:**
- react 19, react-dom 19, react-router 7, vite 7, @vitejs/plugin-react 5, typescript 5.9
- vitest 3, @testing-library/react 16, jsdom 26
- @playwright/test 1.63.0 (matches the preinstalled browsers), @axe-core/playwright 4
- @fontsource/share-tech-mono, @fontsource/ibm-plex-mono, @fontsource/special-elite
- Python 3 + fonttools, skia-pathops and shapely, only for building the display font (tools/font)

**Spec:** `docs/superpowers/specs/2026-11-06-marvelous-design.md` (sections 1–7, 10, 12–16 apply to M1). **Board:** `docs/design/direction-board.html`.

## Global Constraints

- **Palette tokens (exact):** orange `#F2670F`, kiln `#B9470A`, phosphor `#EE8A62`, mustard `#D9A23A`, chocolate `#3B2416`, walnut `#5C3A22`, cream `#F1E4C6`, paper `#E9D5AC`, void `#120E0B`, teal `#7FBDB4` (hairlines only), tile green `#6F8F6A`, tile cream `#E6DCC3`, stamp red `#C2361B`, rust `#8E2F12`, muted text `#B9A27E`, ink `#2A1A10`.
- **Fonts:**
  - Marvelous Display (our own, OFL), for the site name, game titles and big numbers only.
  - Share Tech Mono for edges and labels.
  - IBM Plex Mono for play text.
  - Special Elite for paper.
  - All self-hosted. No Google Fonts requests at runtime.
- **Footer on every page (exact):** "Marvelous is an unofficial fan game. Not affiliated with, endorsed by, or sponsored by Marvel or Disney. Character names are used for identification only. All artwork is original."
- **Forbidden in UI copy:** "TVA", "TemPad", "Sacred Timeline", "Nexus event", or any Miss Minutes reference. A character's factual affiliation may name the Time Variance Authority.
- **No official art:** no Marvel art, logos, actor photos or stills anywhere. All imagery is original SVG or CSS.
- **Voice:** dry interoffice memo. The instruction comes first, the joke second, and error copy says what to do next.
- **Puzzle date:** the calendar date in `America/New_York`. It flips at 00:00 Eastern and is DST-safe.
- **Accessibility:**
  - WCAG 2.2 AA contrast.
  - Every action works by keyboard, with a visible teal focus ring.
  - Color is never the only signal: marks ✓ ≈ ✕ and arrows ▲ ▼.
  - `prefers-reduced-motion` is honored, with a manual override in Settings.
- **Layout:** no horizontal scroll from 320px to 1920px, and layouts hold at 200% zoom.
- **Budgets:**
  - initial route ≤ 120 KB gzipped JS
  - fonts ≈ 90 KB
  - LCP < 2 s on a mid-range phone (4G)
  - CLS < 0.05
- **Dependencies:** none beyond the stack above without sign-off.
- **Sound:** off by default; synthesized with Web Audio (no audio files).

## Review Focus

1. **Midnight Eastern while a page is open:** the home page must roll over to the new day's assignments and countdown without a reload. A game started before midnight stays playable and files under its own date. *(Tests: Task 2 `nextEtMidnight` DST cases; Task 11 `HomePage rolls over at midnight`; Task 12 `finishing after midnight files to the start date`.)*
2. **`localStorage` missing, full or corrupt** (Safari private mode, quota errors, hand-edited JSON): the site still loads and plays, keeping progress in memory. *(Tests: Task 3 `loadStore tolerates corrupt JSON`, `saveStore swallows quota errors`.)*
3. **Names with punctuation, accents or spacing:** "spiderman", "modok", "Ororo", "dr strange", "spider man" must all find the right characters. *(Tests: Task 10 `search` cases.)*
4. **Day bundle fails:** network error, 404 (unscheduled day) or 403 (clock skew at midnight) each gets a clear memo-voice state, and a cached bundle is used offline. *(Tests: Task 5 status codes; Task 11 and Task 12 empty/error state render tests.)*
5. **320px screens and 200% zoom:** guess-grid cells, branch labels and tickets stay readable with no horizontal scroll. *(Tests: Task 15 `no horizontal overflow at 320px` for each route.)*

---

## File structure (M1)

```
api/day.ts                          Vercel Function (export default { fetch }) + named handleDay()
content/characters.json             verified characters (Task 14)
content/teams.json                  team vocabulary {id,name,short}
content/schedule.json               {launchDate, days:{date:{unmasked}}}
content/FACTCHECK.md                contested calls (Task 14)
public/fonts/MarvelousDisplay-Base.woff2, -Shade.woff2   (built, committed)
public/favicon.svg
scripts/build-content.ts            validate + emit public/data/characters.json
scripts/merge-research.ts           research batches -> content/characters.json (Task 14)
scripts/autofill-schedule.ts        CLI around src/office/autofill.ts
tools/font/glyphs.py, build_font.py, OFL.txt
src/main.tsx, src/App.tsx           router + shell
src/content/types.ts, teams.ts, validate.ts
src/server/dayBundle.ts, devApi.ts
src/lib/time.ts, normalize.ts, random.ts, progress.ts, share.ts
src/data/useCharacters.ts, useDay.ts, useToday.ts
src/settings/settings.ts, SettingsDialog.tsx
src/audio/sfx.ts
src/ui/ (tokens.css, base.css, effects.css, DisplayText, TerminalFrame, IconRail, ActionList,
        Paper, Ticket, Stamp, Button, Dialog, LiveRegion, Honeycomb, WalnutWall, TileFloor,
        Clock24, icons, AppShell, id/Portrait, id/archetypes, id/emblems)
src/pages/Home/ HomePage, BranchMonitor, ShiftDesk, useCountdown
src/pages/Manual/ManualPage.tsx, src/pages/NotFound.tsx, src/pages/Kit/KitPage.tsx
src/games/unmasked/logic/ compare.ts, game.ts, search.ts, stats.ts
src/games/unmasked/ui/ UnmaskedPage, SubjectSearch, GuessGrid, CaseFile, FieldManual, StatsDialog
src/office/ OfficePage, github.ts, autofill.ts, officeStore.ts, Calendar, DayEditor, CharacterEditor, TokenSetup
e2e/ home.spec.ts, unmasked.spec.ts, a11y.spec.ts, office.spec.ts, layout.spec.ts
```

Unit tests sit next to their source as `*.test.ts(x)`.

---

### Task 1: Scaffold, tokens, shared types, deploy skeleton

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `vercel.json`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`
- Create: `src/ui/tokens.css`, `src/ui/base.css`, `src/ui/effects.css`
- Create: `src/content/types.ts`, `src/lib/normalize.ts` (+ test)
- Create: `content/teams.json`, `content/schedule.json` (empty days)
- Create: `api/day.ts` stub (`handleDay` + `export default { fetch: handleDay }`) returning 501

**Interfaces:**
- Produces `src/content/types.ts`:
  - `Alignment`, `Origin` (11 values), `Gender`, `Archetype` (13 values)
  - `Character`, `PublicCharacter = Omit<Character,'sources'|'notes'|'answerOk'|'difficulty'|'otherTeams'>`
  - `Team {id,name,short}`
  - `DayEntry {unmasked?: string}`
  - `Schedule {launchDate: string; days: Record<string, DayEntry>}`
  - `Issue {level:'error'|'warning'; path: string; message: string}`
  - `GameId = 'unmasked'|'blist'|'retcon'`
- Produces `src/lib/normalize.ts`: `normalizeName(s: string): string`. It lowercases, strips diacritics (NFD), turns `&` into ` and `, removes apostrophes and periods, maps other non-alphanumerics to a space, collapses spaces, trims, and drops a leading "the ".
- Produces npm scripts:
  - `dev` (build-content then vite)
  - `build` (build-content, then `tsc --noEmit`, then vite build)
  - `preview`, `test` (vitest run), `e2e` (playwright test --trace off), `typecheck`, `font` (python3 tools/font/build_font.py)

- [ ] **Step 1: Write the failing test** `src/lib/normalize.test.ts`:
  - `normalizeName('Spider-Man') === 'spider man'`
  - `normalizeName('M.O.D.O.K.') === 'modok'`
  - `normalizeName('  The  Thing ') === 'thing'`
  - `normalizeName('Daimon Hellström') === 'daimon hellstrom'`
  - `normalizeName("Jack O'Lantern") === 'jack olantern'`
  - `normalizeName('Cloak & Dagger') === 'cloak and dagger'`
- [ ] **Step 2: Run** `npx vitest run src/lib/normalize.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `normalizeName`. Write tokens.css with the Global Constraints palette as CSS custom properties (copy the board's `:root` block), plus base.css (reset, body void background, teal `:focus-visible` ring, `[data-motion="reduce"]` kill-switch for animations) and effects.css (grain overlay, scanlines utility).
- [ ] **Step 4: Run** `npx vitest run` and `npm run build`. Expected: PASS and a successful build.
- [ ] **Step 5: Deploy the skeleton to Vercel** (project `marvelous`, framework Vite, output `dist`, SPA rewrite in `vercel.json`) and confirm `GET /api/day` answers 501 from the function. This proves the function and TypeScript import path work before anything depends on them.
- [ ] **Step 6: Commit.** `git commit -m "chore: scaffold Marvelous app"`

### Task 2: Eastern time utilities (DONE in scaffold)

**Files:** `src/lib/time.ts`, `src/lib/time.test.ts`, `src/lib/random.ts`, `src/lib/random.test.ts`

**Interfaces (Produces):**
- `etDateOf(instant: Date): string` returns `YYYY-MM-DD`.
- `etWallClock(instant: Date): {date: string; hour: number; minute: number; second: number}`
- `nextEtMidnight(instant: Date): Date` — the exact UTC instant of the next 00:00 in America/New_York.
- `msUntilNextPuzzle(instant: Date): number`
- `addDays(date: string, n: number): string`
- `daysBetween(from: string, to: string): number`
- `weekday(date: string): number` (0 = Sunday)
- `isIsoDate(s: string): boolean`
- `puzzleNumber(launchDate: string, date: string): number` = `daysBetween(launchDate, date) + 1`
- `formatCountdown(ms: number): string` returns `HH:MM:SS`, clamped at 0.
- `formatMemoDate(date: string): string` returns `06 NOV 2026`.
- `src/lib/random.ts`: `seededRandom(seed: string): () => number` (deterministic, in [0,1)) and `pick<T>(rand, items: readonly T[]): T`

- [ ] **Step 1: Write failing tests:**
  - `etDateOf(new Date('2026-11-07T04:59:59Z')) === '2026-11-06'`; `...T05:00:00Z` → `'2026-11-07'`
  - `etDateOf(new Date('2026-07-01T03:59:59Z')) === '2026-06-30'`; `...T04:00:00Z` → `'2026-07-01'`
  - `nextEtMidnight(new Date('2026-03-07T12:00:00Z')).toISOString() === '2026-03-08T05:00:00.000Z'` (DST starts at 2 am on Mar 8)
  - `nextEtMidnight(new Date('2026-03-08T12:00:00Z')).toISOString() === '2026-03-09T04:00:00.000Z'`
  - `nextEtMidnight(new Date('2026-10-31T12:00:00Z')).toISOString() === '2026-11-01T04:00:00.000Z'`
  - `nextEtMidnight(new Date('2026-11-01T12:00:00Z')).toISOString() === '2026-11-02T05:00:00.000Z'`
  - `msUntilNextPuzzle(new Date('2026-11-06T23:00:00Z')) === 3600000 * 6`
  - `addDays('2026-12-31', 1) === '2027-01-01'`; `daysBetween('2026-11-06','2027-02-03') === 89`
  - `puzzleNumber('2026-11-06','2026-11-06') === 1`; `weekday('2026-11-06') === 5`
  - `formatCountdown(3723000) === '01:02:03'`; `formatCountdown(-5) === '00:00:00'`
  - `formatMemoDate('2026-11-06') === '06 NOV 2026'`
  - random: the same seed gives the same sequence; different seeds differ; values are in [0,1)
- [ ] **Step 2: Run** `npx vitest run src/lib/time.test.ts src/lib/random.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `Intl.DateTimeFormat('en-CA', {timeZone, hourCycle:'h23', …})` parts give the wall clock.
  - `nextEtMidnight`: guess `Date.UTC(y, m, d+1, 5)`, read its ET wall clock, correct by the hour difference, and repeat once.
  - Calendar arithmetic runs on UTC dates built from the ISO string.
  - `seededRandom` uses xmur3 + mulberry32.
- [ ] **Step 4: Run tests.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 3: Progress, settings and share report

**Files:** `src/lib/progress.ts`, `src/lib/share.ts`, `src/settings/settings.ts` (+ tests)

**Interfaces:**
- Consumes: `GameId` (Task 1); `addDays`, `formatMemoDate` (Task 2).
- Produces `src/settings/settings.ts`:
  - `Settings {sound: boolean; motion: 'system'|'reduce'|'full'; seenManual: Partial<Record<GameId, boolean>>}`
  - `DEFAULT_SETTINGS = {sound:false, motion:'system', seenManual:{}}`
  - `effectiveReducedMotion(s: Settings, prefersReduced: boolean): boolean`
  - `applyMotionAttribute(reduced: boolean): void`, which sets `document.documentElement.dataset.motion` to `'reduce'` or `'full'`
- Produces `src/lib/progress.ts`:
  - `GameRecord<S=unknown,R=unknown> {status:'in_progress'|'filed'; state:S; result?:R; startedAt:string; filedAt?:string}`
  - `DayRecord {required: GameId[]; games: Partial<Record<GameId, GameRecord>>}`
  - `Store {version:1; days: Record<string, DayRecord>; settings: Settings}`
  - `STORE_KEY = 'marvelous:v1'`
  - `emptyStore()`, `loadStore(storage?: Storage|null): Store`, `saveStore(store, storage?)`
  - `getRecord(store, date, game)`, `withRecord(store, date, game, rec): Store` (immutable), `noteRequired(store, date, required: GameId[]): Store`
  - `assignmentStatus(store, date, game): 'pending'|'in_progress'|'filed'`
  - `shiftComplete(store, date): boolean` (every game in `required` is filed; false when `required` is empty)
  - `consecutiveShifts(store, today): number`: counts complete days ending today if today is complete, otherwise ending yesterday.
  - `bestShifts(store): number`
- Produces `src/lib/share.ts`:
  - `Mark`, `UnmaskedShare`, `UnmaskedResult` are imported from `src/lib/marks.ts` (already in the repo).
  - `ReportInput {number: number; date: string; unmasked?: UnmaskedShare|'pending'; shifts: number; url: string}`
  - `buildReport(input): string`

- [ ] **Step 1: Write failing tests:**
  - `loadStore tolerates corrupt JSON`: storage returns `'{bad'` → deep-equals `emptyStore()`.
  - `loadStore ignores other versions`: `{version:2}` → `emptyStore()`.
  - `saveStore swallows quota errors`: a storage whose `setItem` throws doesn't throw.
  - `loadStore without storage`: `loadStore(null)` → `emptyStore()`.
  - `consecutiveShifts`:
    - days 11-04, 11-05, 11-06 complete and today 11-06 → 3
    - today 11-07 incomplete → still 3
    - 11-05 incomplete → 1
  - `shiftComplete` uses `required`: required `['unmasked']` with unmasked filed → true.
  - `buildReport` exact string for `{number:12, date:'2026-11-07', unmasked:{attempts:3, solved:true, rows:[['no','close','no','no','no','no'],['exact','close','exact','exact','exact','exact'],['exact','exact','exact','exact','exact','exact']]}, shifts:12, url:'https://marvelous.vercel.app/'}` →
    `'MARVELOUS #012 · 07 NOV 2026\nUNMASKED 3/6\n⬛🟨⬛⬛⬛⬛\n🟧🟨🟧🟧🟧🟧\n🟧🟧🟧🟧🟧🟧\n12 consecutive shifts\nhttps://marvelous.vercel.app/'`
  - Unsolved → `UNMASKED X/6`; `'pending'` → `UNMASKED PENDING`; `shifts:1` → `1 consecutive shift`; `shifts:0` → no shifts line; `number:0` → `MARVELOUS PREVIEW · …`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Storage access sits behind try/catch, with in-memory fallback inside callers.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 4: Content validation and build-content

**Files:** `src/content/validate.ts`, `src/content/teams.ts`, `scripts/build-content.ts` (+ tests). `content/teams.json` is finalized here.

**Interfaces:**
- Consumes: types (Task 1), `isIsoDate`, `daysBetween` (Task 2).
- Produces:
  - `UNMASKED_COOLDOWN_DAYS = 120`
  - `validateCharacters(chars: Character[], teams: Team[]): Issue[]`
  - `validateSchedule(schedule: Schedule, chars: Character[]): Issue[]`
  - `toPublic(c: Character): PublicCharacter`
  - `teamName(id): string`, `teamShort(id): string` (from teams.json; `'none'` → "None")
  - `scripts/build-content.ts`: exits 1 on any `error` Issue, prints warnings, and writes `public/data/characters.json` (sorted by name).
- Rules for `validateCharacters`:
  - **Ids:** unique and kebab-case.
  - **Names:** non-empty and unique case-insensitively.
  - **Aliases:** at most 8 (warning if an alias equals another character's name).
  - **Teams:**
    - `primaryTeam` is in teams or `'none'`.
    - `teams` ⊆ team ids, at most 5, and includes `primaryTeam` unless it's `'none'`.
  - **Debut:** `debutYear` is 1930–2026; `debutDate` matches `^\d{4}(-\d{2})?$` and starts with `debutYear`.
  - **Enums:** valid.
  - **MCU:** `mcu ⇔ mcuFirst` is non-null and non-empty.
  - **Answer pool:** `difficulty` is 1–5; `answerOk ⇒ difficulty ≤ 4 && caseNote.length > 0`.
  - **Text:** `caseNote.length ≤ 300`.
  - **Sources:** at least one, all `https://`.
  - **Archetype:** valid.
- Rules for `validateSchedule`:
  - `launchDate` is ISO.
  - Every key is ISO.
  - `unmasked` names an existing character with `answerOk` (error otherwise).
  - No unmasked answer repeats within 120 days (error).
  - Warning when fewer than 60 consecutive scheduled days start at `launchDate`.

- [ ] **Step 1: Write failing tests,** one per rule above, each asserting the exact `path` (e.g. `characters[2].teams`) and `level`. Plus `validateSchedule flags repeat within 120 days` (the same id on 2026-11-06 and 2027-02-01 → error) and `allows repeat after 120 days`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests, then run `npx tsx scripts/build-content.ts` on a 3-character fixture copy. Expected: exit 0 and the file written.
- [ ] **Step 5: Commit.**

### Task 5: Day bundle, `/api/day`, dev middleware

**Files:** `src/server/dayBundle.ts`, `src/server/devApi.ts`, `api/day.ts`, `src/server/dayBundle.test.ts`, `api/day.test.ts`

**Interfaces:**
- Consumes: `Schedule`, `GameId` (Task 1); `etDateOf`, `isIsoDate`, `puzzleNumber` (Task 2).
- Produces:
  - `DayBundle {date: string; number: number; launchDate: string; games: GameId[]; unmasked?: {key: string}}`
  - `DayResult = {ok:true; bundle: DayBundle} | {ok:false; status:400|403|404; error:string}`
  - `buildDayBundle(schedule: Schedule, date: string|null, now: Date): DayResult` (null date means today ET)
  - `encodeAnswer(id: string, date: string): string` and `decodeAnswer(key: string, date: string): string`: XOR of UTF-8 bytes with the cycled bytes of `'marvelous:'+date`, then base64url.
  - `api/day.ts`: `export function handleDay(request: Request): Response` plus `export default { fetch: handleDay }` (Vercel's non-Next.js function form).
    - 200 → JSON with `Cache-Control: public, max-age=60, s-maxage=300`.
    - Errors → `{error}` with `Cache-Control: no-store`.
  - `devApi(): Plugin` (Vite), which mounts the same handler at `/api/day` for `vite dev` and `vite preview`.
- Error copy (exact):
  - 400 `"Malformed date. Use YYYY-MM-DD."`
  - 403 `"That date has not happened yet. The Archive does not issue assignments in advance."`
  - 404 `"No assignments have been issued for this date."`

- [ ] **Step 1: Write failing tests:**
  - 400 for `'2026-13-01'`.
  - 403 for tomorrow's ET date, relative to `now = 2026-11-07T04:00:00Z` (still Nov 6 ET).
  - 404 for an unscheduled past date.
  - 200 returns `games:['unmasked']` and `number:1` for the launch date.
  - `decodeAnswer(encodeAnswer('storm','2026-11-06'),'2026-11-06') === 'storm'`.
  - The encoded key for the same id differs between two dates.
  - `handleDay` with a `Request('http://x/api/day?date=…')` → `status` and `cache-control` match the rules above.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** `api/day.ts` imports `../content/schedule.json` with `with { type: 'json' }`.
- [ ] **Step 4: Run** the tests, then `npm run build && npx vite preview`, then `curl -s localhost:4173/api/day?date=<scheduled date>`. Expected: 200 JSON.
- [ ] **Step 5: Commit.**

### Task 6: Marvelous Display font + DisplayText

**Files:** `tools/font/glyphs.py` (from `docs/design/prototype/glyphs.py`), `tools/font/build_font.py`, `tools/font/OFL.txt`, `public/fonts/MarvelousDisplay-{Base,Shade}.woff2`, `src/ui/DisplayText.tsx`, `src/ui/DisplayText.module.css`, `src/ui/fonts.css` (+ test)

**Interfaces:**
- Produces fonts:
  - Family `"Marvelous Display"` (all components, tone A).
  - Family `"Marvelous Display Shade"` (tone-B components only, identical advance widths).
  - Glyphs: A–Z, 0–9, space, `. , ! ? - ' : / # & + % ( ) "`, with lowercase mapped to the uppercase glyphs.
  - unitsPerEm 1000, cap height 700, ascender 800, descender −200.
- Produces `DisplayText({text, as='span', className, tone='paper'|'dark'})`.
  - Renders the real text in the base family.
  - Adds `data-text` for a `::after` layer in the shade family, with `aria-hidden` semantics (pseudo-content only).
  - Tone colors: paper → A `#F2670F` / B `#B9470A`; dark → A `#F2670F` / B `#B9470A` with a glow.

- [ ] **Step 1: Write the failing test** `DisplayText.test.tsx`: renders the text once in the accessibility tree (`getByText('UNMASKED')`), has the `data-text` attribute, and uses the requested element.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement the font.**
  - Finish the remaining glyphs in the prototype's style: 30-unit stems, 6-unit stencil gaps, two tones per letter, chunky round bowls, and triangle joins.
  - Build with fontTools FontBuilder: union each tone's polygons with skia-pathops, write TrueType contours and WOFF2.
  - Render a specimen PNG of every glyph and inspect it visually. Iterate until no glyph reads ambiguously: O vs 0, I vs 1, S vs 5, B vs 8.
- [ ] **Step 4: Run** the test; open the `/kit` specimen in Playwright at 390px and 1280px. Expected: both layers align exactly at 16px, 48px and 120px.
- [ ] **Step 5: Commit** (built WOFF2 files included).

### Task 7: UI kit

**Files:**
- `src/ui/{TerminalFrame,IconRail,ActionList,Paper,Ticket,Stamp,Button,Dialog,LiveRegion,Honeycomb,WalnutWall,TileFloor,Clock24,AppShell}.tsx`, each with a `*.module.css`
- `src/ui/icons.tsx`
- `src/pages/Kit/KitPage.tsx`
- tests for the interactive pieces

**Interfaces (Produces, exact props):**
- `TerminalFrame({codes?: {tl?,tr?,bl?,br?: string}; rail?: ReactNode; children; label: string})`: hairline orange border, inner inset line, top-right and bottom-right corner grids, and edge codes on the border. Below 560px the rail moves above the content.
- `IconRail({items: {id: string; label: string; icon: IconName; onSelect?: () => void; href?: string; pressed?: boolean}[]})`
  - `IconName = 'home'|'manual'|'stats'|'sound-on'|'sound-off'|'settings'|'file'|'lock'|'clock-in'`
- `ActionList({title: string; items: {label: string; onSelect?: () => void; href?: string}[]})`: renders "1. LABEL" rows.
- `Paper({children, className?})`
- `Ticket({no: string; title: string; subtitle: string; status: 'pending'|'in_progress'|'filed'|'unavailable'; statusText: string; href?: string})`
- `Stamp({text: string; sub?: string; play: boolean})`: animates (drop, slam, settle) when `play` becomes true, using the ink mask from the board. No animation when reduced motion is on.
- `Button({variant?: 'outline'|'solid', ...ButtonHTMLAttributes})`
- `Dialog({open: boolean; onClose: () => void; title: string; children})`: native `<dialog>` with `showModal`; Esc and the close button both call `onClose`.
- `useAnnounce(): (text: string) => void` with a `<LiveRegion/>` mounted in AppShell (polite).
- `Honeycomb({height?: number})`, `WalnutWall({children})`, `TileFloor({children})`: CSS taken from the board, with the honeycomb using the corrected perspective (`perspective(252px) rotateX(-40deg)`, 64×56 tile).
- `Clock24({msRemaining: number; size?: number})`: 24-hour dial with a remaining-time wedge and hands for hours, minutes and seconds remaining, plus an `aria-label` like "10 hours 17 minutes until the next assignment".
- `AppShell({section: string; children})`: status strip ("M.A.R.V.E.L.O.U.S. ▸ {section}" + live ET clock), main area, the exact footer, grain overlay and LiveRegion.

- [ ] **Step 1: Write failing tests:**
  - `Dialog` closes on Escape (calls `onClose`).
  - `ActionList` numbers items "1." to "3.".
  - `Ticket` exposes its status text.
  - `Clock24` aria-label for 37,020,000 ms reads `"10 hours 17 minutes until the next assignment"`.
  - `Stamp` has no animation class when `data-motion="reduce"`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Match the board's measurements and colors, and show every component on `/kit`.
- [ ] **Step 4: Run** the tests; screenshot `/kit` at 390px and 1280px and compare against the board. Expected: no overflow, focus rings visible.
- [ ] **Step 5: Commit.**

### Task 8: Silhouettes and origin emblems

**Files:** `src/ui/id/archetypes.ts`, `src/ui/id/emblems.ts`, `src/ui/id/Portrait.tsx`, `src/ui/id/Portrait.module.css` (+ test)

**Interfaces:**
- Produces `ARCHETYPE_PATHS: Record<Archetype, string[]>` (SVG path data in a 160×190 box).
- Produces `EMBLEMS: Record<Origin, string[]>` (24×24 line paths).
- Produces `Portrait({archetype, origin, monogram, title})`:
  - sepia gradient, halftone pattern and vignette
  - the silhouette and an emblem badge
  - a monogram tag
  - `role="img"` with an `aria-label` of `title`
- All 13 silhouettes are original and generic: no costume or logo of any specific character.

- [ ] **Step 1: Write failing tests:** every `Archetype` and every `Origin` has non-empty paths; `Portrait` renders an `img` role with the given label.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Draw the silhouettes with consistent proportions (head, shoulders, base at y=190), and add a gallery to `/kit`.
- [ ] **Step 4: Run** the tests; screenshot the `/kit` gallery and check that every silhouette reads clearly at 96px wide.
- [ ] **Step 5: Commit.**

### Task 9: Sound and settings dialog

**Files:** `src/audio/sfx.ts`, `src/settings/SettingsDialog.tsx`, `src/settings/useSettings.ts` (+ tests)

**Interfaces:**
- Consumes: Task 3 `Settings`/`loadStore`/`saveStore`; Task 7 `Dialog`.
- Produces:
  - `Sfx = 'key'|'submit'|'miss'|'flip'|'stamp'|'win'|'lose'`
  - `playSfx(name: Sfx): void` (no-op unless enabled; creates the `AudioContext` lazily)
  - `setSfxEnabled(on: boolean): void`
  - `useSettings(): [Settings, (patch: Partial<Settings>) => void]`: persists, applies the motion attribute and syncs sfx.
  - `SettingsDialog({open, onClose})`, with controls for sound on/off and motion (System / Reduced / Full), each a labelled radio group.

- [ ] **Step 1: Write failing tests:**
  - `playSfx` does nothing (no AudioContext created) while disabled.
  - Toggling sound in `SettingsDialog` persists `sound:true`.
  - Choosing Reduced sets `document.documentElement.dataset.motion === 'reduce'`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Synthesis recipes:
  - `key`: 8 ms noise burst through a bandpass at 2.2 kHz
  - `submit`: 60 ms square at 880 Hz
  - `miss`: 120 ms square at 220 Hz
  - `flip`: 20 ms triangle at 1.4 kHz
  - `stamp`: a 90 ms sine sweep from 140 to 50 Hz plus noise
  - `win`: three rising squares
  - `lose`: two falling squares
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 10: Unmasked logic

**Files:** `src/games/unmasked/logic/{compare,game,search,stats}.ts` (+ tests)

**Interfaces:**
- Consumes: `PublicCharacter` (Task 1), `normalizeName` (Task 1), `Mark`/`UnmaskedShare`/`UnmaskedResult` (`src/lib/marks.ts`).
- Produces `compare.ts`:
  - `Feedback {name: Mark; affiliation: Mark; debut: Mark; debutDir: 'later'|'earlier'|null; alignment: Mark; origin: Mark; gender: Mark; mcu: Mark}`
  - `ATTRIBUTE_ORDER = ['affiliation','debut','alignment','origin','gender','mcu'] as const`
  - `decadeOf(year): number`
  - `compareCharacters(guess, answer): Feedback`
  - `feedbackMarks(f): Mark[]`
- Produces `game.ts`:
  - `MAX_ATTEMPTS = 6`
  - `UnmaskedState {date: string; answerId: string; guesses: string[]; status: 'playing'|'won'|'lost'}`
  - `newUnmasked(date, answerId)`
  - `applyGuess(state, id, known: ReadonlySet<string>): UnmaskedState`
  - `unmaskedShare(state, byId: ReadonlyMap<string, PublicCharacter>): UnmaskedShare`
- Produces `search.ts`:
  - `SearchEntry {id; name; realName: string|null; keys: string[]}`
  - `buildSearchIndex(chars): SearchEntry[]`
  - `searchCharacters(index, query, limit = 8): SearchEntry[]`
- Produces `stats.ts`: `UnmaskedStats {played; solved; distribution: number[] /*len 6*/}` and `unmaskedStats(results: UnmaskedResult[]): UnmaskedStats` (`UnmaskedResult` from `src/lib/marks.ts`).
- Comparison rules (from spec section 7):
  - **Affiliation:** exact if the `primaryTeam` values are equal (including both `'none'`); close if the team sets intersect, where each set is `teams` ∪ `{primaryTeam}` minus `'none'`.
  - **Debut:** exact on the same decade, close on an adjacent decade. `debutDir` compares the answer's decade with the guess's decade.
  - **Name:** exact only for the same id.
- Search ranking (lower is better, ties broken by name length, then alphabetically):
  - 0 = exact normalized name
  - 1 = name prefix
  - 2 = word-start in name
  - 3 = alias or real-name prefix / word-start
  - 4 = substring of any key
  - A query with no spaces also matches against keys with their spaces removed, so "spiderman" finds "spider man".

- [ ] **Step 1: Write failing tests:**
  - Storm vs Rogue fixture → affiliation exact, debut close with `debutDir:'earlier'`, alignment, origin, gender and mcu exact, name no.
  - Galactus vs Storm → affiliation no, debut close with `debutDir:'later'`.
  - Teams intersect without matching primaries → close.
  - Both `'none'` → exact.
  - `applyGuess`:
    - six wrong guesses → status `'lost'`
    - the correct guess → `'won'`, with further guesses ignored
    - a repeat id → state unchanged
    - an unknown id → state unchanged
  - `unmaskedShare` rows match `feedbackMarks` per guess; `attempts` equals the guess count.
  - Search:
    - `'spiderman'` finds both Spider-Man entries first
    - `'modok'` finds M.O.D.O.K.
    - `'ororo'` finds Storm
    - `'dr strange'` finds Doctor Strange (alias "Dr. Strange")
    - `'x'` returns at most 8 results
    - `''` returns `[]`
  - `unmaskedStats`: distribution counts by attempts; losses count as played, not solved.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 11: Home page (branch monitor and shift desk)

**Files:** `src/pages/Home/{HomePage,BranchMonitor,ShiftDesk,useCountdown}.tsx` with CSS modules (+ tests); `src/data/{useCharacters,useDay,useToday}.ts` (+ tests)

**Interfaces:**
- Consumes: Tasks 2, 3, 5, 7.
- Produces data hooks:
  - `useToday(): string`: ET date; re-renders at the next ET midnight.
  - `useDay(date): {status: 'loading'|'ready'|'none'|'error'; bundle?: DayBundle; retry(): void}`
    - fetches `/api/day?date=`
    - caches successes in `localStorage` key `marvelous:day:<date>`
    - 404 → `'none'`; network error with a cache → `'ready'` from the cache
  - `useCharacters(): {status; characters: PublicCharacter[]; byId: Map<string, PublicCharacter>}` from `/data/characters.json`.
  - `useCountdown(): number` (ms to the next puzzle, ticking each second).
- **Branch monitor:**
  - **Line:** the bright main line runs across the screen.
  - **Branches:** three branches (01 Unmasked, 02 B-List, 03 Retcon) end in nodes. Labels are HTML links overlaid in percentage positions.
  - **Decorative lines:** seeded by the date.
  - **Statuses:**
    - B-List and Retcon show status `'unavailable'` with the text "Awaiting clearance" until M2 and M3.
    - Unmasked shows Pending, In progress, or "Filed n/6" / "Filed X/6".
- **Shift desk:**
  - three tickets
  - consecutive shifts (big number) with the note "Agent registration opens soon. Your shifts are kept on this device."
  - `Clock24` + the digital countdown
- **Empty and error states (exact copy):**
  - none → "No assignments have been issued for this date. Please remain at your desk."
  - error → "Transmission interrupted. Check your connection, then retry." with a Retry button.

- [ ] **Step 1: Write failing tests:**
  - `HomePage shows three tickets with statuses` (mocked `useDay`/store).
  - `HomePage shows the none state` for a 404.
  - `HomePage rolls over at midnight`: fake timers advance past `nextEtMidnight`, and the ticket date and countdown reset.
  - `useDay uses the cached bundle offline`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Follow the board's Form 04 (CRT bezel, screen curve, scanlines, glow, honeycomb, walnut). The branch draw-on animation runs once per mount and is skipped under reduced motion.
- [ ] **Step 4: Run** the tests; screenshot `/` at 320, 390 and 1280px.
- [ ] **Step 5: Commit.**

### Task 12: Unmasked UI

**Files:** `src/games/unmasked/ui/{UnmaskedPage,SubjectSearch,GuessGrid,CaseFile,FieldManual,StatsDialog}.tsx` with CSS modules (+ tests); `src/pages/Manual/ManualPage.tsx` (`/manual`: the Unmasked field manual, About, the disclaimer, and font and license credits); `src/pages/NotFound.tsx` ("Form not found. Return to your desk." with a link home)

**Interfaces:**
- Consumes: Tasks 3, 7, 8, 9, 10, 11 (hooks).
- **Structure:**
  - **Route:** `/unmasked`.
  - **State:** stored under `days[date].games.unmasked`. `state` is `UnmaskedState`; `result` is `{attempts, solved}`.
- **Search box:**
  - **Pattern:** ARIA 1.2 combobox (`role=combobox`, `aria-expanded`, `aria-controls`, `aria-activedescendant`), with a listbox of up to 8 options showing name and real name.
  - **Already-guessed names:** `aria-disabled` and dimmed.
  - **Keys:** ↑/↓ move, Enter files the active option, Esc closes.
  - **"File" button:** files the top match.
- **Guess grid:**
  - **Columns:** a header row (Affil., Debut, Align., Origin, Gender, MCU); each guess shows its name with a ✓/✕ name mark, then six cells.
  - **Cell content:** short label + mark; Debut adds an arrow.
  - **Flip animation:** 120 ms stagger per cell.
  - **Screen readers:** each row reads in full, e.g. "Rogue. Affiliation X-Men, exact. Debut 1980s, close, the subject debuted earlier. …".
- **Header and end state:**
  - **Header:** `DisplayText` "UNMASKED", the line "Form 7B // Identify the variant // Attempt n of 6", and an attempt meter.
  - **Win copy:** "Identity confirmed in n of 6 attempts."
  - **Loss copy:** "Subject at large. The file has been closed anyway."
  - **End screen:** `CaseFile` (ID card with Portrait, fields, case note, `Stamp` "CASE CLOSED" with "Filed DD MON YYYY"), then Copy report, Statistics, and Back to the desk.
- **Dialogs and rail:**
  - **FieldManual:** opens automatically on the first visit (`settings.seenManual.unmasked`).
  - **StatsDialog:** played, solved %, the distribution, current and best consecutive shifts.
  - **Rail items:** home, manual, stats, sound toggle, settings.
- **Midnight:** finishing after midnight still files under the start date.

- [ ] **Step 1: Write failing tests (Testing Library):**
  - typing "sto" + Enter files Storm
  - a repeat guess is blocked
  - six misses show the loss copy and the ID card
  - the correct guess shows the win copy and the stamp
  - the state restores after a remount
  - `finishing after midnight files to the start date`
  - the SR row text for the Rogue fixture equals the exact string above
  - Copy report writes the `buildReport` text to a mocked clipboard
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Follow the board's Forms 05 and 06 with live data.
- [ ] **Step 4: Run** the tests; screenshot the start, mid-game, won and lost states at 390px and 1280px.
- [ ] **Step 5: Commit.**

### Task 13: Scheduling Office (Git-backed)

**Files:** `src/office/{OfficePage,TokenSetup,Calendar,DayEditor,CharacterEditor}.tsx`, `src/office/{github,autofill,officeStore}.ts` (+ tests). `scripts/autofill-schedule.ts` wraps the autofill logic as a CLI.

**Interfaces:**
- Consumes: Tasks 2, 4, 7, 10 (search).
- Produces `github.ts`:
  - `RepoRef {owner; repo; branch}` (default `{owner:'harry66u', repo:'marvelous', branch: <default branch>}`)
  - `readJsonFile<T>(ref, path, token?): Promise<{data: T; sha: string}>`
  - `writeJsonFile(ref, path, data, sha, message, token): Promise<{sha: string; commitUrl: string}>`
  - `GitHubError {status}`
  - It uses the REST contents API with `Accept: application/vnd.github+json` and `X-GitHub-Api-Version: 2022-11-28`, and stores the token in `localStorage['marvelous:office:token']`.
- Produces `autofill.ts`: `autofillSchedule(schedule, chars, from: string, to: string): Schedule`.
  - It fills only empty days, picks only `answerOk` characters, and respects the 120-day cooldown in both directions.
  - Monday to Thursday prefers difficulty 1–3; Friday to Sunday prefers 2–4.
  - It's deterministic: the seed is the date.
- **UI:**
  - **Token setup:** includes the exact steps for creating a fine-grained token (this repository only, Contents: Read and write).
  - **Calendar:** past 14 days plus the next 90.
  - **Day editor:** search for an answer-pool character; shows difficulty and the last-used date.
  - **Character editor:** every field, with validation.
  - **Save bar:** lists the changed files and commits them with the message "office: update schedule" / "office: update characters". The commit link opens in a new tab.
  - **Read-only mode:** without a token, everything works except saving.

- [ ] **Step 1: Write failing tests:**
  - `autofill fills 90 empty days with no cooldown violations` (fixture of 200 eligible characters; `validateSchedule` returns no errors).
  - It's deterministic across two runs.
  - It never overwrites a scheduled day.
  - `github.readJsonFile` decodes base64 UTF-8 (mocked fetch).
  - `writeJsonFile` sends the `sha` and `branch`.
  - A 409 surfaces `GitHubError(409)`.
  - `OfficePage` without a token disables Save and explains why.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the tests; screenshot `/office` at 390px and 1280px.
- [ ] **Step 5: Commit.**

### Task 14: Character content, fact-check notes, schedule

**Files:** `scripts/merge-research.ts`, `content/characters.json`, `content/FACTCHECK.md`, `content/schedule.json`

**Interfaces:**
- Consumes:
  - research batches in `content/_research/final/B*.json`, with research fields; `""` → `null` for `realName`/`mcuFirst`
  - Task 4 validation and Task 13 `autofillSchedule`
- **Merge:**
  - Merge, normalize, dedupe by id, and run `validateCharacters`; fix every error by editing the source records (never by loosening validation).
  - Spot-check 25 random records plus every `answerOk` record with difficulty 1–2 against Wikipedia.
  - Write `FACTCHECK.md` from each record's `notes` and the contested lists.
- **Schedule:**
  - `launchDate = '2026-11-06'`, with autofill from 2026-11-06 to 2027-02-03 (90 days).
  - The first week favors difficulty 1–2.
- [ ] **Step 1: Write the failing test** `content.test.ts`:
  - `validateCharacters(real data)` has no errors
  - ≥ 450 characters
  - ≥ 180 `answerOk`
  - `validateSchedule(real data)` has no errors
  - ≥ 60 consecutive days from `launchDate`
- [ ] **Step 2: Run.** Expected: FAIL until the data lands.
- [ ] **Step 3: Merge, validate, spot-check, autofill.**
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit.**

### Task 15: E2E, accessibility, layout

**Files:** `e2e/{home,unmasked,a11y,office,layout}.spec.ts`, `playwright.config.ts`

- [ ] **Step 1: Write the specs.** The web server is `npm run build && npx vite preview --port 4173`; the projects are `mobile` (390×844) and `desktop` (1280×800).
  - **home.spec:**
    - three tickets visible
    - the countdown matches `^\d{2}:\d{2}:\d{2}$`
    - the Unmasked branch link navigates
  - **unmasked.spec:**
    - **win:** read today's answer from the API bundle with `decodeAnswer`, guess one wrong character, then the answer. The card shows "CASE CLOSED", and the report has two rows.
    - **loss:** six wrong guesses → "Subject at large".
    - **keyboard-only:** Tab to the search, type, ArrowDown, Enter, with no mouse.
    - **reload:** reloading mid-game restores the guesses.
    - **reduced motion:** `emulateMedia({reducedMotion:'reduce'})` → no running animations, checked with `getAnimations()`.
  - **a11y.spec:** axe on `/`, `/unmasked` (start and end), `/manual` and `/office`, with zero serious or critical violations.
  - **layout.spec:** `no horizontal overflow at 320px` on each route (`scrollWidth <= innerWidth`).
  - **office.spec:** GitHub API mocked with `page.route`; the calendar renders, and Save is disabled without a token.
- [ ] **Step 2: Run** `npm run e2e`. Fix the failures in the owning task's code.
- [ ] **Step 3: Visual QA:** screenshots of every route at 390px and 1280px, reviewed against the board.
- [ ] **Step 4: Commit.**

### Task 16: Review, deploy, check-in

- [ ] **Step 1:** An adversarial review workflow (correctness, accessibility, performance and bundle, design fidelity, content integrity). Fix every confirmed finding.
- [ ] **Step 2:** `npm test && npm run e2e && npm run build` all green. Check the bundle size against the budget (`vite build` report).
- [ ] **Step 3:** Push and deploy to Vercel, then smoke-test the live URL: `/`, `/unmasked`, `/api/day`.
- [ ] **Step 4:** Update `README.md` (run, test, deploy, Office token steps), commit, and push.
