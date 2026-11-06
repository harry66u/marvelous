import type { PublicCharacter } from '../../../content/types'
import { normalizeName } from '../../../lib/normalize'

export interface SearchEntry {
  id: string
  name: string
  realName: string | null
  /** normalized keys; keys[0] is the codename, the rest are aliases and the real name */
  keys: string[]
}

export function buildSearchIndex(chars: readonly PublicCharacter[]): SearchEntry[] {
  return chars.map((c) => ({
    id: c.id,
    name: c.name,
    realName: c.realName,
    keys: [c.name, ...c.aliases, ...(c.realName ? [c.realName] : [])]
      .map(normalizeName)
      .filter((k, i, all) => k !== '' && all.indexOf(k) === i),
  }))
}

const squash = (s: string) => s.replace(/ /g, '')

/** Best rank of `key` for query `q`, or Infinity. `tier` is 0 for the codename, 1 for other keys. */
function rankKey(key: string, q: string, tier: 0 | 1): number {
  const forms: [string, string][] = [[key, q]]
  if (!q.includes(' ')) forms.push([squash(key), q])
  let best = Infinity
  for (const [k, query] of forms) {
    if (tier === 0) {
      if (k === query) best = Math.min(best, 0)
      else if (k.startsWith(query)) best = Math.min(best, 1)
      else if (k.includes(' ' + query)) best = Math.min(best, 2)
    } else if (k.startsWith(query) || k.includes(' ' + query)) best = Math.min(best, 3)
    if (k.includes(query)) best = Math.min(best, 4)
  }
  return best
}

export function searchCharacters(index: readonly SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const q = normalizeName(query)
  if (q === '') return []
  const ranked: { e: SearchEntry; rank: number }[] = []
  for (const e of index) {
    const rank = Math.min(...e.keys.map((k, i) => rankKey(k, q, i === 0 ? 0 : 1)))
    if (rank !== Infinity) ranked.push({ e, rank })
  }
  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.e.name.length - b.e.name.length ||
      a.e.name.localeCompare(b.e.name),
  )
  return ranked.slice(0, limit).map((r) => r.e)
}
