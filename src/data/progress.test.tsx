import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ProgressProvider, useProgress, useSettings } from './progress'
import { STORE_KEY } from '../lib/progress'

const wrapper = ({ children }: { children: ReactNode }) => <ProgressProvider>{children}</ProgressProvider>

afterEach(() => localStorage.clear())

describe('ProgressProvider', () => {
  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useProgress(), { wrapper })
    act(() => result.current.update((s) => ({ ...s, days: { '2026-11-06': { required: ['unmasked'], games: {} } } })))
    expect(result.current.store.days['2026-11-06']?.required).toEqual(['unmasked'])
    expect(JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}').days['2026-11-06'].required).toEqual(['unmasked'])
  })

  it('exposes settings and applies the motion attribute', () => {
    const { result } = renderHook(() => useSettings(), { wrapper })
    act(() => result.current[1]({ motion: 'reduce' }))
    expect(result.current[0].motion).toBe('reduce')
    expect(document.documentElement.dataset.motion).toBe('reduce')
  })
})
