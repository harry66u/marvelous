import { useEffect, useId, type RefObject } from 'react'
import type { BlistDay } from '../../../server/dayBundle'
import { PROMPTS_PER_DAY, totalScore, type BlistState } from '../logic/game'
import AnswerForm from './AnswerForm'
import Countdown from './Countdown'
import RecordDrawer from './RecordDrawer'
import type { SubmitOutcome } from './useBlistGame'
import type { View } from './useRequestFlow'
import s from './RequestDesk.module.css'

interface Props {
  view: Exclude<View, { kind: 'end' }>
  state: BlistState
  prompts: BlistDay
  /** a dialog is open: leave focus where it is */
  paused: boolean
  submit: (input: string) => SubmitOutcome
  tick: () => void
  next: () => void
  onMiss: () => void
  inputRef: RefObject<HTMLInputElement | null>
}

/** The play area while a shift is open: one request at a time, then its record. */
export default function RequestDesk({ view, state, prompts, paused, submit, tick, next, onMiss, inputRef }: Props) {
  const promptId = useId()
  const prompt = prompts[view.index]
  const live = view.kind === 'live'

  // B-List hands the field focus as soon as the clock starts (spec §14).
  useEffect(() => {
    if (live && !paused) inputRef.current?.focus()
  }, [live, view.index, paused, inputRef])

  if (!prompt) return null
  const counter = `Request ${view.index + 1} of ${PROMPTS_PER_DAY}`

  if (view.kind === 'filed') {
    const result = state.results[view.index]
    if (!result) return null
    return (
      <RecordDrawer
        index={view.index}
        prompt={prompt.text}
        result={result}
        score={totalScore({ results: state.results.slice(0, view.index + 1) })}
        last={view.index + 1 >= PROMPTS_PER_DAY}
        onNext={next}
      />
    )
  }

  if (view.kind === 'incoming') {
    return (
      <div className={s.incoming}>
        <p className={s.kicker}>{counter}</p>
        <p className={s.teletype}>
          Incoming request<span className={s.cursor} aria-hidden="true" />
        </p>
      </div>
    )
  }

  return (
    <section className={s.request} aria-labelledby={promptId}>
      <p className={s.kicker}>{counter}</p>
      <h2 id={promptId} className={s.prompt}>{prompt.text}</h2>
      {live ? (
        <>
          <Countdown state={state} onTick={tick} />
          <AnswerForm
            key={view.index}
            promptId={promptId}
            misses={state.misses}
            onSubmit={submit}
            onMiss={onMiss}
            inputRef={inputRef}
          />
        </>
      ) : (
        <p className={s.teletype} role="status">
          Retrieving record<span className={s.cursor} aria-hidden="true" />
        </p>
      )}
    </section>
  )
}
