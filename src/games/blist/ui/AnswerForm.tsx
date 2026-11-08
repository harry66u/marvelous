import { useId, useState, type FormEvent, type RefObject } from 'react'
import { playSfx } from '../../../audio/sfx'
import { matchKey } from '../../../lib/match'
import Button from '../../../ui/Button'
import { useAnnounce } from '../../../ui/LiveRegion'
import type { SubmitOutcome } from './useBlistGame'
import s from './AnswerForm.module.css'

export const NO_RECORD = 'No record on file.'
export const notResponsive = (name: string) => `Record on file, but not responsive to this request: ${name}.`

interface Props {
  /** id of the prompt text, read with the field */
  promptId: string
  /** wrong inputs already charged on this request */
  misses: readonly string[]
  onSubmit: (input: string) => SubmitOutcome
  /** a wrong answer was filed: the terminal shakes */
  onMiss: () => void
  inputRef: RefObject<HTMLInputElement | null>
}

/** One answer per request. A miss keeps the text, selected, so the next attempt types straight over it. */
export default function AnswerForm({ promptId, misses, onSubmit, onMiss, inputRef }: Props) {
  const id = useId()
  const announce = useAnnounce()
  const [value, setValue] = useState('')
  const [message, setMessage] = useState('')

  const file = (e: FormEvent) => {
    e.preventDefault()
    if (!value.trim()) {
      setMessage('Type a name, then file it.')
      return
    }
    const repeat = misses.includes(matchKey(value))
    const out = onSubmit(value)
    if (out.kind === 'valid') {
      playSfx('submit')
      return
    }
    if (out.kind !== 'miss') return
    const base = out.known ? notResponsive(out.known) : NO_RECORD
    setMessage(repeat ? `${base} Already charged.` : `${base} −3 s`)
    announce(repeat ? `${base} Already charged, no further deduction.` : `${base} Minus 3 seconds.`)
    playSfx('miss')
    onMiss()
    inputRef.current?.select()
  }

  return (
    <form className={s.form} onSubmit={file} noValidate>
      <label htmlFor={`${id}-input`} className={s.label}>Your answer</label>
      <div className={s.row}>
        <input
          ref={inputRef}
          id={`${id}-input`}
          className={s.input}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (message) setMessage('')
          }}
          aria-describedby={`${promptId} ${id}-msg`}
          autoComplete="off"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          placeholder="Name on file"
        />
        <Button type="submit" variant="solid" className={s.file}>File</Button>
      </div>
      <p id={`${id}-msg`} className={s.message}>{message}</p>
    </form>
  )
}
