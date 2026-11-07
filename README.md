# Marvelous

A daily Marvel games site dressed as the web portal of a 1970s records bureau: the Multiversal Archive of Records, Variants, Events, Lore & Other Unfiled Stories.

Marvelous is an unofficial fan game. It is not affiliated with, endorsed by, or sponsored by Marvel or Disney. Character names are used for identification only, and all artwork is original.

## Status

Milestone 1 is complete:

- the branch-monitor home page
- **Unmasked**, the daily character game, with 499 fact-checked characters (235 can be daily answers) and 90 days scheduled from 2026-11-06
- the Field Manual
- the Git-backed Scheduling Office

B-List (M2) and Retcon (M3) are next.

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

`npm run build:preview` builds a static copy in `dist-preview/` for hosts without serverless functions. It uses relative paths, in-app routing, and pre-built daily files for the next week.

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

Edits are validated before saving, become commits, and go live after Vercel redeploys (about a minute). **Auto-fill** fills empty days using the same rules as the launch schedule:

- easier answers Monday to Thursday, harder Friday to Sunday
- no answer repeated within 120 days
- no team on two days in a row

From the command line, run `npx tsx scripts/autofill-schedule.ts from=YYYY-MM-DD days=90`.

## Content

| File | Contents |
|---|---|
| `content/characters.json` | Unmasked characters. Rules: `content/research/RUBRIC.md` |
| `content/schedule.json` | launch date and daily answers |
| `content/teams.json` | team and affiliation vocabulary |
| `content/FACTCHECK.md` | every contested call and how it was decided |
| `content/research/` | how the data was built: Wikipedia infobox and MCU cast fetchers, a cross-check, adjudication decisions, and `merge-research.ts` |

Every build validates the content. A bad edit fails the build, and the live site keeps the last good version.

## Fonts and licenses

- **Marvelous Display:** original, drawn for this project (`tools/font/`), SIL Open Font License.
- **Share Tech Mono and IBM Plex Mono:** SIL Open Font License.
- **Special Elite:** Apache 2.0.
- **Character facts:** checked against English Wikipedia.
