import s from './ActionList.module.css'

interface Item { label: string; onSelect?: () => void; href?: string }

export default function ActionList({ title, items }: { title: string; items: Item[] }) {
  return (
    <nav className={s.actions} aria-label={title}>
      <h3 className={s.title}>{title}</h3>
      <ol className={s.list}>
        {items.map((it, i) => {
          const num = <span className={s.num}>{i + 1}.</span>
          return (
            <li key={`${i}-${it.label}`}>
              {it.href ? (
                <a className={s.row} href={it.href}>{num}{it.label}</a>
              ) : (
                <button type="button" className={s.row} onClick={it.onSelect}>{num}{it.label}</button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
