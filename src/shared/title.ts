import { GLYPHS } from '../ascii'

// the tab title is alive too: it types itself in, glitches into glyphs now and then and turns into a ticker
// while the tab sits in the background

const CARET = '_'
const TICKER_TAIL = " ✻ i'm a dev ✻ "

// a glitch shows a few glyphs in a row, slow enough to actually read in the tab
const GLITCH_FRAMES = 4
const GLITCH_FRAME_MS = 260

// crawlers and link previews keep the plain title: an indexed "coupi_" would be a sad search result
const isRobot = () => navigator.webdriver || /bot|crawl|spider|slurp|preview|facebookexternalhit|embed/i.test(navigator.userAgent)

const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

let base = ''
let timers: ReturnType<typeof setTimeout>[] = []
let started = false

const later = (fn: () => void, ms: number) => {
  timers.push(setTimeout(fn, ms))
}

const clear = () => {
  timers.forEach(clearTimeout)
  timers = []
}

const show = (text: string) => {
  document.title = text
}

// a couple of letters flicker through random glyphs and settle back, like the section kickers
const glitch = () => {
  const chars = [...base]
  const spots = chars.map((ch, i) => (/[a-z]/i.test(ch) ? i : -1)).filter(i => i !== -1)
  const picked = spots.sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2))

  for (let frame = 0; frame < GLITCH_FRAMES; frame++) {
    later(() => show(chars.map((ch, i) => (picked.includes(i) ? randomGlyph() : ch)).join('')), frame * GLITCH_FRAME_MS)
  }

  later(() => show(base), GLITCH_FRAMES * GLITCH_FRAME_MS)
  later(glitch, 7000 + Math.random() * 7000)
}

const type = () => {
  const chars = [...base]

  chars.forEach((_, i) => {
    later(() => show(chars.slice(0, i + 1).join('') + CARET), 300 + i * 95 + Math.random() * 40)
  })

  // the caret blinks a few times once the title is written, then goes away
  const done = 300 + chars.length * 95 + 120

  for (let blink = 0; blink < 6; blink++) {
    later(() => show(blink % 2 === 0 ? base : base + CARET), done + blink * 450)
  }

  later(() => show(base), done + 6 * 450)
  later(glitch, done + 6 * 450 + 5000)
}

// in a background tab the title scrolls by, browsers tick it about once a second there anyway
const ticker = () => {
  const text = base + TICKER_TAIL
  let offset = 0

  const step = () => {
    show(text.slice(offset) + text.slice(0, offset))
    offset = (offset + 1) % text.length
    later(step, 400)
  }

  step()
}

const onVisibility = () => {
  clear()

  if (document.hidden) {
    ticker()
  } else {
    show(base)
    later(glitch, 2500)
  }
}

/** Shows the page's title, animated for real visitors who don't mind motion. */
export const animateTitle = (title: string) => {
  base = title
  show(title)

  if (started || isRobot() || still()) {
    return
  }

  started = true
  document.addEventListener('visibilitychange', onVisibility)

  if (document.hidden) {
    ticker()
  } else {
    type()
  }
}
