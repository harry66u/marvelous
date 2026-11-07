import { describe, expect, it } from 'vitest'
import {
  STORE_KEY, assignmentStatus, bestShifts, consecutiveShifts, emptyStore, getRecord,
  loadStore, noteRequired, saveStore, shiftComplete, withRecord, type GameRecord,
} from './progress'

const fakeStorage = (value: string | null, throwOnSet = false) =>
  ({
    getItem: () => value,
    setItem: () => { if (throwOnSet) throw new Error('QuotaExceededError') },
  }) as unknown as Storage

const filed: GameRecord = { status: 'filed', state: {}, startedAt: 'x', filedAt: 'y' }

function completeDays(...dates: string[]) {
  let s = emptyStore()
  for (const d of dates) {
    s = noteRequired(s, d, ['unmasked'])
    s = withRecord(s, d, 'unmasked', filed)
  }
  return s
}

describe('store persistence', () => {
  it('loadStore tolerates corrupt JSON', () => {
    expect(loadStore(fakeStorage('{bad'))).toEqual(emptyStore())
  })
  it('loadStore ignores other versions', () => {
    expect(loadStore(fakeStorage('{"version":2}'))).toEqual(emptyStore())
  })
  it('loadStore without storage', () => {
    expect(loadStore(null)).toEqual(emptyStore())
  })
  it('loadStore reads a saved store', () => {
    const s = completeDays('2026-11-06')
    expect(loadStore(fakeStorage(JSON.stringify(s)))).toEqual(s)
  })
  it('saveStore swallows quota errors', () => {
    expect(() => saveStore(emptyStore(), fakeStorage(null, true))).not.toThrow()
    expect(() => saveStore(emptyStore(), null)).not.toThrow()
  })
  it('saveStore writes under STORE_KEY', () => {
    const calls: [string, string][] = []
    saveStore(emptyStore(), { setItem: (k: string, v: string) => calls.push([k, v]) } as unknown as Storage)
    expect(calls[0]?.[0]).toBe(STORE_KEY)
  })
})

describe('records', () => {
  it('withRecord is immutable and status follows the record', () => {
    const a = emptyStore()
    const b = withRecord(a, '2026-11-06', 'unmasked', { ...filed, status: 'in_progress' })
    expect(a.days).toEqual({})
    expect(getRecord(b, '2026-11-06', 'unmasked')?.status).toBe('in_progress')
    expect(assignmentStatus(b, '2026-11-06', 'unmasked')).toBe('in_progress')
    expect(assignmentStatus(b, '2026-11-06', 'blist')).toBe('pending')
  })
})

describe('shifts', () => {
  it('shiftComplete uses required', () => {
    expect(shiftComplete(completeDays('2026-11-06'), '2026-11-06')).toBe(true)
    const s = noteRequired(emptyStore(), '2026-11-06', ['unmasked', 'blist'])
    expect(shiftComplete(withRecord(s, '2026-11-06', 'unmasked', filed), '2026-11-06')).toBe(false)
    expect(shiftComplete(emptyStore(), '2026-11-06')).toBe(false)
  })
  it('consecutiveShifts', () => {
    const s = completeDays('2026-11-04', '2026-11-05', '2026-11-06')
    expect(consecutiveShifts(s, '2026-11-06')).toBe(3)
    expect(consecutiveShifts(s, '2026-11-07')).toBe(3)
    expect(consecutiveShifts(s, '2026-11-09')).toBe(0)
    expect(consecutiveShifts(completeDays('2026-11-04', '2026-11-06'), '2026-11-06')).toBe(1)
  })
  it('bestShifts', () => {
    const s = completeDays('2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06')
    expect(bestShifts(s)).toBe(3)
    expect(bestShifts(emptyStore())).toBe(0)
  })
})

describe('loadStore sanitizes damaged day records', () => {
  it('drops broken entries instead of crashing later', () => {
    const storage = {
      getItem: () => JSON.stringify({
        version: 1,
        days: { '2026-11-05': null, '2026-11-06': { games: 5 }, '2026-11-07': { required: ['unmasked', 7], games: { unmasked: { status: 'weird' }, retcon: { status: 'filed', state: {} } } } },
        settings: {},
      }),
    } as unknown as Storage
    const s = loadStore(storage)
    expect(s.days['2026-11-05']).toBeUndefined()
    expect(s.days['2026-11-06']).toEqual({ required: [], games: {} })
    expect(s.days['2026-11-07']?.required).toEqual(['unmasked'])
    expect(Object.keys(s.days['2026-11-07']?.games ?? {})).toEqual(['retcon'])
  })
})
