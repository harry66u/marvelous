import { useEffect, useId, useRef, type ReactNode } from 'react'
import Button from './Button'
import s from './Dialog.module.css'

interface Props { open: boolean; onClose: () => void; title: string; children: ReactNode }

/** Native modal <dialog>. The parent owns `open`; Esc and the close button both call onClose. */
export default function Dialog({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal()
      else el.setAttribute('open', '')
    } else if (!open && el.open) {
      if (typeof el.close === 'function') el.close()
      else el.removeAttribute('open')
    }
  }, [open])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onCancel = (e: Event) => {
      e.preventDefault() // keep the element open until the parent flips `open`
      onCloseRef.current()
    }
    el.addEventListener('cancel', onCancel)
    return () => el.removeEventListener('cancel', onCancel)
  }, [])

  return (
    <dialog ref={ref} className={s.dialog} aria-labelledby={titleId}>
      <header className={s.head}>
        <h2 id={titleId} className={s.title}>{title}</h2>
        <Button onClick={() => onClose()} aria-label="Close dialog">Close ✕</Button>
      </header>
      <div className={s.body}>{open ? children : null}</div>
    </dialog>
  )
}
