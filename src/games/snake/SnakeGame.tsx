import { useEffect, useRef, useState } from 'preact/hooks'

import { loadFieldFonts } from '../../ascii'
import { buzz, readBest, saveBest } from '../scores'

import { createSnake, step, stepInterval, turn, type Direction, type SnakeMode, type SnakeState, type SnakeStatus } from './engine'
import { SnakeRenderer } from './render'

import '../game.css'
import './style.css'

const SIZE = 17

const MODES: { mode: SnakeMode, label: string, note: string }[] = [
  { mode: 'walls', label: 'walls', note: 'touch a wall and it is over' },
  { mode: 'portal', label: 'portal', note: 'leave on one side, come back on the other' }
]

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right'
}

// a finger has to travel this far before it counts as a swipe, css px
const SWIPE = 22

interface View {
  status: SnakeStatus
  score: number
  won: boolean
  best: number
  newBest: boolean
}

const MODE_KEY = 'coupick:snake-mode'

const readMode = (): SnakeMode => {
  try {
    return localStorage.getItem(MODE_KEY) === 'portal' ? 'portal' : 'walls'
  } catch {
    return 'walls'
  }
}

const isControl = (target: EventTarget | null) => target instanceof HTMLElement && target.closest('button, a') !== null

interface SnakeGameProps {
  // where the snake ate or crashed, in viewport px: the page lights up the background from there
  onBurst?: (x: number, y: number) => void
}

/**
 * The playable snake: a canvas board in a terminal-like card, steered with arrows, wasd or swipes.
 */
export const SnakeGame = ({ onBurst }: SnakeGameProps) => {
  const [mode, setMode] = useState(readMode)
  const [view, setView] = useState<View>(() => ({ status: 'ready', score: 0, won: false, best: readBest(`snake-${mode}`), newBest: false }))

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const game = useRef<SnakeState | null>(null)
  // commands for the loop living inside the effect
  const controls = useRef({ start: () => {}, togglePause: () => {}, restart: () => {}, steer: (_: Direction) => {} })
  const burst = useRef(onBurst)

  burst.current = onBurst

  useEffect(() => {
    const canvas = canvasRef.current
    const board = boardRef.current
    const ctx = canvas?.getContext('2d') ?? null

    if (canvas === null || board === null || ctx === null) {
      return
    }

    const renderer = new SnakeRenderer(ctx)
    const scoreKey = `snake-${mode}`
    let state = createSnake(SIZE, SIZE, mode)
    let best = readBest(scoreKey)
    let raf = 0
    let last = 0
    // time banked towards the next step: the share of a step already taken is what the renderer slides by
    let banked = 0

    game.current = state

    const sync = (newBest = false) => {
      setView({ status: state.status, score: state.score, won: state.won, best, newBest })
    }

    const burstAt = (cell: { x: number, y: number }) => {
      const rect = canvas.getBoundingClientRect()
      const p = renderer.cellCenter(cell)

      burst.current?.(rect.left + p.x, rect.top + p.y)
    }

    const finish = () => {
      const newBest = state.score > best

      if (newBest) {
        best = state.score
        saveBest(scoreKey, best)
      }

      buzz(state.won ? [30, 60, 30] : 70)
      burstAt(state.body[0])
      sync(newBest)
    }

    const frame = (now: number) => {
      const dt = last === 0 ? 0 : Math.min(now - last, 100)

      last = now

      if (state.status === 'playing') {
        banked += dt

        while (state.status === 'playing' && banked >= stepInterval(state.score)) {
          banked -= stepInterval(state.score)
          step(state)

          if (state.ate) {
            renderer.ripple(state.body[0], now)
            burstAt(state.body[0])
            buzz(12)
            sync()
          }

          // step() may have ended the run; ts still thinks it's playing from the loop condition
          if ((state.status as SnakeStatus) === 'over') {
            finish()
          }
        }
      }

      renderer.draw(state, banked / stepInterval(state.score), now)
      raf = requestAnimationFrame(frame)
    }

    const resize = () => {
      const rect = board.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      renderer.resize(rect.width, rect.height, dpr, SIZE, SIZE)
    }

    const restart = (play: boolean) => {
      state = createSnake(SIZE, SIZE, mode)
      state.status = play ? 'playing' : 'ready'
      game.current = state
      banked = 0
      renderer.reset()
      sync()
    }

    controls.current = {
      start: () => {
        if (state.status === 'ready') {
          state.status = 'playing'
          sync()
        } else if (state.status === 'over') {
          restart(true)
        }
      },
      togglePause: () => {
        if (state.status === 'playing') {
          state.status = 'paused'
          sync()
        } else if (state.status === 'paused') {
          state.status = 'playing'
          last = 0
          sync()
        } else {
          controls.current.start()
        }
      },
      restart: () => restart(true),
      steer: direction => {
        if (state.status === 'over') {
          return
        }

        turn(state, direction)

        // the first arrow is also the start button
        if (state.status !== 'playing') {
          state.status = 'playing'
          last = 0
          sync()
        }
      }
    }

    const onVisibility = () => {
      if (document.hidden && state.status === 'playing') {
        state.status = 'paused'
        sync()
      }
    }

    const observer = new ResizeObserver(resize)

    observer.observe(board)
    resize()
    sync()
    loadFieldFonts()
    raf = requestAnimationFrame(frame)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [mode])

  // the keyboard drives the game anywhere on the page
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      const direction = KEYS[event.code]

      if (direction !== undefined) {
        event.preventDefault()
        controls.current.steer(direction)
      } else if ((event.code === 'Space' || event.code === 'Enter') && !isControl(event.target)) {
        event.preventDefault()
        controls.current.togglePause()
      } else if (event.code === 'Escape' || event.code === 'KeyP') {
        if (game.current?.status === 'playing') {
          controls.current.togglePause()
        }
      } else if (event.code === 'KeyR') {
        controls.current.restart()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // swipes steer and a tap starts or pauses; the finger can keep turning without lifting
  const swipe = useRef<{ x: number, y: number, moved: boolean } | null>(null)

  const onPointerDown = (event: PointerEvent) => {
    if (isControl(event.target)) {
      return
    }

    swipe.current = { x: event.clientX, y: event.clientY, moved: false }
  }

  const onPointerMove = (event: PointerEvent) => {
    const s = swipe.current

    if (s === null) {
      return
    }

    const dx = event.clientX - s.x
    const dy = event.clientY - s.y

    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) {
      return
    }

    controls.current.steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
    swipe.current = { x: event.clientX, y: event.clientY, moved: true }
  }

  const onPointerUp = () => {
    if (swipe.current !== null && !swipe.current.moved) {
      controls.current.togglePause()
    }

    swipe.current = null
  }

  const pickMode = (next: SnakeMode, event: MouseEvent) => {
    // the button would keep the focus and swallow the space bar
    (event.currentTarget as HTMLElement).blur()

    if (next === mode) {
      return
    }

    try {
      localStorage.setItem(MODE_KEY, next)
    } catch {
      // fine, the mode just won't be remembered
    }

    setMode(next)
  }

  const { status, score, best, won, newBest } = view

  return (
    <div class='snake'>
      <div class='game-toolbar'>
        <div class='game-tabs' role='tablist' aria-label='mode'>
          {MODES.map(m => (
            <button
              key={m.mode}
              type='button'
              role='tab'
              class={`game-tab${m.mode === mode ? ' game-tab-active' : ''}`}
              aria-selected={m.mode === mode}
              title={m.note}
              onClick={event => pickMode(m.mode, event)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div class='game-score mono' aria-live='polite'>
          <span class='game-score-value'>${score}</span>
          <span class='game-score-best'>best ${Math.max(best, score)}</span>
        </div>
      </div>

      <div class='card game-window'>
        <div class='game-window-head mono'>
          <span class='game-dots' aria-hidden='true'>
            <i />
            <i />
            <i />
          </span>
          ~/snake
          <span class='game-window-state'>{status === 'playing' ? 'running' : status}</span>
        </div>

        <div
          ref={boardRef}
          class='snake-board'
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { swipe.current = null }}
        >
          <canvas ref={canvasRef} aria-label={`snake board, score ${score}`} role='img' />

          {status !== 'playing' && (
            <div class={`game-overlay game-overlay-${status}`} key={status}>
              {status === 'ready' && (
                <>
                  <p class='game-overlay-title'>eat the money</p>
                  <p class='game-overlay-hint mono'>
                    <span class='only-keys'>press an arrow to start</span>
                    <span class='only-touch'>swipe to start</span>
                  </p>
                </>
              )}

              {status === 'paused' && (
                <>
                  <p class='game-overlay-title'>paused</p>
                  <p class='game-overlay-hint mono'>
                    <span class='only-keys'>space to go on</span>
                    <span class='only-touch'>tap to go on</span>
                  </p>
                </>
              )}

              {status === 'over' && (
                <>
                  <p class='game-overlay-kicker mono'>{won ? 'the board is full' : newBest ? 'new best' : 'game over'}</p>
                  <p class='game-overlay-title'>{won ? 'you won. somehow' : `$${score}`}</p>
                  <p class='game-overlay-hint mono'>
                    {newBest || won ? 'not bad at all' : `best is $${best}`}
                  </p>
                  <button type='button' class='button button-primary game-overlay-button' onClick={() => controls.current.restart()}>
                    again
                    <kbd class='only-keys'>↵</kbd>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <p class='game-hint mono'>
        <span class='only-keys'>arrows or wasd to steer · space pauses · r starts over</span>
        <span class='only-touch'>swipe anywhere on the board to steer · tap to pause</span>
      </p>
    </div>
  )
}
