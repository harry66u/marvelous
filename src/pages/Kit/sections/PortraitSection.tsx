import { ARCHETYPES, ORIGINS } from '../../../content/types'
import Portrait from '../../../ui/id/Portrait'

/** All 13 archetypes, each paired with a different origin emblem, at 96px and 160px. */
export default function PortraitSection() {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {ARCHETYPES.map((a, i) => {
        const origin = ORIGINS[i % ORIGINS.length]!
        return (
          <li key={a} style={{ display: 'grid', gap: 6, justifyItems: 'start', color: 'var(--muted)', font: '11px var(--f-hud)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ width: 96 }}><Portrait archetype={a} origin={origin} monogram={String(i + 1).padStart(2, '0')} title={`${a} silhouette, ${origin} origin`} /></div>
              <div style={{ width: 160 }}><Portrait archetype={a} origin={origin} monogram={String(i + 1).padStart(2, '0')} title={`${a} silhouette, ${origin} origin, large`} /></div>
            </div>
            <span>{a} · {origin}</span>
          </li>
        )
      })}
    </ul>
  )
}
