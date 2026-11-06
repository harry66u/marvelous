import s from './Clock24.module.css'

const DAY_MS = 86_400_000
const CX = 100

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [CX + r * Math.sin(a), CX - r * Math.cos(a)]
}

function wedge(frac: number): string {
  const r = 74
  if (frac >= 0.9999) return `M${CX} ${CX - r}A${r} ${r} 0 1 1 ${CX - 0.01} ${CX - r}Z`
  if (frac <= 0) return ''
  const [x, y] = polar(r, frac * 360)
  return `M${CX} ${CX}L${CX} ${CX - r}A${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`

export function clockLabel(msRemaining: number): string {
  const mins = Math.floor(Math.max(0, msRemaining) / 60_000)
  if (mins < 1) return 'Less than a minute until the next assignment'
  return `${plural(Math.floor(mins / 60), 'hour')} ${plural(mins % 60, 'minute')} until the next assignment`
}

const TICKS = Array.from({ length: 48 }, (_, i) => {
  const deg = i * 7.5
  const major = i % 6 === 0, hour = i % 2 === 0
  const len = major ? 10 : hour ? 6 : 2
  const [x1, y1] = polar(82, deg), [x2, y2] = polar(82 - len, deg)
  return { x1, y1, x2, y2, w: major ? 3 : hour ? 1.6 : 1 }
})
const NUMERALS = [24, 3, 6, 9, 12, 15, 18, 21].map((n, i) => ({ n, pos: polar(60, i * 45) }))

/** 24-hour dial: the wedge and the hour hand show the share of the day left; minute and second hands
 *  show minutes and seconds remaining. */
export default function Clock24({ msRemaining, size = 150 }: { msRemaining: number; size?: number }) {
  const ms = Math.min(Math.max(msRemaining, 0), DAY_MS)
  const frac = ms / DAY_MS
  const rem = Math.floor(ms / 1000)
  const minuteDeg = ((rem % 3600) / 3600) * 360
  const secondDeg = ((rem % 60) / 60) * 360
  return (
    <svg className={s.clock} viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={clockLabel(ms)}>
      <defs>
        <radialGradient id="clock24-face" cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor="#fbf4e2" />
          <stop offset="1" stopColor="#e6d6b3" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="#7a5a38" />
      <circle cx="100" cy="100" r="93" fill="#d6c29a" />
      <circle cx="100" cy="100" r="86" fill="url(#clock24-face)" stroke="#a88d63" strokeWidth="1.5" />
      <path d={wedge(frac)} fill="#f2670f" opacity=".32" />
      {TICKS.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#2a1a10" strokeWidth={t.w} />
      ))}
      {NUMERALS.map(({ n, pos }) => (
        <text key={n} x={pos[0]} y={pos[1] + 4.5} textAnchor="middle" className={s.num}>{n}</text>
      ))}
      <text x="100" y="134" textAnchor="middle" className={s.cap}>24-HR REMAINING</text>
      <g transform={`rotate(${frac * 360} 100 100)`}>
        <path d="M100 112 L96 100 L100 50 L104 100 Z" fill="#2a1a10" />
      </g>
      <g transform={`rotate(${minuteDeg} 100 100)`}>
        <path d="M100 114 L97.5 100 L100 28 L102.5 100 Z" fill="#2a1a10" />
      </g>
      <g transform={`rotate(${secondDeg} 100 100)`}>
        <line x1="100" y1="120" x2="100" y2="24" stroke="#d9480f" strokeWidth="1.6" />
        <circle cx="100" cy="116" r="4" fill="#d9480f" />
      </g>
      <circle cx="100" cy="100" r="4.5" fill="#2a1a10" />
      <circle cx="100" cy="100" r="1.6" fill="#d9480f" />
    </svg>
  )
}
