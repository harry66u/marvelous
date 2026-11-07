import { describe, expect, it } from 'vitest'
import { handleDay } from '../../api/day'
import schedule from '../../content/schedule.json'

const get = (q: string) => handleDay(new Request(`http://x/api/day${q}`))

describe('handleDay', () => {
  it('400 with no-store for a malformed date', async () => {
    const res = get('?date=2026-13-01')
    expect(res.status).toBe(400)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toEqual({ error: 'Malformed date. Use YYYY-MM-DD.' })
  })
  it('403 with no-store for a future date', () => {
    const res = get('?date=2099-01-01')
    expect(res.status).toBe(403)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
  it('404 with no-store for an unscheduled date', () => {
    const res = get('?date=2020-01-01')
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
  it('200 with public caching for a scheduled past date, if any', async () => {
    const date = Object.keys(schedule.days).find((d) => d <= new Date().toISOString().slice(0, 10))
    if (!date) return
    const res = get(`?date=${date}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300')
  })
})
