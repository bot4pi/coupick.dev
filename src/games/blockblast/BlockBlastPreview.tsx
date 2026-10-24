import { useEffect, useRef } from 'preact/hooks'

import { loadFieldFonts } from '../../ascii'
import { prefersReducedMotion } from '../../shared/motion'
import { clamp01 } from '../effects'

import { pickMove, type Move } from './autoplay'
import { createBlockBlast, place, preview, type BlockState } from './engine'
import { BlockRenderer, type Drag, type Hover } from './render'

// how long a piece flies from the tray to its spot, and the pause before the next one
const FLY = 520
const PAUSE = 650
// how long a lost board stays on screen before a new game starts
const REST = 2200

const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

// a game that already has a few pieces down looks more alive than an empty board
const warmUp = (state: BlockState, moves: number) => {
  for (let i = 0; i < moves && !state.over; i++) {
    const move = pickMove(state)

    if (move === null) {
      break
    }

    place(state, move.slot, move.row, move.col)
  }
}

/**
 * Block blast playing by itself on the card of the main page: pieces fly from the tray onto the board.
 */
export const BlockBlastPreview = () => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d') ?? null

    if (canvas === null || ctx === null) {
      return
    }

    const still = prefersReducedMotion()
    const renderer = new BlockRenderer(ctx, 'side')
    let state = createBlockBlast()
    let raf = 0
    let visible = false
    let flight: (Move & { start: number, from: { x: number, y: number }, to: { x: number, y: number } }) | null = null
    let nextAt = 0
    let overAt = 0

    warmUp(state, still ? 14 : 6)

    const frame = (now: number) => {
      raf = 0

      let drag: Drag | null = null
      let hover: Hover | null = null

      if (state.over) {
        if (overAt === 0) {
          overAt = now
        } else if (now - overAt > REST) {
          state = createBlockBlast()
          warmUp(state, 4)
          renderer.reset(now)
          overAt = 0
        }
      } else if (flight === null && now >= nextAt) {
        const move = pickMove(state)
        const piece = move === null ? null : state.tray[move.slot]

        if (move !== null && piece !== null && piece !== undefined) {
          flight = { ...move, start: now, from: renderer.slots[move.slot], to: renderer.pieceCenter(piece, move.row, move.col) }
        }
      }

      if (flight !== null) {
        const t = clamp01((now - flight.start) / FLY)
        const e = easeInOut(t)
        const piece = state.tray[flight.slot]

        drag = { slot: flight.slot, x: flight.from.x + (flight.to.x - flight.from.x) * e, y: flight.from.y + (flight.to.y - flight.from.y) * e, since: flight.start }

        if (piece !== null && piece !== undefined && t > 0.45) {
          const result = preview(state.board, piece, flight.row, flight.col)

          hover = result === null ? null : { piece, ...result }
        }

        if (t >= 1) {
          const lastOfSet = state.tray.filter(p => p !== null).length === 1
          const placement = place(state, flight.slot, flight.row, flight.col)

          if (placement !== null) {
            renderer.placed(placement, now)
          }

          if (lastOfSet) {
            renderer.dealt(now)
          }

          flight = null
          drag = null
          hover = null
          nextAt = now + PAUSE
        }
      }

      renderer.draw(state, now, drag, hover, null)
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

      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      renderer.resize(rect.width, rect.height, dpr)
      // a piece in the air would land in the old layout's coordinates
      flight = null

      if (still) {
        renderer.draw(state, performance.now(), null, null, null)
      }
    }

    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      schedule()
    })

    resizeObserver.observe(canvas)
    intersectionObserver.observe(canvas)
    loadFieldFonts().then(() => {
      if (still) {
        renderer.draw(state, performance.now(), null, null, null)
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
