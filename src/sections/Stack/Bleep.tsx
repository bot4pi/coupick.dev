import { useEffect, useRef, useState } from 'preact/hooks'

import { prefersReducedMotion } from '../../shared'

const SYMBOLS = ['#', '!', '@', '*']
const INTERVAL_MS = 280

// "sh#t" with the middle character cycling through symbols, like a censor that can't decide
export const Bleep = () => {
  const ref = useRef<HTMLSpanElement>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const el = ref.current

    if (el === null || prefersReducedMotion()) {
      return
    }

    let timer: ReturnType<typeof setInterval> | undefined

    // only ticks while it is on screen
    const observer = new IntersectionObserver(([entry]) => {
      clearInterval(timer)

      if (entry.isIntersecting) {
        timer = setInterval(() => setIndex(i => (i + 1) % SYMBOLS.length), INTERVAL_MS)
      }
    })

    observer.observe(el)

    return () => {
      observer.disconnect()
      clearInterval(timer)
    }
  }, [])

  return (
    <span ref={ref} class='bleep' aria-label='sh#t'>
      sh<span class='bleep-symbol' aria-hidden='true'>{SYMBOLS[index]}</span>t
    </span>
  )
}
