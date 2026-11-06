import { describe, expect, it } from 'vitest'
import { unmaskedStats } from './stats'

describe('unmaskedStats', () => {
  it('counts distribution by attempts; losses are played, not solved', () => {
    const s = unmaskedStats([
      { attempts: 3, solved: true }, { attempts: 3, solved: true },
      { attempts: 1, solved: true }, { attempts: 6, solved: true },
      { attempts: 6, solved: false },
    ])
    expect(s).toEqual({ played: 5, solved: 4, distribution: [1, 0, 2, 0, 0, 1] })
  })
  it('handles no results', () => {
    expect(unmaskedStats([])).toEqual({ played: 0, solved: 0, distribution: [0, 0, 0, 0, 0, 0] })
  })
})
