/**
 * GET /api/day?date=YYYY-MM-DD — the day's puzzle bundle.
 * Vercel runs this as a Function (non-Next.js form: default export with fetch).
 * Relative imports name their .js file: Vercel compiles api/ without bundling (see functionImports.test.ts).
 */
import { buildDayBundle, type GameContent } from '../src/server/dayBundle.js'
import type { BlistPrompt, RetconRecord, Schedule } from '../src/content/types.js'
import schedule from '../content/schedule.json' with { type: 'json' }
import blist from '../content/blist.json' with { type: 'json' }
import retcon from '../content/retcon.json' with { type: 'json' }

const content: GameContent = {
  prompts: new Map((blist as BlistPrompt[]).map((p) => [p.id, p])),
  records: new Map((retcon as RetconRecord[]).map((r) => [r.id, r])),
}

export function handleDay(request: Request): Response {
  const date = new URL(request.url).searchParams.get('date')
  const result = buildDayBundle(schedule as Schedule, date, new Date(), content)
  if (result.ok) {
    return Response.json(result.bundle, {
      headers: { 'cache-control': 'public, max-age=60, s-maxage=300' },
    })
  }
  return Response.json({ error: result.error }, { status: result.status, headers: { 'cache-control': 'no-store' } })
}

export default { fetch: handleDay }
