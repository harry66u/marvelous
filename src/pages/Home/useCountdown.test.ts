import { act, renderHook } from '@testing-library/react'
import { useCountdown } from './useCountdown'

const HOUR = 3_600_000

afterEach(() => vi.useRealTimers())

describe('useCountdown', () => {
  it('counts down to the next Eastern midnight once a second', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-06T22:00:00Z')) // 17:00:00 ET
    const { result } = renderHook(() => useCountdown())
    expect(result.current).toBe(7 * HOUR)

    act(() => { vi.advanceTimersByTime(1_100) })
    expect(result.current).toBeLessThanOrEqual(7 * HOUR - 1_000)
    expect(result.current).toBeGreaterThan(7 * HOUR - 2_000)

    act(() => { vi.advanceTimersByTime(60_000) })
    expect(result.current).toBeLessThanOrEqual(7 * HOUR - 61_000)
    expect(result.current).toBeGreaterThan(7 * HOUR - 62_000)
  })

  it('starts the next day over at midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-07T04:59:59Z')) // 23:59:59 ET on 6 Nov
    const { result } = renderHook(() => useCountdown())
    expect(result.current).toBe(1_000)

    act(() => { vi.advanceTimersByTime(2_000) })
    expect(result.current).toBeGreaterThan(24 * HOUR - 2_000)
    expect(result.current).toBeLessThan(24 * HOUR)
  })

  it('stops its timer on unmount', () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useCountdown())
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
