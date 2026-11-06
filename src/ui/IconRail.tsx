import SmartLink from './SmartLink'
import { Icon, type IconName } from './icons'
import s from './IconRail.module.css'

export type { IconName }
interface Item {
  id: string; label: string; icon: IconName; onSelect?: () => void; href?: string; pressed?: boolean
}

export default function IconRail({ items }: { items: Item[] }) {
  return (
    <nav className={s.rail} aria-label="Terminal menu">
      {items.map((it) => {
        const cls = `${s.ri} ${it.pressed ? s.on : ''}`
        return it.href ? (
          <SmartLink key={it.id} className={cls} href={it.href} aria-label={it.label} title={it.label}
            aria-current={it.pressed ? 'page' : undefined}>
            <Icon name={it.icon} />
          </SmartLink>
        ) : (
          <button key={it.id} type="button" className={cls} onClick={it.onSelect} aria-label={it.label}
            title={it.label} aria-pressed={it.pressed === undefined ? undefined : it.pressed}>
            <Icon name={it.icon} />
          </button>
        )
      })}
    </nav>
  )
}
