import type { PublicCharacter } from '../../../content/types'
import type { UnmaskedShare } from '../../../lib/marks'
import { compareCharacters, feedbackMarks } from './compare'

export const MAX_ATTEMPTS = 6

export interface UnmaskedState {
  date: string
  answerId: string
  guesses: string[]
  status: 'playing' | 'won' | 'lost'
}

export function newUnmasked(date: string, answerId: string): UnmaskedState {
  return { date, answerId, guesses: [], status: 'playing' }
}

export function applyGuess(state: UnmaskedState, id: string, known: ReadonlySet<string>): UnmaskedState {
  if (state.status !== 'playing' || !known.has(id) || state.guesses.includes(id)) return state
  const guesses = [...state.guesses, id]
  const status = id === state.answerId ? 'won' : guesses.length >= MAX_ATTEMPTS ? 'lost' : 'playing'
  return { ...state, guesses, status }
}

export function unmaskedShare(state: UnmaskedState, byId: ReadonlyMap<string, PublicCharacter>): UnmaskedShare {
  const answer = byId.get(state.answerId)
  const rows = state.guesses.flatMap((id) => {
    const guess = byId.get(id)
    return guess && answer ? [feedbackMarks(compareCharacters(guess, answer))] : []
  })
  return { attempts: state.guesses.length, solved: state.status === 'won', rows }
}
