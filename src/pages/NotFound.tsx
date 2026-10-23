import { useEffect, useMemo, useRef, useState } from 'preact/hooks'

import type { AsciiField } from '../ascii'
import { AsciiCanvas, Spinner } from '../components'
import { IconArrowLeft, prefersReducedMotion } from '../shared'

import './not-found.css'

type Stage = 'typing' | 'searching' | 'done'

const currentPath = () => {
  try {
    return decodeURIComponent(window.location.pathname)
  } catch {
    return window.location.pathname
  }
}

/**
 * A big "404" made of glyphs that keeps sweeping itself with sonar pings, and a little terminal that
 * types `open <path>`, searches for a moment and gives up. Clicking the field pings from the pointer,
 * enter goes home.
 */
export const NotFoundPage = () => {
  const small = window.innerWidth < 640
  // the terminal takes about the bottom 330px; the "404" gets the space above it
  const height = window.innerHeight
  const free = Math.max(height - 330, height * 0.4)
  const wordY = free / 2 / height
  const wordHeight = Math.min(0.42, (free - 40) / height)
  const path = useMemo(currentPath, [])
  const command = `open ${path}`
  const still = useMemo(prefersReducedMotion, [])

  const field = useRef<AsciiField | null>(null)
  const [typed, setTyped] = useState(still ? command.length : 0)
  const [stage, setStage] = useState<Stage>(still ? 'done' : 'typing')

  const pingFromWord = () => {
    const current = field.current

    current?.ping(current.width / 2, current.height * wordY, performance.now())
  }

  // type the command, look for the page for a bit, then give up
  useEffect(() => {
    if (still) {
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []
    let length = 0

    const search = () => {
      setStage('searching')

      for (const delay of [0, 600, 1200]) {
        timers.push(setTimeout(pingFromWord, delay))
      }

      timers.push(setTimeout(() => setStage('done'), 2000))
    }

    const typeNext = () => {
      length += 1
      setTyped(length)
      timers.push(length < command.length ? setTimeout(typeNext, 35 + Math.random() * 55) : setTimeout(search, 350))
    }

    timers.push(setTimeout(typeNext, 700))

    return () => timers.forEach(clearTimeout)
  }, [])

  // and keep scanning now and then
  useEffect(() => {
    if (still || stage !== 'done') {
      return
    }

    const id = setInterval(pingFromWord, 4200)

    return () => clearInterval(id)
  }, [stage])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !(event.target instanceof HTMLAnchorElement)) {
        window.location.href = '/'
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onPointerDown = (event: PointerEvent) => {
    const current = field.current

    if (current !== null && !(event.target as Element).closest('.nf-content')) {
      current.ping(event.clientX, event.clientY, performance.now())
    }
  }

  return (
    <main class='nf' onPointerDown={onPointerDown}>
      <AsciiCanvas
        class='nf-field'
        word='404'
        cellWidth={small ? 9 : 10}
        cellHeight={small ? 18 : 20}
        fontSize={small ? 12 : 13}
        intensity={0.4}
        threshold={0.14}
        wordIntensity={0.85}
        wordWidth={small ? 0.8 : 0.56}
        wordHeight={wordHeight}
        wordY={wordY}
        pointer='window'
        onReady={ready => {
          field.current = ready
        }}
      />

      <div class='container nf-content'>
        <div class='card nf-terminal'>
          <div class='nf-terminal-head mono'>
            <span class='nf-dots' aria-hidden='true'>
              <i />
              <i />
              <i />
            </span>
            ~/404
          </div>

          <div class='nf-terminal-body mono' aria-live='polite'>
            <p>
              <span class='nf-prompt'>$</span> {command.slice(0, typed)}
              {stage === 'typing' && <span class='nf-caret' />}
            </p>

            {stage === 'searching' && (
              <p class='nf-dim'>
                <Spinner /> searching the glyphs…
              </p>
            )}

            {stage === 'done' && (
              <>
                <p>
                  <span class='nf-cross'>✗</span> 404: <b>{path}</b> doesn't exist
                </p>
                <p class='nf-dim'>not a single thing here... not even money</p>
                <p>
                  <span class='nf-prompt'>$</span> <span class='nf-caret' />
                </p>
              </>
            )}
          </div>
        </div>

        <div class='nf-actions'>
          <a class='button button-primary' href='/'>
            <IconArrowLeft size='16px' />
            back home
          </a>
          <span class='nf-hint mono'>or press ↵ · click around, it pings</span>
        </div>
      </div>
    </main>
  )
}
