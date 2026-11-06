import type { ButtonHTMLAttributes } from 'react'
import s from './Button.module.css'

export default function Button({
  variant = 'outline',
  className,
  type = 'button',
  ...rest
}: { variant?: 'outline' | 'solid' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={[s.btn, variant === 'solid' ? s.solid : '', className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}
