# Marvelous

A daily Marvel games site dressed as the web portal of a 1970s records bureau: the Multiversal Archive of Records, Variants, Events, Lore & Other Unfiled Stories.

Marvelous is an unofficial fan game. It is not affiliated with, endorsed by, or sponsored by Marvel or Disney. Character names are used for identification only, and all artwork is original.

## Status

All three games are live:

- **Unmasked**, identify the variant: 499 fact-checked characters (235 can be daily answers), 90 days scheduled from 2026-11-06.
- **B-List**, records search: 421 prompts (167 easy, 98 medium, 156 hard) with 10,800 accepted answers in five rarity tiers, scheduled through 2027-02-07.
- **Retcon**, timeline repair: 549 dated records (first appearances and MCU releases), scheduled through 2027-02-07.

Also built: the branch-monitor home page, End of shift (`/shift`), the Agent file (`/agent`), the combined share report, the Field Manual and the Git-backed Scheduling Office.

Not built yet, because each needs a shared backend: B-List rarity from real pick rates (tiers are preset for now), "rarest answers other agents found", and Google clock-in.

- Design spec: [`docs/superpowers/specs/2026-11-06-marvelous-design.md`](docs/superpowers/specs/2026-11-06-marvelous-design.md)
- M1 plan: [`docs/superpowers/plans/2026-11-06-m1-home-unmasked.md`](docs/superpowers/plans/2026-11-06-m1-home-unmasked.md)
- Visual direction board: [`docs/design/direction-board.html`](docs/design/direction-board.html)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 (also serves /api/day)
npm test           # unit tests (Vitest)
npm run e2e        # end-to-end tests (Playwright, Chromium)
npm run build      # validates content, type-checks, builds dist/
```

`npm run build:preview` builds a static copy in `dist-preview/` for hosts without serverless functions. It uses relative paths and in-app routing, and bakes the characters and the next week of daily cases into the bundle, so it makes no data requests.

## Deploy (Vercel)

1. In the Vercel dashboard choose **Add New → Project** and import `harry66u/marvelous`.
2. Keep the defaults. `vercel.json` already sets the build command, output folder, SPA rewrites and the `/api/day` function.
3. Every push to the production branch redeploys, including saves from the Scheduling Office.

## Scheduling puzzles (no code)

Open `/office` on the live site.

- **Without a token** everything is read-only.
- **To save,** create a GitHub fine-grained token:
  1. Go to GitHub → Settings → Developer settings → Fine-grained tokens → Generate.
  2. Under Repository access, choose only `harry66u/marvelous`.
  3. Under Permissions, set Contents to Read and write.
  4. Paste the token under **Access** in the Office. It stays in your browser.

Edits are validated before saving, become commits, and go live after Vercel redeploys (about a minute). **Auto-fill** fills empty days in the next 90 using the same rules as the launch schedule:

- Unmasked: only well-known characters (difficulty 1–3): the most famous Monday to Thursday, slightly less famous Friday to Sunday; no answer repeated within 120 days; no team on two days in a row.
- B-List: only prompts a fan of the films and series can answer (MCU prompts plus a short list of well-known comics teams and villains), easy or medium. Six easy and one medium on weekdays, five and two at weekends; no prompt repeated within 16 days; at most two of one kind; no two on the same subject.
- Retcon: only recognizable records (MCU releases and well-known first appearances, at most one harder record a day, never a deep cut); six records at least three years apart; a well-known anchor first; no record repeated within 25 days.

The day editor shows each day's B-List requests and Retcon records, and can re-roll or clear them.

From the command line:

```bash
npx tsx scripts/autofill-schedule.ts from=YYYY-MM-DD days=90   # Unmasked
npx tsx scripts/autofill-games.ts from=YYYY-MM-DD days=90      # B-List and Retcon
```

All three games are scheduled through 2027-02-07.

## Content

| File | Contents |
|---|---|
| `content/characters.json` | Unmasked characters. Rules: `content/research/RUBRIC.md` |
| `content/schedule.json` | launch date; each day's Unmasked answer, B-List prompt ids and Retcon record ids |
| `content/blist.json` | B-List prompts with every accepted answer, its aliases and its tier. Built by `scripts/research/blist/` |
| `content/retcon.json` | Retcon records with cover month or U.S. release date. Built by `scripts/research/retcon/build_records.py` |
| `content/teams.json` | team and affiliation vocabulary |
| `content/FACTCHECK.md` | every contested call and how it was decided |
| `content/research/` | how the data was built: Wikipedia infobox and MCU cast fetchers, a cross-check, adjudication decisions, and `merge-research.ts` |

Every build validates the content. A bad edit fails the build, and the live site keeps the last good version.

**Rebuilding B-List prompts:** `python3 scripts/research/blist/fetch_wikidata.py` downloads the Marvel slice of Wikidata (slowly; the query service allows about one query a minute), then `python3 scripts/research/blist/build_prompts.py` writes `content/blist.json`. Each answer's tier comes from its estimated share of agents: fame (how many language Wikipedias cover the character), boosted for MCU characters and a team's core members, mapped to the spec's pick-rate thresholds. See `content/FACTCHECK.md`.

## Fonts and licenses

- **Marvelous Display:** original, drawn for this project (`tools/font/`), SIL Open Font License.
- **Share Tech Mono and IBM Plex Mono:** SIL Open Font License.
- **Special Elite:** Apache 2.0.
- **Character facts:** checked against English Wikipedia.
- **B-List answer lists:** Wikidata (CC0), English Wikipedia MCU cast lists, and the fact-checked Unmasked data.
