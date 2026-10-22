import { render } from 'preact'

import { Intro } from './Intro'
import { setIntroPhase } from './state'

export * from './state'

const SEEN_KEY = 'coupick:intro-seen'

let host: HTMLDivElement | null = null

// once per tab session; `?intro` forces it, reduced motion skips it
export const shouldPlayIntro = () => {
  if (new URLSearchParams(window.location.search).has('intro')) {
    return true
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false
  }

  try {
    return window.sessionStorage.getItem(SEEN_KEY) === null
  } catch {
    return true
  }
}

export const playIntro = () => {
  const root = document.getElementById('app')

  if (root === null || host !== null) {
    return
  }

  window.scrollTo({ top: 0, behavior: 'instant' })
  root.inert = true
  setIntroPhase('intro')

  const close = () => {
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // storage can be blocked; the intro then simply plays again next time
    }

    if (host !== null) {
      render(null, host)
      host.remove()
      host = null
    }
  }

  host = document.createElement('div')
  document.body.append(host)
  render(<Intro root={root} onClose={close} />, host)
}
