import type { CSSProperties, ReactNode } from 'react'
import DisplayText, { type DisplayTone } from '../../../ui/DisplayText'
import Paper from '../../../ui/Paper'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const PUNCTUATION = `.,!?-':/#&+%()"`
const WORDS = ['MARVELOUS', 'UNMASKED', 'B-LIST', 'RETCON', 'CASE CLOSED']

const stack: CSSProperties = { display: 'grid', gap: 16, minWidth: 0 }
const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '12px 28px' }
const glyphRow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '10px 18px', fontSize: 48 }
// MARVELOUS is 6.5em wide and UNMASKED 5.9em: hold full size where they fit, shrink on phones.
const hero: CSSProperties = { fontSize: 'min(120px, calc((100vw - 72px) / 6.8))' }
const words: CSSProperties = { ...row, fontSize: 'min(48px, calc((100vw - 72px) / 6.2))' }
const voidGround: CSSProperties = {
  padding: 'clamp(16px, 4vw, 32px)',
  background: 'var(--void)',
  border: '1px solid var(--line-soft)',
  borderRadius: 'var(--radius-paper)',
}

function Label({ tone, children }: { tone: DisplayTone; children: ReactNode }) {
  return (
    <p style={{
      margin: 0, font: '400 11px/1.2 var(--f-hud)', letterSpacing: '0.16em', textTransform: 'uppercase',
      color: tone === 'paper' ? 'var(--ink)' : 'var(--muted)',
    }}>
      {children}
    </p>
  )
}

function Glyphs({ chars, tone }: { chars: string; tone: DisplayTone }) {
  return (
    <div style={glyphRow}>
      {[...chars].map((ch) => <DisplayText key={ch} text={ch} tone={tone} />)}
    </div>
  )
}

function Specimen({ tone }: { tone: DisplayTone }) {
  const small = [...WORDS, ALPHABET.slice(0, 13), ALPHABET.slice(13), DIGITS, PUNCTUATION]
  return (
    <div style={stack}>
      <Label tone={tone}>120 px</Label>
      <div style={hero}><DisplayText text="MARVELOUS" tone={tone} /></div>
      <Label tone={tone}>48 px</Label>
      <div style={words}>
        {WORDS.slice(1).map((word) => <DisplayText key={word} text={word} tone={tone} />)}
      </div>
      <Glyphs chars={ALPHABET} tone={tone} />
      <Glyphs chars={DIGITS} tone={tone} />
      <Glyphs chars={PUNCTUATION} tone={tone} />
      <Label tone={tone}>16 px</Label>
      <div style={{ ...row, fontSize: 16, gap: '8px 18px' }}>
        {small.map((text) => <DisplayText key={text} text={text} tone={tone} />)}
      </div>
    </div>
  )
}

/** /kit: Marvelous Display on aged paper and on the void ground, at 120, 48 and 16 px. */
export default function FontSection() {
  return (
    <section aria-labelledby="k-font" style={{ display: 'grid', gap: 14, minWidth: 0 }}>
      <h2 id="k-font" style={{
        margin: 0, font: '400 13px var(--f-hud)', letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'var(--muted)',
      }}>
        Marvelous Display
      </h2>
      <p style={{ margin: 0, maxWidth: '62ch', color: 'var(--muted)', fontSize: 'var(--fs-sm)' }}>
        For the site name, game titles and big numbers only. The 120 and 48 px words shrink to
        fit narrow screens. If a kiln stroke shows an orange fringe, the two layers have drifted
        out of register; refile the font.
      </p>
      <Paper><Specimen tone="paper" /></Paper>
      <div style={voidGround}><Specimen tone="dark" /></div>
    </section>
  )
}
