import type { ElementType } from 'react'
import './fonts.css'
import s from './DisplayText.module.css'

export type DisplayTone = 'paper' | 'dark'

export interface DisplayTextProps {
  text: string
  /** Element to render, e.g. 'h1'. Defaults to a span. */
  as?: ElementType
  className?: string
  /** 'paper' for light grounds; 'dark' adds the CRT glow for the void ground. */
  tone?: DisplayTone
}

/**
 * Two-tone Marvelous Display lettering. The element holds the real text once, in the
 * base face; CSS repeats data-text in the shade face on top as decoration that
 * assistive tech skips.
 */
export function DisplayText({ text, as: Tag = 'span', className, tone = 'paper' }: DisplayTextProps) {
  return (
    <Tag className={[s.root, className].filter(Boolean).join(' ')} data-text={text} data-tone={tone}>
      {text}
    </Tag>
  )
}

export default DisplayText
