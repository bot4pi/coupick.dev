import { useEffect, useState } from 'preact/hooks'

// intro:      the page is laid out but hidden behind the glyph field
// assembling: glyphs are flying into the page text, the page chrome fades in
// done:       the page is the real thing
export type IntroPhase = 'intro' | 'assembling' | 'done'

type Listener = (phase: IntroPhase) => void

let phase: IntroPhase = 'done'
const listeners = new Set<Listener>()

export const getIntroPhase = () => phase

export const setIntroPhase = (next: IntroPhase) => {
  const root = document.documentElement

  phase = next
  root.dataset.intro = next

  if (next === 'done') {
    // the page text has to appear in the same frame the canvas stops covering it
    root.classList.add('no-transitions')
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-transitions')))
  }

  for (const listener of [...listeners]) {
    listener(next)
  }
}

export const subscribeIntro = (listener: Listener) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

// runs `callback` once the page is fully shown (right away if it already is), returns a disposer
export const whenIntroDone = (callback: () => void | (() => void)) => {
  let cleanup: void | (() => void)

  if (phase === 'done') {
    cleanup = callback()

    return () => cleanup?.()
  }

  const unsubscribe = subscribeIntro(next => {
    if (next === 'done') {
      unsubscribe()
      cleanup = callback()
    }
  })

  return () => {
    unsubscribe()
    cleanup?.()
  }
}

export const useIntroPhase = () => {
  const [current, setCurrent] = useState(phase)

  useEffect(() => subscribeIntro(setCurrent), [])

  return current
}
