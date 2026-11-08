import { useEffect, useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { UnmaskedRules } from '../../games/unmasked/ui/FieldManual'
import { BlistRules } from '../../games/blist/ui/FieldManual'
import { RetconRules } from '../../games/retcon/ui/FieldManual'
import AppShell, { FOOTER_TEXT } from '../../ui/AppShell'
import Paper from '../../ui/Paper'
import s from './ManualPage.module.css'

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className={s.section} aria-labelledby={id}>
      <h2 id={id} className={s.h2}>{title}</h2>
      {children}
    </section>
  )
}

export default function ManualPage() {
  const unmaskedId = useId()
  const blistId = useId()
  const retconId = useId()
  useEffect(() => {
    const previous = document.title
    document.title = 'Field manual · Marvelous'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <AppShell section="Field manual">
      <div className={`wrap ${s.page}`}>
        <header className={s.head}>
          <span className={s.tag}>Form 001-M</span>
          <h1 className={s.h1}>Field manual</h1>
          <p className={s.lede}>Rules for the daily assignments, followed by credits for everything on this site.</p>
        </header>

        <Paper className={s.sheet}>
          <section aria-labelledby={unmaskedId}>
            <dl className={s.memo}>
              <div><dt>To</dt><dd>All field agents</dd></div>
              <div><dt>From</dt><dd>Records division</dd></div>
              <div><dt>Re</dt><dd>Assignment 01, identifying the variant</dd></div>
            </dl>
            <h2 id={unmaskedId} className={s.sheetTitle}>Unmasked: identify the variant</h2>
            <UnmaskedRules tone="paper" />
            <p className={s.sheetLink}><Link to="/unmasked">Open today's case</Link></p>
          </section>
        </Paper>

        <Paper className={s.sheet}>
          <section aria-labelledby={blistId}>
            <dl className={s.memo}>
              <div><dt>To</dt><dd>All field agents</dd></div>
              <div><dt>From</dt><dd>Records division</dd></div>
              <div><dt>Re</dt><dd>Assignment 02, records search</dd></div>
            </dl>
            <h2 id={blistId} className={s.sheetTitle}>B-List: records search</h2>
            <BlistRules tone="paper" />
            <p className={s.sheetLink}><Link to="/b-list">Open today's search</Link></p>
          </section>
        </Paper>

        <Paper className={s.sheet}>
          <section aria-labelledby={retconId}>
            <dl className={s.memo}>
              <div><dt>To</dt><dd>All field agents</dd></div>
              <div><dt>From</dt><dd>Records division</dd></div>
              <div><dt>Re</dt><dd>Assignment 03, timeline repair</dd></div>
            </dl>
            <h2 id={retconId} className={s.sheetTitle}>Retcon: timeline repair</h2>
            <RetconRules tone="paper" />
            <p className={s.sheetLink}><Link to="/retcon">Open today's case</Link></p>
          </section>
        </Paper>

        <Section title="About">
          <p>
            Marvelous is a set of daily Marvel puzzles, presented as the internal portal of a records bureau: the
            Multiversal Archive of Records, Variants, Events, Lore &amp; Other Unfiled Stories. Everyone receives the
            same assignments, and they reset at midnight Eastern. Your progress and consecutive shifts are kept on
            this device.
          </p>
          <p className={s.disclaimer}>{FOOTER_TEXT}</p>
        </Section>

        <Section title="Credits and licenses">
          <ul className={s.credits}>
            <li>
              <b>Marvelous Display</b>, the stencil lettering, is an original typeface drawn for this site.
              SIL Open Font License 1.1.
            </li>
            <li><b>Share Tech Mono</b> by Carrois Type Design. SIL Open Font License 1.1.</li>
            <li><b>IBM Plex Mono</b> by IBM. SIL Open Font License 1.1.</li>
            <li><b>Special Elite</b> by Astigmatic. Apache License 2.0.</li>
            <li>
              <b>Character facts</b> are drawn from Wikipedia&rsquo;s articles on each character and on Marvel
              Studios releases (text available under CC BY-SA 4.0). Every record keeps its source links, and
              contested calls are written up in the project&rsquo;s fact-check notes.
            </li>
            <li>
              <b>Artwork</b>: every silhouette, emblem, texture and letterform is original. No official art is used.
            </li>
          </ul>
        </Section>

        <Link className={s.back} to="/">Back to the desk</Link>
      </div>
    </AppShell>
  )
}
