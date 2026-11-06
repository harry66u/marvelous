import type { GameId } from '../content/types'

export interface Settings {
  sound: boolean
  motion: 'system' | 'reduce' | 'full'
  seenManual: Partial<Record<GameId, boolean>>
}

export const DEFAULT_SETTINGS: Settings = { sound: false, motion: 'system', seenManual: {} }

export function effectiveReducedMotion(s: Settings, prefersReduced: boolean): boolean {
  if (s.motion === 'reduce') return true
  if (s.motion === 'full') return false
  return prefersReduced
}

export function applyMotionAttribute(reduced: boolean): void {
  document.documentElement.dataset.motion = reduced ? 'reduce' : 'full'
}
