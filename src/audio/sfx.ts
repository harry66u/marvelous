export type Sfx = 'key' | 'submit' | 'miss' | 'flip' | 'stamp' | 'win' | 'lose' | 'tick' | 'drop' | 'place' | 'incoming'

let enabled = false
let ctx: AudioContext | null = null

export function setSfxEnabled(on: boolean): void {
  enabled = on
}

function getCtx(): AudioContext | null {
  if (ctx) return ctx
  const Ctor: typeof AudioContext | undefined =
    typeof AudioContext === 'undefined' ? undefined : AudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    return null
  }
  return ctx
}

function tone(c: AudioContext, type: OscillatorType, freq: number, start: number, dur: number, gain = 0.08, endFreq?: number) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur)
  g.gain.setValueAtTime(gain, start)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g).connect(c.destination)
  osc.start(start)
  osc.stop(start + dur + 0.01)
}

function noise(c: AudioContext, start: number, dur: number, gain: number, bandpassHz?: number) {
  const buf = c.createBuffer(1, Math.max(1, Math.ceil(c.sampleRate * dur)), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.setValueAtTime(gain, start)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  let node: AudioNode = src
  if (bandpassHz) {
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = bandpassHz
    node = src.connect(f)
  }
  node.connect(g).connect(c.destination)
  src.start(start)
}

export function playSfx(name: Sfx): void {
  if (!enabled) return
  const c = getCtx()
  if (!c) return
  try {
    if (c.state === 'suspended') void c.resume()
    const t = c.currentTime
    switch (name) {
      case 'key': noise(c, t, 0.008, 0.3, 2200); break
      case 'submit': tone(c, 'square', 880, t, 0.06); break
      case 'miss': tone(c, 'square', 220, t, 0.12); break
      case 'flip': tone(c, 'triangle', 1400, t, 0.02); break
      case 'stamp': tone(c, 'sine', 140, t, 0.09, 0.2, 50); noise(c, t, 0.05, 0.1); break
      case 'win': [523, 659, 784].forEach((f, i) => tone(c, 'square', f, t + i * 0.09, 0.09)); break
      case 'lose': [330, 220].forEach((f, i) => tone(c, 'square', f, t + i * 0.14, 0.14)); break
      case 'tick': tone(c, 'square', 1760, t, 0.03); break
      case 'drop': tone(c, 'sine', 300, t, 0.25, 0.2, 90); break
      case 'place': tone(c, 'triangle', 660, t, 0.05); noise(c, t, 0.02, 0.15, 1800); break
      case 'incoming': [988, 1319].forEach((f, i) => tone(c, 'square', f, t + i * 0.08, 0.06)); break
    }
  } catch {
    // audio is decoration; never break the game
  }
}
