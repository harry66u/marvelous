import { useId, useRef, useState } from 'react'
import Button from './Button'
import s from './CopyReport.module.css'

/** "Copy report" with a selectable fallback when the clipboard is unavailable. */
export default function CopyReport({ text, label = 'Copy report' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle')
  const area = useRef<HTMLTextAreaElement>(null)
  const id = useId()
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('manual')
      requestAnimationFrame(() => area.current?.select())
    }
  }
  return (
    <div className={s.wrap}>
      <Button variant="solid" onClick={copy}>{label}</Button>
      <p className={s.status} role="status">
        {state === 'copied' ? 'Report copied to the clipboard.' : ''}
        {state === 'manual' ? 'The clipboard is not available here. Select the report below and copy it.' : ''}
      </p>
      <label htmlFor={id} className="sr-only">Shift report</label>
      <textarea id={id} ref={area} className={s.text} readOnly value={text} rows={text.split('\n').length} />
    </div>
  )
}
