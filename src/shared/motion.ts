import type { RefObject } from 'preact'
import { useEffect, useState } from 'preact/hooks'

import { whenIntroDone } from '../intro'

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const isOnScreen = (el: Element) => {
  const rect = el.getBoundingClientRect()

  return rect.top < window.innerHeight && rect.bottom > 0
}

/**
 * Fades `[data-reveal]` elements in as they scroll into view. Whatever is already on screen
 * when the page is shown stays as is: the intro (or the page fade-in) has just revealed it.
 */
export const useReveal = () => {
  useEffect(() => whenIntroDone(() => {
    if (prefersReducedMotion()) {
      return
    }

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.reveal = 'shown'
          observer.unobserve(entry.target)
        }
      }
    }, { rootMargin: '0px 0px -6% 0px' })

    for (const el of document.querySelectorAll<HTMLElement>('[data-reveal=""]')) {
      if (isOnScreen(el)) {
        el.dataset.reveal = 'static'
      } else {
        el.dataset.reveal = 'pending'
        observer.observe(el)
      }
    }

    return () => observer.disconnect()
  }), [])
}

// feeds the pointer position into every `.spot` card for the hover light
export const useSpotlight = () => {
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const card = (event.target as Element | null)?.closest?.<HTMLElement>('.spot')

      if (card === null || card === undefined) {
        return
      }

      const rect = card.getBoundingClientRect()

      card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
      card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
    }

    document.addEventListener('pointermove', onPointerMove, { passive: true })

    return () => document.removeEventListener('pointermove', onPointerMove)
  }, [])
}

// true once the element has been on screen with the page fully shown; never goes back to false
export const useInView = (ref: RefObject<Element>) => {
  const [inView, setInView] = useState(false)

  useEffect(() => whenIntroDone(() => {
    const el = ref.current

    if (el === null) {
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect()
        setInView(true)
      }
    }, { rootMargin: '0px 0px -8% 0px' })

    observer.observe(el)

    return () => observer.disconnect()
  }), [])

  return inView
}

export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)

    onChange()
    list.addEventListener('change', onChange)

    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export { isOnScreen }
