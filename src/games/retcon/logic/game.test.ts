import { describe, expect, it } from 'vitest'
import { ALLOWANCES, correctCount, newRetcon, pending, place, retconShare, timeline, trueSlot, yearOf, type RetconCard } from './game'

const cards: RetconCard[] = [
  { id: 'spidey', date: '1962-08' },
  { id: 'ff', date: '1961-11' },
  { id: 'im', date: '2008-05-02' },
  { id: 'wolvie', date: '1974-10' },
  { id: 'gwen', date: '2014-09' },
  { id: 'cap', date: '1941-03' },
]
const byId = new Map(cards.map((c) => [c.id, c]))
const order = cards.map((c) => c.id)

describe('Retcon', () => {
  it('starts with the anchor on the line and the next record pending', () => {
    const s = newRetcon('d', order)
    expect(timeline(s, byId).map((c) => c.id)).toEqual(['spidey'])
    expect(pending(s)).toBe('ff')
    expect(s.allowances).toBe(ALLOWANCES)
  })

  it('finds the true slot by date', () => {
    const line = [byId.get('ff')!, byId.get('spidey')!]
    expect(trueSlot(line, byId.get('cap')!)).toBe(0)
    expect(trueSlot(line, byId.get('wolvie')!)).toBe(2)
  })

  it('locks in a correct placement and keeps the allowances', () => {
    const out = place(newRetcon('d', order), byId, 0)!
    expect(out.correct).toBe(true)
    expect(out.state.placements).toEqual(['correct'])
    expect(out.state.allowances).toBe(3)
    expect(timeline(out.state, byId).map((c) => c.id)).toEqual(['ff', 'spidey'])
  })

  it('costs an allowance for a wrong slot and snaps the record to its true place', () => {
    const out = place(newRetcon('d', order), byId, 1)!
    expect(out.correct).toBe(false)
    expect(out.slot).toBe(0)
    expect(out.state.allowances).toBe(2)
    expect(timeline(out.state, byId).map((c) => c.id)).toEqual(['ff', 'spidey'])
  })

  it('wins after five placements', () => {
    let s = newRetcon('d', order)
    for (const slot of [0, 2, 2, 4, 0]) s = place(s, byId, slot)!.state
    expect(s.status).toBe('won')
    expect(pending(s)).toBeNull()
    expect(correctCount(s)).toBe(5)
    expect(retconShare(s)).toEqual({ correct: 5, placements: ['correct', 'correct', 'correct', 'correct', 'correct'] })
  })

  it('files the rest automatically when the allowances run out', () => {
    let s = newRetcon('d', order)
    for (const slot of [1, 0, 0]) s = place(s, byId, slot)!.state
    expect(s.status).toBe('lost')
    expect(s.placements).toEqual(['wrong', 'wrong', 'wrong', 'auto', 'auto'])
    expect(timeline(s, byId).map((c) => c.id)).toEqual(['cap', 'ff', 'spidey', 'wolvie', 'im', 'gwen'])
    expect(correctCount(s)).toBe(0)
  })

  it('ignores out-of-range slots and moves after the case closes', () => {
    const s = newRetcon('d', order)
    expect(place(s, byId, 5)).toBeNull()
    expect(place(s, byId, -1)).toBeNull()
    let done = s
    for (const slot of [0, 2, 2, 4, 0]) done = place(done, byId, slot)!.state
    expect(place(done, byId, 0)).toBeNull()
  })

  it('reads the year off either date form', () => {
    expect(yearOf('1962-08')).toBe(1962)
    expect(yearOf('2008-05-02')).toBe(2008)
  })
})
