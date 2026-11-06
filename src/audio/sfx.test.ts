import { playSfx, setSfxEnabled } from './sfx'

describe('sfx', () => {
  let made: number
  beforeEach(() => {
    made = 0
    class FakeCtx {
      constructor() { made++ }
    }
    vi.stubGlobal('AudioContext', FakeCtx)
    setSfxEnabled(false)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('never constructs an AudioContext while disabled', () => {
    playSfx('key')
    playSfx('win')
    expect(made).toBe(0)
  })

  it('is silent when Web Audio is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined)
    setSfxEnabled(true)
    expect(() => playSfx('stamp')).not.toThrow()
  })
})
