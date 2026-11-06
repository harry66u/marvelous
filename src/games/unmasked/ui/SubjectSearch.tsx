import { useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { playSfx } from '../../../audio/sfx'
import Button from '../../../ui/Button'
import { searchCharacters, type SearchEntry } from '../logic/search'
import s from './SubjectSearch.module.css'

interface Props {
  index: readonly SearchEntry[]
  /** ids already filed this case: shown dimmed and never filed twice */
  guessed: ReadonlySet<string>
  onFile: (id: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
}

const NO_MATCH = 'No record on file. Try a codename, an alias or a real name.'
const alreadyFiled = (name: string) => `${name} is already on file. Choose another subject.`

/** Keeps the highlighted option in view when the list runs past the screen edge. */
const scrollTo = (el: HTMLLIElement | null) => el?.scrollIntoView?.({ block: 'nearest' })

/**
 * ARIA 1.2 combobox with a list popup (manual selection). Typing lists up to eight matches;
 * ↑/↓ move through them, Enter files the highlighted one (or the top match when none is
 * highlighted), Esc closes the list and then clears the field.
 */
export default function SubjectSearch({ index, guessed, onFile, inputRef }: Props) {
  const id = useId()
  const ownRef = useRef<HTMLInputElement>(null)
  const input = inputRef ?? ownRef
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [notice, setNotice] = useState('')

  const results = useMemo(() => searchCharacters(index, query), [index, query])
  const expanded = open && results.length > 0
  const noMatch = query.trim() !== '' && results.length === 0
  const optionId = (i: number) => `${id}-opt-${i}`

  const close = () => {
    setOpen(false)
    setActive(-1)
  }

  const choose = (entry: SearchEntry | undefined) => {
    if (!entry) {
      if (query.trim()) playSfx('miss')
      return
    }
    if (guessed.has(entry.id)) {
      setNotice(alreadyFiled(entry.name))
      playSfx('miss')
      return
    }
    setNotice('')
    setQuery('')
    close()
    onFile(entry.id)
  }

  const fileCurrent = () => {
    const highlighted = expanded && active >= 0 ? results[active] : undefined
    choose(highlighted ?? results.find((r) => !guessed.has(r.id)) ?? results[0])
  }

  const move = (step: 1 | -1) => {
    if (results.length === 0) return
    setOpen(true)
    setActive((a) => {
      if (!expanded || a < 0) return step === 1 ? 0 : results.length - 1
      return (a + step + results.length) % results.length
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      move(e.key === 'ArrowDown' ? 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      fileCurrent()
    } else if (e.key === 'Escape') {
      if (expanded) {
        e.preventDefault()
        close()
      } else if (query) {
        e.preventDefault()
        setQuery('')
        setNotice('')
      }
    }
  }

  return (
    <div className={s.search}>
      <label className={s.label} htmlFor={`${id}-input`}>Enter subject name</label>
      <div className={s.combo}>
        <div className={s.row}>
          <input
            ref={input}
            id={`${id}-input`}
            className={s.input}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={`${id}-list`}
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            aria-describedby={`${id}-status`}
            placeholder="Any name on file"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="go"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              setActive(-1)
              setNotice('')
              playSfx('key')
            }}
            onKeyDown={onKeyDown}
            onBlur={close}
          />
          <Button
            variant={query.trim() === '' ? 'outline' : 'solid'}
            className={s.file}
            disabled={query.trim() === ''}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              fileCurrent()
              input.current?.focus()
            }}
          >
            File
          </Button>
        </div>
        <ul id={`${id}-list`} role="listbox" aria-label="Matching subjects" className={s.list} hidden={!expanded}>
          {expanded
            ? results.map((r, i) => {
                const filed = guessed.has(r.id)
                const showReal = r.realName !== null && !r.name.includes(r.realName)
                const cls = [s.option, i === active ? s.active : '', filed ? s.filed : ''].filter(Boolean).join(' ')
                return (
                  <li
                    key={r.id}
                    ref={i === active ? scrollTo : undefined}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    aria-disabled={filed || undefined}
                    className={cls}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(r)}
                  >
                    <span className={s.optName}>{r.name}</span>
                    {showReal ? <span className={s.optReal}>{r.realName}</span> : null}
                    {filed ? <span className={s.optFiled}>On file</span> : null}
                  </li>
                )
              })
            : null}
        </ul>
      </div>
      <p id={`${id}-status`} role="status" className={s.status}>
        {notice || (noMatch ? NO_MATCH : '')}
      </p>
    </div>
  )
}
