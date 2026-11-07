import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/**
 * After an in-app navigation, move keyboard and screen-reader focus to the new page's main
 * heading, the way a full page load would. Pages load lazily, so it waits briefly for the heading.
 */
export default function RouteFocus() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    let tries = 0
    const timer = setInterval(() => {
      const h1 = document.querySelector<HTMLElement>('main h1')
      if (h1 || ++tries > 40) {
        clearInterval(timer)
        if (h1) {
          if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
          h1.focus({ preventScroll: false })
        }
      }
    }, 50)
    return () => clearInterval(timer)
  }, [pathname])
  return null
}
