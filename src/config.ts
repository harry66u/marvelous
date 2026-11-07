import previewData from 'virtual:preview-data'

/** Static preview build (`npm run build:preview`): no server function, in-memory routing, data baked in. */
export const STATIC_PREVIEW = import.meta.env.VITE_STATIC_PREVIEW === '1'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** A day's bundle: from the Vercel function, or from the data baked into the static preview. */
export function fetchDay(date: string): Promise<Response> {
  if (STATIC_PREVIEW) {
    const bundle = previewData.days[date]
    return Promise.resolve(bundle ? json(bundle) : json({ error: 'not scheduled' }, 404))
  }
  return fetch(`/api/day?date=${encodeURIComponent(date)}`)
}

/** The public character file. */
export function fetchCharacters(init?: RequestInit): Promise<Response> {
  if (STATIC_PREVIEW) return Promise.resolve(json(previewData.characters))
  return fetch(`${import.meta.env.BASE_URL}data/characters.json`, init)
}
