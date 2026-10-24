import { useEffect, useRef, useState } from 'preact/hooks'

import { loadFieldFonts } from '../../ascii'
import { buzz, readBest, saveBest } from '../scores'

import { createBlockBlast, fits, isStuck, place, preview, SIZE, type BlockState } from './engine'
import { PIECES } from './pieces'
import { BlockRenderer, type Drag, type Hover } from './render'

import '../game.css'
import './style.css'

const SAVE_KEY = 'coupick:blockblast-game'
const BEST_KEY = 'blockblast'

// a press that moves less than this and lets go quickly is a tap: it selects the piece instead of dragging
const TAP_MOVE = 8
const TAP_TIME = 300
// on a touch screen the piece rides above the finger, or the finger would hide where it goes
const FINGER_LIFT = 1.6

interface View {
  score: number
  best: number
  combo: number
  sinceClear: number
  over: boolean
  newBest: boolean
  moves: number
}

const formatScore = (score: number) => score.toLocaleString('en').replace(/,/g, ' ')

// an unfinished game survives a reload; a finished one starts over
const load = (): BlockState | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY)

    if (raw === null) {
      return null
    }

    const saved = JSON.parse(raw) as { board: number[], tray: (string | null)[], score: number, combo: number, sinceClear: number, moves: number }
    const tray = saved.tray.map(id => (id === null ? null : PIECES.find(p => p.id === id) ?? null))

    if (saved.board.length !== SIZE * SIZE || tray.every(p => p === null)) {
      return null
    }

    const state: BlockState = {
      board: Int8Array.from(saved.board),
      tray,
      score: saved.score,
      combo: saved.combo,
      sinceClear: saved.sinceClear,
      moves: saved.moves,
      over: false
    }

    state.over = isStuck(state)

    return state.over ? null : state
  } catch {
    return null
  }
}

const save = (state: BlockState) => {
  try {
    if (state.over) {
      localStorage.removeItem(SAVE_KEY)
    } else {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        board: [...state.board],
        tray: state.tray.map(p => p?.id ?? null),
        score: state.score,
        combo: state.combo,
        sinceClear: state.sinceClear,
        moves: state.moves
      }))
    }
  } catch {
    // storage can be blocked; the game just won't survive a reload
  }
}

interface BlockBlastGameProps {
  onBurst?: (x: number, y: number) => void
}

/**
 * The playable block blast: drag pieces onto the board (or tap a piece, then a spot), or play it from the
 * keyboard with 1 2 3, the arrows and enter.
 */
export const BlockBlastGame = ({ onBurst }: BlockBlastGameProps) => {
  const [view, setView] = useState<View>(() => ({ score: 0, best: readBest(BEST_KEY), combo: 0, sinceClear: 0, over: false, newBest: false, moves: 0 }))
  const [confirming, setConfirming] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const restartRef = useRef(() => {})
  const burst = useRef(onBurst)

  burst.current = onBurst

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = boardRef.current
    const ctx = canvas?.getContext('2d') ?? null

    if (canvas === null || wrap === null || ctx === null) {
      return
    }

    const renderer = new BlockRenderer(ctx, 'below')
    let state = load() ?? createBlockBlast()
    let best = readBest(BEST_KEY)
    let raf = 0
    let drag: (Drag & { pointerId: number, downAt: number, startX: number, startY: number, moved: boolean, lift: number }) | null = null
    // a piece picked by a tap or a number key, and where it is aimed
    let selected: number | null = null
    let aim: { row: number, col: number } | null = null

    const sync = (newBest = false) => {
      setView({ score: state.score, best, combo: state.combo, sinceClear: state.sinceClear, over: state.over, newBest, moves: state.moves })
    }

    const pointIn = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()

      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const toViewport = (x: number, y: number) => {
      const rect = canvas.getBoundingClientRect()

      return { x: rect.left + x, y: rect.top + y }
    }

    const hoverFor = (slot: number, row: number, col: number): Hover | null => {
      const piece = state.tray[slot]

      if (piece === null || piece === undefined) {
        return null
      }

      const result = preview(state.board, piece, row, col)

      return result === null ? null : { piece, ...result }
    }

    const currentHover = (): Hover | null => {
      if (drag !== null && drag.moved) {
        const piece = state.tray[drag.slot]

        if (piece === null || piece === undefined) {
          return null
        }

        const { row, col } = renderer.snap(piece, drag.x, drag.y)

        return hoverFor(drag.slot, row, col)
      }

      if (selected !== null && aim !== null) {
        return hoverFor(selected, aim.row, aim.col)
      }

      return null
    }

    const tryPlace = (slot: number, row: number, col: number) => {
      const now = performance.now()
      // placing the last piece of a set makes the engine deal a fresh one
      const lastOfSet = state.tray.filter(p => p !== null).length === 1
      const placement = place(state, slot, row, col)

      if (placement === null) {
        return false
      }

      renderer.placed(placement, now)

      if (lastOfSet) {
        renderer.dealt(now)
      }

      const center = renderer.pieceCenter(placement.piece, row, col)

      if (placement.cleared.length > 0) {
        const p = toViewport(center.x, center.y)

        burst.current?.(p.x, p.y)
        buzz(placement.cleared.length >= 16 ? [15, 40, 15] : 15)
      }

      selected = null
      aim = null

      if (state.over) {
        const newBest = state.score > best

        if (newBest) {
          best = state.score
          saveBest(BEST_KEY, best)
        }

        buzz(80)
        save(state)
        sync(newBest)

        return true
      }

      save(state)
      sync()

      return true
    }

    const restart = () => {
      state = createBlockBlast()
      selected = null
      aim = null
      drag = null
      renderer.reset(performance.now())
      save(state)
      sync()
    }

    restartRef.current = restart

    const frame = (now: number) => {
      renderer.draw(state, now, drag !== null && drag.moved ? drag : null, currentHover(), selected)
      raf = requestAnimationFrame(frame)
    }

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      renderer.resize(rect.width, rect.height, dpr)
    }

    // --- pointer: drag from the tray, or tap a piece and then a spot -----------------------------

    const onPointerDown = (event: PointerEvent) => {
      if (state.over || drag !== null) {
        return
      }

      const { x, y } = pointIn(event)
      const slot = renderer.slotAt(x, y)

      if (slot !== null && state.tray[slot] !== null) {
        const lift = event.pointerType === 'mouse' ? 0 : renderer.cell * FINGER_LIFT

        drag = { slot, x, y: y - lift, since: performance.now(), pointerId: event.pointerId, downAt: performance.now(), startX: x, startY: y, moved: false, lift }
        event.preventDefault()

        try {
          // keeps the piece following the finger even when it leaves the canvas
          canvas.setPointerCapture(event.pointerId)
        } catch {
          // a pointer that is already gone can't be captured; the drag still works inside the canvas
        }
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      const { x, y } = pointIn(event)

      if (drag === null || drag.pointerId !== event.pointerId) {
        // a mouse aims the selected piece just by hovering over the board
        if (selected !== null && event.pointerType === 'mouse') {
          const piece = state.tray[selected]

          aim = piece === null || piece === undefined || renderer.boardCellAt(x, y) === null ? null : renderer.snap(piece, x, y)
        }

        return
      }

      if (!drag.moved && Math.hypot(x - drag.startX, y - drag.startY) > TAP_MOVE) {
        drag.moved = true
        drag.since = performance.now()
        selected = null
        aim = null
      }

      drag.x = x
      drag.y = y - drag.lift
    }

    const onPointerUp = (event: PointerEvent) => {
      const { x, y } = pointIn(event)

      if (drag !== null && drag.pointerId === event.pointerId) {
        const current = drag
        const piece = state.tray[current.slot]

        drag = null

        if (!current.moved && performance.now() - current.downAt < TAP_TIME) {
          // a tap picks the piece up for the next tap on the board, a second tap puts it back
          selected = selected === current.slot ? null : current.slot
          aim = null

          return
        }

        if (current.moved && piece !== null && piece !== undefined) {
          const { row, col } = renderer.snap(piece, current.x, current.y)

          if (!tryPlace(current.slot, row, col)) {
            renderer.returnPiece(current.slot, current.x, current.y, renderer.cell, performance.now())
          }
        }

        return
      }

      // a tap on the board drops the selected piece there
      if (selected !== null && !state.over) {
        const piece = state.tray[selected]

        if (piece !== null && piece !== undefined && renderer.boardCellAt(x, y) !== null) {
          const { row, col } = renderer.snap(piece, x, y)

          tryPlace(selected, row, col)
        }
      }
    }

    const onPointerCancel = () => {
      if (drag !== null && drag.moved) {
        renderer.returnPiece(drag.slot, drag.x, drag.y, renderer.cell, performance.now())
      }

      drag = null
    }

    const onPointerLeave = () => {
      if (selected !== null && drag === null) {
        aim = null
      }
    }

    // --- keyboard: 1 2 3 picks a piece, arrows aim it, enter drops it ----------------------------

    const centerAim = (slot: number) => {
      const piece = state.tray[slot]

      if (piece === null || piece === undefined) {
        return null
      }

      // start where it fits, closest to the middle
      let best: { row: number, col: number } | null = null
      let distance = Infinity

      for (let row = 0; row + piece.rows <= SIZE; row++) {
        for (let col = 0; col + piece.cols <= SIZE; col++) {
          const d = Math.hypot(row + piece.rows / 2 - SIZE / 2, col + piece.cols / 2 - SIZE / 2)

          if (fits(state.board, piece, row, col) && d < distance) {
            best = { row, col }
            distance = d
          }
        }
      }

      return best ?? { row: Math.floor((SIZE - piece.rows) / 2), col: Math.floor((SIZE - piece.cols) / 2) }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || state.over) {
        return
      }

      const number = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code)

      if (number !== -1 && state.tray[number] !== null) {
        selected = number
        aim = centerAim(number)
        event.preventDefault()

        return
      }

      if (selected === null || aim === null) {
        return
      }

      const piece = state.tray[selected]

      if (piece === null || piece === undefined) {
        return
      }

      const moves: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1]
      }
      const move = moves[event.code]

      if (move !== undefined) {
        event.preventDefault()
        aim = {
          row: Math.min(SIZE - piece.rows, Math.max(0, aim.row + move[0])),
          col: Math.min(SIZE - piece.cols, Math.max(0, aim.col + move[1]))
        }
      } else if (event.code === 'Enter' || event.code === 'Space') {
        if (!(event.target instanceof HTMLButtonElement)) {
          event.preventDefault()
          tryPlace(selected, aim.row, aim.col)
        }
      } else if (event.code === 'Escape') {
        selected = null
        aim = null
      }
    }

    const observer = new ResizeObserver(resize)

    observer.observe(wrap)
    resize()
    sync()
    loadFieldFonts()
    raf = requestAnimationFrame(frame)

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('pointerleave', onPointerLeave)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // starting over in the middle of a game takes a second click
  useEffect(() => {
    if (!confirming) {
      return
    }

    const id = setTimeout(() => setConfirming(false), 2500)

    return () => clearTimeout(id)
  }, [confirming])

  const onRestart = (event: MouseEvent) => {
    (event.currentTarget as HTMLElement).blur()

    if (view.moves > 0 && !view.over && !confirming) {
      setConfirming(true)

      return
    }

    setConfirming(false)
    restartRef.current()
  }

  const { score, best, combo, sinceClear, over, newBest } = view

  return (
    <div class='blockblast'>
      <div class='game-toolbar'>
        <div class={`bb-combo mono${combo > 0 ? ' bb-combo-on' : ''}`} aria-live='polite'>
          combo ×{Math.max(combo, 1)}
          <span class='bb-combo-grace' aria-label={`${3 - sinceClear} moves left to keep it`}>
            {[0, 1, 2].map(i => <i key={i} class={i < 3 - sinceClear ? 'on' : ''} />)}
          </span>
        </div>

        <div class='game-score mono'>
          <span class='game-score-value'>{formatScore(score)}</span>
          <span class='game-score-best'>best {formatScore(Math.max(best, score))}</span>
        </div>
      </div>

      <div class='card game-window'>
        <div class='game-window-head mono'>
          <span class='game-dots' aria-hidden='true'>
            <i />
            <i />
            <i />
          </span>
          ~/blockblast
          <button type='button' class='game-window-action' onClick={onRestart}>
            {confirming ? 'sure? click again' : 'new game'}
          </button>
        </div>

        <div ref={boardRef} class='bb-board'>
          <canvas ref={canvasRef} role='img' aria-label={`block blast board, score ${score}`} />

          {over && (
            <div class='game-overlay game-overlay-over'>
              <p class='game-overlay-kicker mono'>{newBest ? 'new best' : 'no room left'}</p>
              <p class='game-overlay-title'>{formatScore(score)}</p>
              <p class='game-overlay-hint mono'>{newBest ? 'that one goes on the fridge' : `best is ${formatScore(best)}`}</p>
              <button type='button' class='button button-primary game-overlay-button' onClick={() => restartRef.current()}>
                again
              </button>
            </div>
          )}
        </div>
      </div>

      <p class='game-hint mono'>
        <span class='only-keys'>drag a piece onto the board · or 1 2 3, arrows and enter</span>
        <span class='only-touch'>drag a piece onto the board, or tap it and then tap a spot</span>
      </p>
    </div>
  )
}
