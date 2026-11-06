import {
  addDays, daysBetween, etDateOf, etWallClock, formatCountdown, formatMemoDate, isIsoDate,
  msUntilNextPuzzle, nextEtMidnight, puzzleNumber, weekday,
} from './time'

describe('etDateOf', () => {
  it('flips at midnight Eastern in standard time (UTC-5)', () => {
    expect(etDateOf(new Date('2026-11-07T04:59:59Z'))).toBe('2026-11-06')
    expect(etDateOf(new Date('2026-11-07T05:00:00Z'))).toBe('2026-11-07')
  })
  it('flips at midnight Eastern in daylight time (UTC-4)', () => {
    expect(etDateOf(new Date('2026-07-01T03:59:59Z'))).toBe('2026-06-30')
    expect(etDateOf(new Date('2026-07-01T04:00:00Z'))).toBe('2026-07-01')
  })
})

describe('etWallClock', () => {
  it('reads hour, minute and second in Eastern time', () => {
    expect(etWallClock(new Date('2026-11-06T18:30:15Z'))).toEqual({ date: '2026-11-06', hour: 13, minute: 30, second: 15 })
    expect(etWallClock(new Date('2026-11-07T05:00:00Z')).hour).toBe(0)
  })
})

describe('nextEtMidnight', () => {
  it('handles the day DST starts (2 am, Mar 8 2026)', () => {
    expect(nextEtMidnight(new Date('2026-03-07T12:00:00Z')).toISOString()).toBe('2026-03-08T05:00:00.000Z')
    expect(nextEtMidnight(new Date('2026-03-08T12:00:00Z')).toISOString()).toBe('2026-03-09T04:00:00.000Z')
  })
  it('handles the day DST ends (2 am, Nov 1 2026)', () => {
    expect(nextEtMidnight(new Date('2026-10-31T12:00:00Z')).toISOString()).toBe('2026-11-01T04:00:00.000Z')
    expect(nextEtMidnight(new Date('2026-11-01T12:00:00Z')).toISOString()).toBe('2026-11-02T05:00:00.000Z')
  })
  it('returns the following midnight when called exactly at midnight', () => {
    expect(nextEtMidnight(new Date('2026-11-07T05:00:00Z')).toISOString()).toBe('2026-11-08T05:00:00.000Z')
  })
  it('crosses the year boundary', () => {
    expect(nextEtMidnight(new Date('2026-12-31T20:00:00Z')).toISOString()).toBe('2027-01-01T05:00:00.000Z')
  })
})

describe('msUntilNextPuzzle', () => {
  it('counts down to the next Eastern midnight', () => {
    expect(msUntilNextPuzzle(new Date('2026-11-06T23:00:00Z'))).toBe(6 * 3600 * 1000)
  })
})

describe('calendar arithmetic', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('counts days between dates', () => {
    expect(daysBetween('2026-11-06', '2027-02-03')).toBe(89)
    expect(daysBetween('2026-11-06', '2026-11-06')).toBe(0)
    expect(daysBetween('2026-11-07', '2026-11-06')).toBe(-1)
  })
  it('numbers puzzles from the launch date', () => {
    expect(puzzleNumber('2026-11-06', '2026-11-06')).toBe(1)
    expect(puzzleNumber('2026-11-06', '2026-11-17')).toBe(12)
    expect(puzzleNumber('2026-11-06', '2026-11-05')).toBe(0)
  })
  it('knows the weekday (0 = Sunday)', () => {
    expect(weekday('2026-11-06')).toBe(5)
    expect(weekday('2026-11-08')).toBe(0)
  })
  it('validates ISO dates', () => {
    expect(isIsoDate('2026-11-06')).toBe(true)
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-1-01')).toBe(false)
    expect(isIsoDate('')).toBe(false)
  })
})

describe('formatting', () => {
  it('formats a countdown as HH:MM:SS and clamps at zero', () => {
    expect(formatCountdown(3_723_000)).toBe('01:02:03')
    expect(formatCountdown(-5)).toBe('00:00:00')
    expect(formatCountdown(86_399_999)).toBe('23:59:59')
  })
  it('formats memo dates', () => {
    expect(formatMemoDate('2026-11-06')).toBe('06 NOV 2026')
    expect(formatMemoDate('2027-01-31')).toBe('31 JAN 2027')
  })
})
