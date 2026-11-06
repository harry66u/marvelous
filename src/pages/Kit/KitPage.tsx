import { useState } from 'react'
import ActionList from '../../ui/ActionList'
import AppShell from '../../ui/AppShell'
import Button from '../../ui/Button'
import Clock24 from '../../ui/Clock24'
import Dialog from '../../ui/Dialog'
import Honeycomb from '../../ui/Honeycomb'
import IconRail, { type IconName } from '../../ui/IconRail'
import { Icon } from '../../ui/icons'
import { useAnnounce } from '../../ui/LiveRegion'
import Paper from '../../ui/Paper'
import Stamp from '../../ui/Stamp'
import TerminalFrame from '../../ui/TerminalFrame'
import Ticket from '../../ui/Ticket'
import TileFloor from '../../ui/TileFloor'
import WalnutWall from '../../ui/WalnutWall'
import FontSection from './sections/FontSection'
import PortraitSection from './sections/PortraitSection'
import s from './KitPage.module.css'

const ICONS: IconName[] = ['home', 'manual', 'stats', 'sound-on', 'sound-off', 'settings', 'file', 'lock', 'clock-in']

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className={s.section} aria-labelledby={id}>
      <h2 id={id} className={s.h2}>{title}</h2>
      {children}
    </section>
  )
}

function Kit() {
  const announce = useAnnounce()
  const [open, setOpen] = useState(false)
  const [play, setPlay] = useState(false)
  const [pressed, setPressed] = useState('stats')
  const [ms, setMs] = useState(37_020_000)

  const rail = (
    <IconRail
      items={ICONS.slice(0, 5).map((icon) => ({
        id: icon, label: icon.replace('-', ' '), icon, pressed: pressed === icon,
        onSelect: () => setPressed(icon),
      }))}
    />
  )

  return (
    <div className={`wrap ${s.page}`}>
      <h1 className={s.h1}>Component kit</h1>

      <Section id="k-frame" title="Terminal frame, rail and action list">
        <TerminalFrame
          label="Sample terminal"
          rail={rail}
          codes={{ tl: 'Case 0001-U', tr: 'Sig 1.95 units', bl: 'Terminal 07', br: '2 of 6 filed' }}
        >
          <ActionList
            title="Actions"
            items={[
              { label: 'Open the file', onSelect: () => announce('File opened.') },
              { label: 'Field manual', href: '/manual' },
              { label: 'Clock out', onSelect: () => announce('Clocked out.') },
            ]}
          />
        </TerminalFrame>
      </Section>

      <Section id="k-icons" title="Icons">
        <ul className={s.icons}>
          {ICONS.map((icon) => (
            <li key={icon} className={s.icon}><Icon name={icon} /><span>{icon}</span></li>
          ))}
        </ul>
      </Section>

      <Section id="k-paper" title="Paper, tickets and stamp">
        <Paper>
          <p style={{ margin: 0 }}>
            Memo to all branches: file your assignments before midnight Eastern. Late filings are
            noted, then lovingly ignored.
          </p>
          <div className={s.stampBox}>
            <Stamp text="Filed" sub="Branch review" play={play} />
          </div>
          <Button onClick={() => setPlay(false)} style={{ marginRight: 8 }}>Reset stamp</Button>
          <Button variant="solid" onClick={() => setPlay(true)}>Slam stamp</Button>
        </Paper>
        <div className={s.tickets}>
          <Ticket no="01" title="Unmasked" subtitle="Identify the variant" status="filed" statusText="Filed 3/6" href="/unmasked" />
          <Ticket no="02" title="B-List" subtitle="Records search" status="in_progress" statusText="In progress" />
          <Ticket no="03" title="Floor plan" subtitle="Awaiting clearance" status="pending" statusText="Open" />
          <Ticket no="04" title="Archive" subtitle="Not on shift today" status="unavailable" statusText="Sealed" />
        </div>
      </Section>

      <Section id="k-buttons" title="Buttons and dialog">
        <div className={s.row}>
          <Button>Outline</Button>
          <Button variant="solid">Solid</Button>
          <Button disabled>Disabled</Button>
          <Button onClick={() => setOpen(true)}>Open dialog</Button>
          <Button onClick={() => announce('Polite announcement sent.')}>Announce</Button>
        </div>
        <Dialog open={open} onClose={() => setOpen(false)} title="Settings">
          <p style={{ margin: 0 }}>Sound is off by default. Escape closes this dialog.</p>
        </Dialog>
      </Section>

      <Section id="k-surfaces" title="Honeycomb, walnut wall and tile floor">
        <div className={s.surfaces}>
          <figure className={s.fig}><Honeycomb /><figcaption>Honeycomb ceiling</figcaption></figure>
          <figure className={s.fig}>
            <WalnutWall><div className={s.pad}>Walnut wall</div></WalnutWall>
            <figcaption>Walnut wall</figcaption>
          </figure>
          <figure className={s.fig}>
            <TileFloor><div className={s.pad}>&nbsp;</div></TileFloor>
            <figcaption>Cafeteria tile</figcaption>
          </figure>
        </div>
      </Section>

      <Section id="k-clock" title="24-hour wall clock">
        <div className={s.row}>
          <Clock24 msRemaining={ms} />
          <label className={s.label}>
            Time remaining
            <input type="range" min={0} max={86_400_000} step={60_000} value={ms}
              onChange={(e) => setMs(Number(e.target.value))} />
          </label>
        </div>
      </Section>

      <FontSection />
      <PortraitSection />
    </div>
  )
}

export default function KitPage() {
  return (
    <AppShell section="Component kit">
      <Kit />
    </AppShell>
  )
}
