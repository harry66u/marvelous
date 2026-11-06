import { act, renderHook } from '@testing-library/react'
import { useToday } from './useToday'

afterEach(() => vi.useRealTimers())

describe('useToday', () => {
  it('rolls over at midnight Eastern', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-07T04:59:58Z')) // 23:59:58 ET on Nov 6
    const { result } = renderHook(() => useToday())
    expect(result.current).toBe('2026-11-06')
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current).toBe('2026-11-07')
  })
})
