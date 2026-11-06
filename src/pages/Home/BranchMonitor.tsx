import { memo, useEffect, useId, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import type { GameId } from '../../content/types'
import { seededRandom } from '../../lib/random'
import type { Assignment } from './HomePage'
import s from './BranchMonitor.module.css'

interface Point { x: number; y: number }

/** One drawing of the monitor in SVG user units. The labels sit over it in HTML. */
interface Geometry {
  w: number
  h: number
  /** the main line: its height, where it starts, where the lit stretch ends, where it ends */
  main: { y: number; x0: number; lit: number; x1: number }
  /** each assignment's branch leaves the main line at `from` and ends in a node */
  nodes: Record<GameId, Point & { from: number }>
  nodeR: number
  decor: { count: number; from: [number, number]; reach: [number, number]; top: number; bottom: number; maxX: number }
}

/** Board proportions (Form 04), used while the screen is at least 480px wide. */
const WIDE: Geometry = {
  w: 480,
  h: 204,
  main: { y: 112, x0: 24, lit: 334, x1: 456 },
  nodes: {
    unmasked: { from: 64, x: 222, y: 24 },
    blist: { from: 140, x: 282, y: 166 },
    retcon: { from: 206, x: 300, y: 72 },
  },
  nodeR: 7,
  decor: { count: 18, from: [28, 324], reach: [130, 260], top: 10, bottom: 194, maxX: 452 },
}

/** Phones: taller, with the nodes kept left so the labels have room. */
const NARROW: Geometry = {
  w: 320,
  h: 260,
  main: { y: 156, x0: 12, lit: 228, x1: 308 },
  nodes: {
    unmasked: { from: 14, x: 106, y: 34 },
    retcon: { from: 44, x: 122, y: 94 },
    blist: { from: 76, x: 132, y: 210 },
  },
  nodeR: 6,
  decor: { count: 12, from: [16, 222], reach: [90, 200], top: 8, bottom: 252, maxX: 306 },
}

const DRAW_MS = 2600
const round = (n: number) => Math.round(n * 10) / 10
const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ')

function branchPath(y: number, from: number, to: Point): string {
  const len = to.x - from
  const bend = round(to.y + (y - to.y) * 0.08)
  return `M${from} ${y}C${round(from + len * 0.38)} ${y} ${round(from + len * 0.61)} ${bend} ${to.x} ${to.y}`
}

/** Thin background branches: different every day, identical for everyone on that day. */
function decorBranches(date: string, g: Geometry) {
  const rand = seededRandom(`branch-monitor:${date}`)
  const { count, from: [a, b], reach: [minReach, maxReach], top, bottom, maxX } = g.decor
  const y = g.main.y
  const clear = 16 // keeps endpoints off the main line
  return Array.from({ length: count }, (_, i) => {
    const x0 = a + ((b - a) * (i + rand())) / count
    const ey = rand() < 0.5 ? top + (y - clear - top) * rand() : y + clear + (bottom - y - clear) * rand()
    const ex = Math.min(maxX, x0 + minReach + (maxReach - minReach) * rand())
    const len = ex - x0
    return {
      d: `M${round(x0)} ${y}C${round(x0 + len * 0.22)} ${y} ${round(x0 + len * 0.4)} ${round(ey)} ${round(ex)} ${round(ey)}`,
      dot: rand() < 0.6 ? { x: round(ex), y: round(ey) } : null,
    }
  })
}

const signalReading = (date: string) => (1.2 + seededRandom(`signal:${date}`)() * 1.2).toFixed(2)

/** Follows <html data-motion>, which the progress provider keeps in sync with settings and the OS. */
function useReducedMotion(): boolean {
  const read = () => document.documentElement.dataset.motion === 'reduce'
  const [reduced, setReduced] = useState(read)
  useEffect(() => {
    setReduced(read())
    const observer = new MutationObserver(() => setReduced(read()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] })
    return () => observer.disconnect()
  }, [])
  return reduced
}

interface ArtProps {
  g: Geometry
  className?: string
  date: string
  assignments: Assignment[]
  hot: GameId | null
  reduced: boolean
}

const MonitorArt = memo(function MonitorArt({ g, className, date, assignments, hot, reduced }: ArtProps) {
  const uid = useId()
  const glow = `${uid}glow`
  const glowLine = `${uid}line`
  const decor = useMemo(() => decorBranches(date, g), [date, g])
  const { y, x0, lit, x1 } = g.main
  return (
    <svg className={cx(s.art, className)} viewBox={`0 0 ${g.w} ${g.h}`} aria-hidden="true" focusable="false">
      <defs>
        <filter id={glow} filterUnits="userSpaceOnUse" x="0" y="0" width={g.w} height={g.h}>
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={glowLine} filterUnits="userSpaceOnUse" x="0" y="0" width={g.w} height={g.h}>
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g className={s.decor}>
        {decor.map((b, i) => (
          <path key={i} className={s.draw} d={b.d} pathLength={1} style={{ '--i': i } as CSSProperties} />
        ))}
      </g>
      <g className={s.dots}>
        {decor.map((b, i) => (b.dot ? <circle key={i} cx={b.dot.x} cy={b.dot.y} r="2" /> : null))}
      </g>
      <line className={cx(s.lit, s.draw)} x1={x0} y1={y} x2={lit} y2={y} pathLength={1} filter={`url(#${glowLine})`} />
      <line className={s.unlit} x1={lit} y1={y} x2={x1} y2={y} />
      {assignments.map((a, i) => {
        const node = g.nodes[a.id]
        const d = branchPath(y, node.from, node)
        const playable = Boolean(a.to)
        return (
          <g
            key={a.id}
            className={cx(s.branch, !playable && s.idle, hot === a.id && s.hot)}
            data-status={a.status}
            style={{ '--i': i } as CSSProperties}
          >
            <path className={s.draw} d={d} pathLength={1} filter={`url(#${glow})`} />
            <g className={s.knot}>
              {playable ? <circle className={s.pulse} cx={node.x} cy={node.y} r={g.nodeR} /> : null}
              <circle className={s.node} cx={node.x} cy={node.y} r={g.nodeR} />
              {playable && !reduced ? (
                <circle className={s.spark} r="2.6">
                  <animateMotion dur={`${3.3 + i * 0.15}s`} repeatCount="indefinite" path={d} />
                </circle>
              ) : null}
            </g>
          </g>
        )
      })}
    </svg>
  )
})

/** Label anchors as percentages of each drawing, so they track the nodes at any width. */
function anchor(id: GameId, index: number): CSSProperties {
  const pct = (g: Geometry, axis: 'x' | 'y') => `${round((g.nodes[id][axis] / (axis === 'x' ? g.w : g.h)) * 100)}%`
  return {
    '--wx': pct(WIDE, 'x'), '--wy': pct(WIDE, 'y'), '--nx': pct(NARROW, 'x'), '--ny': pct(NARROW, 'y'), '--k': index,
  } as CSSProperties
}

function BranchLabel({ a, index, onHot }: { a: Assignment; index: number; onHot: (id: GameId | null) => void }) {
  const body = (
    <>
      <span className={s.title}><span aria-hidden="true">{a.no} </span>{a.title}</span>
      <span className="sr-only">, </span>
      <span className={s.status}>{a.statusText}</span>
    </>
  )
  return (
    <li className={s.item} style={anchor(a.id, index)} data-status={a.status}>
      {a.to ? (
        <Link
          to={a.to}
          className={cx(s.label, s.link)}
          onPointerEnter={() => onHot(a.id)}
          onPointerLeave={() => onHot(null)}
          onFocus={() => onHot(a.id)}
          onBlur={() => onHot(null)}
        >
          {body}
        </Link>
      ) : (
        <span className={s.label}>{body}</span>
      )}
    </li>
  )
}

export interface BranchMonitorProps {
  /** puzzle date: seeds the decorative branches and the signal reading */
  date: string
  /** the three assignments, in branch order (keep the array stable between renders) */
  assignments: Assignment[]
  /** puzzle number for the HUD, once the day's bundle is in */
  shiftNo?: number
  /** formatted time to the next puzzle */
  countdown: string
}

/** The home page's curved CRT: a bright main line with one branch per assignment. */
export default function BranchMonitor({ date, assignments, shiftNo, countdown }: BranchMonitorProps) {
  const reduced = useReducedMotion()
  const [drawing, setDrawing] = useState(() => !reduced)
  const [hot, setHot] = useState<GameId | null>(null)

  useEffect(() => {
    if (!drawing) return
    const timer = setTimeout(() => setDrawing(false), DRAW_MS)
    return () => clearTimeout(timer)
  }, [drawing])

  const shift = shiftNo === undefined ? 'SHIFT #---' : `SHIFT #${String(shiftNo).padStart(3, '0')}`
  const art = { date, assignments, hot, reduced }

  return (
    <nav className={s.crt} aria-label="Branch monitor" data-drawing={drawing && !reduced ? '' : undefined}>
      <div className={s.bezel}>
        <div className={s.screen}>
          <div className={cx(s.hud, s.hudTop)} aria-hidden="true">
            <span>Branch monitor</span>
            <span>{shift}<span className={s.motto}> &gt;&gt;&gt; For the record</span></span>
          </div>
          <i className={s.hair} aria-hidden="true" />
          <div className={s.plot}>
            <MonitorArt g={WIDE} className={s.wide} {...art} />
            <MonitorArt g={NARROW} className={s.narrow} {...art} />
            <ol className={s.labels} role="list">
              {assignments.map((a, i) => (
                <BranchLabel key={a.id} a={a} index={i} onHot={setHot} />
              ))}
            </ol>
          </div>
          <i className={cx(s.hair, s.hairLow)} aria-hidden="true" />
          <div className={cx(s.hud, s.hudLow)} aria-hidden="true">
            <span className={s.signal}>Sig {signalReading(date)} units</span>
            <span className={s.next}>Next assignment {countdown}</span>
          </div>
          <div className={s.scan} aria-hidden="true" />
        </div>
        <span className={cx(s.knob, s.knobL)} aria-hidden="true" />
        <span className={cx(s.knob, s.knobR)} aria-hidden="true" />
      </div>
      <div className={s.foot} aria-hidden="true" />
    </nav>
  )
}
