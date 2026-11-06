/**
 * GET /api/day?date=YYYY-MM-DD — the day's puzzle bundle.
 * Vercel runs this as a Function (non-Next.js form: default export with fetch).
 * Scaffold stub: Task 5 replaces the body with buildDayBundle().
 */
export function handleDay(request: Request): Response {
  void request
  return Response.json(
    { error: 'The Archive is still being built.' },
    { status: 501, headers: { 'cache-control': 'no-store' } },
  )
}

export default { fetch: handleDay }
