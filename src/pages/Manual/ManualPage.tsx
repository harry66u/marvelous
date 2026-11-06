import { useEffect, useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { UnmaskedRules } from '../../games/unmasked/ui/FieldManual'
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

        <Section title="B-List and Retcon">
          <p>Awaiting clearance. Their rules will be filed here when the assignments open.</p>
        </Section>

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
