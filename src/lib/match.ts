import { normalizeName } from './normalize'

/**
 * B-List answer matching (spec §8): normalize, exact name or alias, then a forgiving typo match that
 * never turns one real Marvel name into another.
 */

const ABBREVIATIONS: Record<string, string> = {
  dr: 'doctor',
  mr: 'mister',
  mrs: 'missus',
  ms: 'miss',
  prof: 'professor',
  st: 'saint',
  capt: 'captain',
  cpt: 'captain',
  sgt: 'sergeant',
  gen: 'general',
  lt: 'lieutenant',
}

/** The comparison form: normalizeName plus expanded abbreviations. */
export function matchKey(input: string): string {
  return normalizeName(input)
    .split(' ')
    .map((w) => ABBREVIATIONS[w] ?? w)
    .join(' ')
}

/** Spaces removed, so "ice man" and "spiderman" still meet "Iceman" and "Spider-Man". */
const compact = (key: string) => key.replace(/ /g, '')

/** Optimal string alignment distance: insertions, deletions, substitutions and adjacent swaps. */
export function editDistance(a: string, b: string, limit = Infinity): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1
  const prev2 = new Array<number>(b.length + 1).fill(0)
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  let cur = new Array<number>(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1)
      cur[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > limit) return limit + 1
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j]!
    ;[prev, cur] = [cur, prev]
  }
  return prev[b.length]!
}

/** How many typos a name of this many letters may carry. */
export function typoAllowance(length: number): number {
  if (length <= 4) return 0
  if (length <= 8) return 1
  return 2
}

export interface MatchCandidate {
  name: string
  aliases: readonly string[]
}

export type MatchResult =
  | { kind: 'valid'; index: number; exact: boolean }
  /** a real Marvel name on file, but not an answer to this prompt */
  | { kind: 'known'; name: string }
  | { kind: 'invalid' }
  | { kind: 'empty' }

/**
 * Build a matcher for one prompt. `known` is every Marvel name on file; an input that exactly names
 * one of them is never typo-corrected into a different answer ("Ironman" never becomes "Iceman").
 */
export function buildMatcher(answers: readonly MatchCandidate[], known: readonly string[]): (input: string) => MatchResult {
  const exact = new Map<string, number>()
  const forms: { form: string; index: number }[] = []
  answers.forEach((a, index) => {
    for (const n of [a.name, ...a.aliases]) {
      const c = compact(matchKey(n))
      if (!c) continue
      if (!exact.has(c)) exact.set(c, index)
      forms.push({ form: c, index })
    }
  })
  const knownNames = new Map<string, string>()
  for (const n of known) {
    const c = compact(matchKey(n))
    if (c && !knownNames.has(c)) knownNames.set(c, n)
  }

  return (input) => {
    const c = compact(matchKey(input))
    if (!c) return { kind: 'empty' }
    const hit = exact.get(c)
    if (hit !== undefined) return { kind: 'valid', index: hit, exact: true }
    const knownHit = knownNames.get(c)
    if (knownHit !== undefined) return { kind: 'known', name: knownHit }

    let best = Infinity
    let bestIndex = -1
    let tied = false
    for (const { form, index } of forms) {
      const allow = typoAllowance(Math.max(form.length, c.length))
      if (allow === 0 || Math.min(form.length, c.length) <= 4) continue
      const d = editDistance(c, form, allow)
      if (d > allow) continue
      if (d < best) {
        best = d
        bestIndex = index
        tied = false
      } else if (d === best && index !== bestIndex) {
        tied = true
      }
    }
    if (bestIndex >= 0 && !tied) return { kind: 'valid', index: bestIndex, exact: false }
    return { kind: 'invalid' }
  }
}
