import { useEffect, useState } from 'react'
import type { PublicCharacter } from '../content/types'

export interface CharactersState {
  status: 'loading' | 'ready' | 'error'
  characters: PublicCharacter[]
  byId: ReadonlyMap<string, PublicCharacter>
  retry: () => void
}

let request: Promise<PublicCharacter[]> | null = null

function loadCharacters(): Promise<PublicCharacter[]> {
  request ??= fetch('/data/characters.json').then((res) => {
    if (!res.ok) throw new Error(`characters: HTTP ${res.status}`)
    return res.json() as Promise<PublicCharacter[]>
  })
  request.catch(() => {
    request = null // let the next caller try again
  })
  return request
}

const EMPTY = new Map<string, PublicCharacter>()

/** The public character file, fetched once per page load and shared by every caller. */
export function useCharacters(): CharactersState {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<Omit<CharactersState, 'retry'>>({ status: 'loading', characters: [], byId: EMPTY })
  useEffect(() => {
    let cancelled = false
    loadCharacters().then(
      (characters) => {
        if (!cancelled) setState({ status: 'ready', characters, byId: new Map(characters.map((c) => [c.id, c])) })
      },
      () => {
        if (!cancelled) setState((s) => ({ ...s, status: 'error' }))
      },
    )
    return () => {
      cancelled = true
    }
  }, [attempt])
  return { ...state, retry: () => setAttempt((n) => n + 1) }
}
