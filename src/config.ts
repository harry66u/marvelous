/** Static preview build (`npm run build:preview`): no server function, in-memory routing, relative assets. */
export const STATIC_PREVIEW = import.meta.env.VITE_STATIC_PREVIEW === '1'

/** Where a day's bundle comes from: the Vercel function, or pre-built files in the static preview. */
export const dayUrl = (date: string) =>
  STATIC_PREVIEW ? `${import.meta.env.BASE_URL}days/${date}.json` : `/api/day?date=${encodeURIComponent(date)}`

export const charactersUrl = () => `${import.meta.env.BASE_URL}data/characters.json`
