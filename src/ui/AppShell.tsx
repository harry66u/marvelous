import { useEffect, useState, type ReactNode } from 'react'
import { etWallClock, formatMemoDate } from '../lib/time'
import { AnnounceProvider } from './LiveRegion'
import './effects.css'
import s from './AppShell.module.css'

export const FOOTER_TEXT =
  'Marvelous is an unofficial fan game. Not affiliated with, endorsed by, or sponsored by Marvel or Disney. Character names are used for identification only. All artwork is original.'

const pad = (n: number) => String(n).padStart(2, '0')

function useEtClock(): string {
  const read = () => {
    const w = etWallClock(new Date())
    return `${formatMemoDate(w.date)} · ${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)} ET`
  }
  const [text, setText] = useState(read)
  useEffect(() => {
    const id = setInterval(() => setText(read()), 1000)
    return () => clearInterval(id)
  }, [])
  return text
}

export default function AppShell({ section, children }: { section: string; children: ReactNode }) {
  const clock = useEtClock()
  return (
    <AnnounceProvider>
      <div className={s.shell}>
        <div className="grain" aria-hidden="true" />
        <header className={s.strip}>
          <div className={`wrap ${s.stripIn}`}>
            <span>M.A.R.V.E.L.O.U.S. <i>▸</i> {section}</span>
            <span className={s.clock}>{clock}</span>
          </div>
        </header>
        <main className={s.main}>{children}</main>
        <footer className={s.footer}>
          <div className="wrap"><p>{FOOTER_TEXT}</p></div>
        </footer>
      </div>
    </AnnounceProvider>
  )
}
