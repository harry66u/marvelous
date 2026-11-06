/**
 * GET /api/day?date=YYYY-MM-DD — the day's puzzle bundle.
 * Vercel runs this as a Function (non-Next.js form: default export with fetch).
 */
import { buildDayBundle } from '../src/server/dayBundle'
import type { Schedule } from '../src/content/types'
import schedule from '../content/schedule.json' with { type: 'json' }

export function handleDay(request: Request): Response {
  const date = new URL(request.url).searchParams.get('date')
  const result = buildDayBundle(schedule as Schedule, date, new Date())
  if (result.ok) {
    return Response.json(result.bundle, {
      headers: { 'cache-control': 'public, max-age=60, s-maxage=300' },
    })
  }
  return Response.json({ error: result.error }, { status: result.status, headers: { 'cache-control': 'no-store' } })
}

export default { fetch: handleDay }
