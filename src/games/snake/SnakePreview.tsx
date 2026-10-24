import { useEffect, useRef } from 'preact/hooks'

import { loadFieldFonts } from '../../ascii'
import { prefersReducedMotion } from '../../shared/motion'

import { autopilot } from './autopilot'
import { createSnake, step, type SnakeState } from './engine'
import { SnakeRenderer } from './render'

const CELL = 16
const INTERVAL = 115
// how long a crashed snake lies in pieces before a new one starts
const REST = 1500

const playOn = (state: SnakeState) => {
  state.queue = [autopilot(state)]
  step(state)
}

/**
 * The snake playing by itself on the card of the main page, on a board as big as the card's cover.
 */
export const SnakePreview = () => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d') ?? null

    if (canvas === null || ctx === null) {
      return
    }

    const still = prefersReducedMotion()
    const renderer = new SnakeRenderer(ctx)
    let state = createSnake(8, 5, 'walls')
    let raf = 0
    let last = 0
    let banked = 0
    let overAt = 0
    let visible = false

    const fresh = () => {
      state = createSnake(state.cols, state.rows, 'walls', 5)
      state.status = 'playing'
      overAt = 0
      banked = 0
      renderer.reset()

      // the still frame for reduced motion shows a snake that has eaten a bit already
      if (still) {
        for (let i = 0; i < 80 && state.status === 'playing'; i++) {
          playOn(state)
        }
      }
    }

    const frame = (now: number) => {
      raf = 0

      const dt = last === 0 ? 0 : Math.min(now - last, 100)

      last = now

      if (state.status === 'playing') {
        banked += dt

        while (state.status === 'playing' && banked >= INTERVAL) {
          banked -= INTERVAL
          playOn(state)

          if (state.ate) {
            renderer.ripple(state.body[0], now)
          }
        }
      } else if (overAt === 0) {
        overAt = now
      } else if (now - overAt > REST) {
        fresh()
      }

      renderer.draw(state, banked / INTERVAL, now)
      schedule()
    }

    const schedule = () => {
      if (raf === 0 && visible && !still) {
        raf = requestAnimationFrame(frame)
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cols = Math.max(8, Math.floor(rect.width / CELL))
      const rows = Math.max(5, Math.floor(rect.height / CELL))

      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      renderer.resize(rect.width, rect.height, dpr, cols, rows)

      if (cols !== state.cols || rows !== state.rows) {
        state = createSnake(cols, rows, 'walls')
        fresh()
      }

      if (still) {
        renderer.draw(state, 1, performance.now())
      }
    }

    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      last = 0
      schedule()
    })

    resizeObserver.observe(canvas)
    intersectionObserver.observe(canvas)
    loadFieldFonts().then(() => {
      if (still) {
        renderer.draw(state, 1, performance.now())
      }
    })

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [])

  return <canvas ref={ref} class='game-preview' aria-hidden='true' />
}
