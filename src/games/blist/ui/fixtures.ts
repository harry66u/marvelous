import type { Tier } from '../../../content/types'
import { galactus, rogue, storm, strange } from '../../unmasked/logic/fixtures'
import { STORE_KEY } from '../../../lib/progress'
import type { BlistDay } from '../../../server/dayBundle'
import { TIER_POINTS, type BlistState } from '../logic/game'

/** Test fixtures for the B-List UI: one realistic request, then six simple ones. */
export const PROMPTS: BlistDay = [
  {
    id: 'ff-members',
    text: 'Name a member of the Fantastic Four',
    answers: [
      ['Mister Fantastic', ['Reed Richards', 'Mr. Fantastic'], 'common'],
      ['Invisible Woman', ['Sue Storm'], 'filed'],
      ['Human Torch', ['Johnny Storm'], 'common'],
      ['Thing', ['Ben Grimm'], 'common'],
      ['Crystal', [], 'restricted'],
      ['Ms. Marvel (Sharon Ventura)', ['Sharon Ventura'], 'classified'],
      ['Lyja', ['Lyja the Lazerfist'], 'sealed'],
    ],
  },
  ...[1, 2, 3, 4, 5, 6].map((i) => ({
    id: `p${i}`,
    text: `Name a record from drawer ${i}`,
    answers: [
      [`Alpha${i}`, [], 'common'],
      [`Bravo${i}`, [], 'filed'],
      [`Charlie${i}`, [], 'restricted'],
      [`Delta${i}`, [], 'classified'],
      [`Echo${i}`, [], 'sealed'],
      [`Foxtrot${i}`, [], 'sealed'],
    ] as [string, string[], Tier][],
  })),
]

export const ROSTER = [storm, rogue, galactus, strange]

export const DATE = '2026-11-06'

export function seedStore(settings: Record<string, unknown> = {}, days: Record<string, unknown> = {}) {
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({
      version: 1,
      days,
      settings: { sound: false, motion: 'full', extendedTimer: false, seenManual: { blist: true }, ...settings },
    }),
  )
}

export function stored(date = DATE) {
  return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}').days?.[date]?.games?.blist
}

/** A stored B-List game. `answers` gives one [name, tier] or null (expired) per filed request. */
export function blistDay(answers: ([string, Tier] | null)[], over: Partial<BlistState> = {}, date = DATE) {
  const results = answers.map((a) => (a ? { answer: a[0], tier: a[1], points: TIER_POINTS[a[1]] } : { answer: null, tier: null, points: 0 }))
  const done = results.length >= 7
  const state: BlistState = {
    date,
    extended: false,
    current: results.length,
    startedAt: null,
    penaltyMs: 0,
    misses: [],
    results,
    status: done ? 'done' : 'playing',
    ...over,
  }
  return {
    [date]: {
      required: ['unmasked', 'blist'],
      games: {
        blist: {
          status: state.status === 'done' ? 'filed' : 'in_progress',
          state,
          startedAt: `${date}T12:00:00.000Z`,
          ...(state.status === 'done'
            ? { result: { score: results.reduce((n, r) => n + r.points, 0), extended: state.extended, tiers: results.map((r) => r.tier) }, filedAt: `${date}T12:10:00.000Z` }
            : {}),
        },
      },
    },
  }
}
