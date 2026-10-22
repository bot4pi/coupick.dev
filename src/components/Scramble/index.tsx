import { useEffect, useRef } from 'preact/hooks'

import { randomGlyph } from '../../ascii'
import { whenIntroDone } from '../../intro'
import { isOnScreen, prefersReducedMotion } from '../../shared/motion'

// resolves `text` left to right out of random glyphs, writing straight into the text node
export const scramble = (node: Text, text: string, duration: number) => {
  const chars = [...text]
  const settleAt = chars.map((_, i) => (i / chars.length) * duration * 0.65 + Math.random() * duration * 0.35)
  const start = performance.now()
  let raf = 0

  const tick = (now: number) => {
    const elapsed = now - start
    let out = ''
    let settled = true

    for (let i = 0; i < chars.length; i++) {
      if (elapsed >= settleAt[i] || chars[i].trim() === '') {
        out += chars[i]
      } else {
        out += randomGlyph()
        settled = false
      }
    }

    node.nodeValue = out

    if (!settled) {
      raf = requestAnimationFrame(tick)
    }
  }

  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
    node.nodeValue = text
  }
}

interface ScrambleProps {
  text: string
  class?: string
  // `view`: once, when it first scrolls into view; `hover`: whenever the closest link is hovered
  on?: 'view' | 'hover'
}

// best on monospace text, where every glyph has the same width
export const Scramble = ({ text, class: className, on = 'view' }: ScrambleProps) => {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    const node = el?.firstChild

    if (el === null || !(node instanceof Text) || prefersReducedMotion()) {
      return
    }

    if (on === 'hover') {
      const host = el.closest('a, button') ?? el
      let stop: (() => void) | null = null

      const onEnter = () => {
        stop?.()
        stop = scramble(node, text, 420)
      }

      host.addEventListener('pointerenter', onEnter)

      return () => {
        host.removeEventListener('pointerenter', onEnter)
        stop?.()
      }
    }

    return whenIntroDone(() => {
      if (isOnScreen(el)) {
        return
      }

      let stop: (() => void) | null = null

      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          stop = scramble(node, text, 700)
        }
      }, { rootMargin: '0px 0px -6% 0px' })

      observer.observe(el)

      return () => {
        observer.disconnect()
        stop?.()
      }
    })
  }, [text, on])

  return <span ref={ref} class={className}>{text}</span>
}
