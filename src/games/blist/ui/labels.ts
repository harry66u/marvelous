import { TIERS, type Tier } from '../../../content/types'
import type { BlistDayPrompt } from '../../../server/dayBundle'
import { TIER_LABEL, TIER_POINTS, depthFeet, sublevel, sublevelLabel } from '../logic/game'

/** Edge code for the terminal frame, in the same family as Unmasked's "Case 0012-U". */
export const caseCode = (number: number) => `Case ${String(number).padStart(4, '0')}-B`

export const feet = (score: number) => `${depthFeet(score).toLocaleString('en-US')} ft`

/** The depth gauge's accessible text, e.g. "Depth 1,850 ft · Sublevel B1". */
export const depthText = (score: number) => `Depth ${feet(score)} · ${sublevelLabel(score)}`

/** Short form for tiles and gauge marks: "GL" or "B3". */
export const levelCode = (score: number) => (sublevel(score) === 0 ? 'GL' : `B${sublevel(score)}`)

/** 1-based tier rank for the --tier-N tokens. */
export const tierRank = (tier: Tier) => TIERS.indexOf(tier) + 1

export const tierLine = (tier: Tier) => `${TIER_LABEL[tier]}, ${TIER_POINTS[tier]} points`

export const EXPIRED = 'Request expired'

const RARE: Tier[] = ['sealed', 'classified']

/**
 * "Unclaimed records": up to `max` Sealed Archive answers, then Classified ones, that the player did
 * not give. Stands in for "rarest answers other agents found" until there is a shared ledger.
 */
export function unclaimed(prompt: BlistDayPrompt, given: string | null, max = 2): { name: string; tier: Tier }[] {
  const out: { name: string; tier: Tier }[] = []
  for (const tier of RARE) {
    for (const [name, , t] of prompt.answers) {
      if (out.length >= max) return out
      if (t === tier && name !== given) out.push({ name, tier })
    }
  }
  return out
}
