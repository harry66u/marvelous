import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, applyMotionAttribute, effectiveReducedMotion } from './settings'

describe('settings', () => {
  afterEach(() => { delete document.documentElement.dataset.motion })
  it('defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({ sound: false, motion: 'system', seenManual: {} })
  })
  it('effectiveReducedMotion', () => {
    expect(effectiveReducedMotion({ ...DEFAULT_SETTINGS, motion: 'system' }, true)).toBe(true)
    expect(effectiveReducedMotion({ ...DEFAULT_SETTINGS, motion: 'system' }, false)).toBe(false)
    expect(effectiveReducedMotion({ ...DEFAULT_SETTINGS, motion: 'reduce' }, false)).toBe(true)
    expect(effectiveReducedMotion({ ...DEFAULT_SETTINGS, motion: 'full' }, true)).toBe(false)
  })
  it('applyMotionAttribute', () => {
    applyMotionAttribute(true)
    expect(document.documentElement.dataset.motion).toBe('reduce')
    applyMotionAttribute(false)
    expect(document.documentElement.dataset.motion).toBe('full')
  })
})
