import { act, renderHook, waitFor } from '@testing-library/react'
import { useDay, dayCacheKey } from './useDay'

const bundle = { date: '2026-11-06', number: 1, launchDate: '2026-11-06', games: ['unmasked'], unmasked: { key: 'abc' } }

function mockFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl)
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('useDay', () => {
  it('loads a scheduled day and caches it', async () => {
    mockFetch(async () => new Response(JSON.stringify(bundle), { status: 200 }))
    const { result } = renderHook(() => useDay('2026-11-06'))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.bundle?.number).toBe(1)
    expect(JSON.parse(localStorage.getItem(dayCacheKey('2026-11-06')) ?? 'null')).toEqual(bundle)
  })

  it('reports an unscheduled day as none', async () => {
    mockFetch(async () => new Response(JSON.stringify({ error: 'x' }), { status: 404 }))
    const { result } = renderHook(() => useDay('2026-11-06'))
    await waitFor(() => expect(result.current.status).toBe('none'))
  })

  it('uses the cached bundle when the network fails', async () => {
    localStorage.setItem(dayCacheKey('2026-11-06'), JSON.stringify(bundle))
    mockFetch(async () => { throw new TypeError('offline') })
    const { result } = renderHook(() => useDay('2026-11-06'))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.bundle?.unmasked?.key).toBe('abc')
  })

  it('reports an error without a cache, and retry() tries again', async () => {
    const fetchFn = mockFetch(async () => { throw new TypeError('offline') })
    const { result } = renderHook(() => useDay('2026-11-06'))
    await waitFor(() => expect(result.current.status).toBe('error'))
    fetchFn.mockImplementation(async () => new Response(JSON.stringify(bundle), { status: 200 }))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })
})
