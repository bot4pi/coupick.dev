import { MONO_FAMILY } from '../../ascii'
import { clamp01, Drift, easeOut, glyphAt, paintTiles, Ripples } from '../effects'

import { fitsAnywhere, SIZE, TRAY, type BlockState, type Placement } from './engine'
import { STYLES, type Piece } from './pieces'

// the game puts the tray under the board, the card on the main page puts it next to it
export type Orientation = 'below' | 'side'

export interface Drag {
  slot: number
  // css px of the piece's center
  x: number
  y: number
  // when it was picked up: it grows from tray size to board size
  since: number
}

export interface Hover {
  piece: Piece
  placed: number[]
  cleared: number[]
}

interface Clearing {
  i: number
  style: number
  start: number
}

interface Popup {
  text: string
  x: number
  y: number
  size: number
  start: number
}

interface Returning {
  slot: number
  x: number
  y: number
  cell: number
  start: number
}

// the tray is this many board cells tall when it sits under the board
const TRAY_ROWS = 3.3
// and every slot is this many board cells wide when it sits next to it
const SIDE_SLOT = 4.2
// tray pieces are drawn smaller than the board's; the card has room for bigger ones
const TRAY_SCALE = { below: 0.52, side: 0.7 }

const CLEAR_TIME = 460
const CLEAR_STAGGER = 26
const LAND_TIME = 260
const GROW_TIME = 160
const RETURN_TIME = 240
const DEAL_TIME = 380
const CRUMBLE_TIME = 700

/**
 * Draws block blast on a canvas: the board with its blocks and glyph effects, the tray, the piece being
 * dragged and where it would land.
 */
export class BlockRenderer {
  width = 0
  height = 0
  cell = 0
  boardX = 0
  boardY = 0
  trayCell = 0
  slots: { x: number, y: number }[] = []
  slotWidth = 0
  slotHeight = 0

  private dpr = 1
  private readonly tiles = document.createElement('canvas')
  private readonly drift = new Drift()
  private readonly ripples = new Ripples()
  private clearing: Clearing[] = []
  private landing = new Map<number, number>()
  private popups: Popup[] = []
  private returning: Returning[] = []
  private dealtAt = 0
  private overSince = 0
  private crumbleOrder: number[] = []

  constructor (private readonly ctx: CanvasRenderingContext2D, private readonly orientation: Orientation = 'below') {}

  resize (width: number, height: number, dpr: number) {
    this.width = width
    this.height = height
    this.dpr = dpr

    const pad = this.orientation === 'below' ? 12 : 8
    const gap = this.orientation === 'below' ? 14 : 20

    if (this.orientation === 'below') {
      this.cell = Math.min((width - pad * 2) / SIZE, (height - pad * 2 - gap) / (SIZE + TRAY_ROWS))

      const board = this.cell * SIZE

      this.boardX = (width - board) / 2
      this.boardY = pad
      this.slotWidth = board / TRAY
      this.slotHeight = this.cell * TRAY_ROWS
      this.slots = Array.from({ length: TRAY }, (_, i) => ({
        x: this.boardX + this.slotWidth * (i + 0.5),
        y: this.boardY + board + gap + this.slotHeight / 2
      }))
    } else {
      this.cell = Math.min((height - pad * 2) / SIZE, (width - pad * 2 - gap) / (SIZE + SIDE_SLOT * TRAY))

      const board = this.cell * SIZE
      const total = board + gap + this.cell * SIDE_SLOT * TRAY

      this.boardX = (width - total) / 2
      this.boardY = (height - board) / 2
      this.slotWidth = this.cell * SIDE_SLOT
      this.slotHeight = board
      this.slots = Array.from({ length: TRAY }, (_, i) => ({
        x: this.boardX + board + gap + this.slotWidth * (i + 0.5),
        y: this.boardY + board / 2
      }))
    }

    this.trayCell = this.cell * TRAY_SCALE[this.orientation]

    // the empty tiles and the tray slots never change, so they are drawn once and copied every frame
    paintTiles(this.tiles, width, height, dpr, this.boardX, this.boardY, this.cell, SIZE, SIZE)

    const ctx = this.tiles.getContext('2d')

    if (ctx !== null && this.orientation === 'below') {
      ctx.fillStyle = 'rgb(255 255 255 / 0.018)'

      for (const slot of this.slots) {
        ctx.beginPath()
        ctx.roundRect(slot.x - this.slotWidth / 2 + 3, slot.y - this.slotHeight / 2, this.slotWidth - 6, this.slotHeight, 12)
        ctx.fill()
      }
    }
  }

  /** The row and column a piece centered at `x`, `y` snaps to. */
  snap (piece: Piece, x: number, y: number) {
    return {
      row: Math.round((y - (piece.rows * this.cell) / 2 - this.boardY) / this.cell),
      col: Math.round((x - (piece.cols * this.cell) / 2 - this.boardX) / this.cell)
    }
  }

  /** The center of a piece whose top left cell is at `row`, `col`, in css px. */
  pieceCenter (piece: Piece, row: number, col: number) {
    return {
      x: this.boardX + (col + piece.cols / 2) * this.cell,
      y: this.boardY + (row + piece.rows / 2) * this.cell
    }
  }

  slotAt (x: number, y: number) {
    const i = this.slots.findIndex(s => Math.abs(x - s.x) <= this.slotWidth / 2 && Math.abs(y - s.y) <= this.slotHeight / 2)

    return i === -1 ? null : i
  }

  boardCellAt (x: number, y: number) {
    const col = Math.floor((x - this.boardX) / this.cell)
    const row = Math.floor((y - this.boardY) / this.cell)

    return row >= 0 && col >= 0 && row < SIZE && col < SIZE ? { row, col } : null
  }

  // --- effects -------------------------------------------------------------------------------

  placed (placement: Placement, now: number) {
    const { piece, row, col } = placement
    const center = { r: row + piece.rows / 2 - 0.5, c: col + piece.cols / 2 - 0.5 }

    for (const i of placement.placed) {
      if (!placement.cleared.includes(i)) {
        this.landing.set(i, now)
      }
    }

    // cleared blocks crumble starting next to the piece that completed them
    placement.cleared.forEach((i, k) => {
      const distance = Math.hypot(Math.floor(i / SIZE) - center.r, (i % SIZE) - center.c)

      this.clearing.push({ i, style: placement.clearedStyles[k], start: now + distance * CLEAR_STAGGER })
    })

    const { x, y } = this.pieceCenter(piece, row, col)

    if (placement.cleared.length > 0) {
      this.ripples.add(center.c, center.r, now)
    }

    this.popups.push({ text: `+${placement.points}`, x, y, size: this.cell * 0.62, start: now })

    if (placement.combo >= 2) {
      this.popups.push({ text: `combo ×${placement.combo}`, x, y: y + this.cell * 0.75, size: this.cell * 0.4, start: now + 80 })
    }

    if (placement.boardCleared) {
      const board = this.cell * SIZE

      this.popups.push({
        text: 'clean board',
        x: this.boardX + board / 2,
        y: this.boardY + board / 2,
        size: this.cell * 0.8,
        start: now + 250
      })
    }
  }

  dealt (now: number) {
    this.dealtAt = now
  }

  returnPiece (slot: number, x: number, y: number, cell: number, now: number) {
    this.returning.push({ slot, x, y, cell, start: now })
  }

  reset (now: number) {
    this.clearing = []
    this.landing.clear()
    this.popups = []
    this.returning = []
    this.ripples.clear()
    this.overSince = 0
    this.dealtAt = now
  }

  // --- drawing -------------------------------------------------------------------------------

  draw (state: BlockState, now: number, drag: Drag | null, hover: Hover | null, selected: number | null) {
    const { ctx, cell } = this

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.drawImage(this.tiles, 0, 0, this.width, this.height)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const ghost = new Set(hover?.placed ?? [])
    const doomed = new Set(hover?.cleared ?? [])

    // drift and ripples on the empty cells
    ctx.font = `500 ${(cell * 0.5).toFixed(1)}px ${MONO_FAMILY}`
    ctx.fillStyle = '#ededed'

    const rippling = this.ripples.update(now)

    for (let i = 0; i < SIZE * SIZE; i++) {
      if (state.board[i] !== -1 || ghost.has(i)) {
        continue
      }

      const r = Math.floor(i / SIZE)
      const c = i % SIZE
      const x = this.boardX + (c + 0.5) * cell
      const y = this.boardY + (r + 0.5) * cell
      const light = rippling ? this.ripples.light(c, r, now) : 0
      const alpha = Math.max(this.drift.alpha(c, r, now), light * 0.7)

      if (alpha > 0.01) {
        ctx.globalAlpha = alpha
        ctx.fillText(light > 0.02 ? glyphAt(i, now, 60) : this.drift.glyph(i, now), x, y)
      }
    }

    ctx.globalAlpha = 1

    if (state.over && this.overSince === 0) {
      this.overSince = now
      this.crumbleOrder = Array.from({ length: SIZE * SIZE }, () => Math.random())
    } else if (!state.over) {
      this.overSince = 0
    }

    // the blocks on the board
    this.setBlockFont(cell)

    for (let i = 0; i < SIZE * SIZE; i++) {
      const style = state.board[i]

      if (style === -1) {
        continue
      }

      const x = this.boardX + (i % SIZE + 0.5) * cell
      const y = this.boardY + (Math.floor(i / SIZE) + 0.5) * cell

      if (this.overSince !== 0) {
        this.drawCrumble(i, style, x, y, now)

        continue
      }

      const landed = this.landing.get(i)
      let scale = 1

      if (landed !== undefined) {
        const t = clamp01((now - landed) / LAND_TIME)

        scale = 1 + 0.16 * (1 - easeOut(t))

        if (t >= 1) {
          this.landing.delete(i)
        }
      }

      this.drawBlock(x, y, cell, style, 1, scale)

      // blocks that the dragged piece would clear light up
      if (doomed.has(i)) {
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(now / 120)
        ctx.fillStyle = '#fff'
        this.blockPath(x, y, cell, 1)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    // where the dragged piece would land
    if (hover !== null) {
      for (const i of hover.placed) {
        const x = this.boardX + (i % SIZE + 0.5) * cell
        const y = this.boardY + (Math.floor(i / SIZE) + 0.5) * cell

        this.drawBlock(x, y, cell, hover.piece.style, doomed.has(i) ? 0.6 : 0.28, 1, false)
      }
    }

    this.drawClearing(now)
    this.drawPopups(now)
    this.drawTray(state, now, drag, selected)

    if (drag !== null) {
      const piece = state.tray[drag.slot]

      if (piece !== null && piece !== undefined) {
        const size = this.trayCell + (cell - this.trayCell) * easeOut(clamp01((now - drag.since) / GROW_TIME))

        this.drawPiece(piece, drag.x, drag.y, size, 1, true)
      }
    }
  }

  private setBlockFont (size: number) {
    this.ctx.font = `600 ${(size * 0.5).toFixed(1)}px ${MONO_FAMILY}`
  }

  private blockPath (x: number, y: number, size: number, scale: number) {
    const s = size * 0.88 * scale

    this.ctx.beginPath()
    this.ctx.roundRect(x - s / 2, y - s / 2, s, s, s * 0.22)
  }

  // a flat block in its shade of gray with its glyph engraved in the middle
  private drawBlock (x: number, y: number, size: number, style: number, alpha: number, scale: number, glyph = true) {
    const { ctx } = this
    const look = STYLES[style] ?? STYLES[0]

    ctx.globalAlpha = alpha
    ctx.fillStyle = look.fill
    this.blockPath(x, y, size, scale)
    ctx.fill()

    if (glyph && size * scale >= 10) {
      ctx.fillStyle = 'rgb(10 10 10 / 0.4)'
      ctx.fillText(look.glyph, x, y + size * 0.04)
    }

    ctx.globalAlpha = 1
  }

  private drawPiece (piece: Piece, cx: number, cy: number, size: number, alpha: number, lifted = false) {
    const { ctx } = this
    const left = cx - (piece.cols * size) / 2
    const top = cy - (piece.rows * size) / 2

    this.setBlockFont(size)

    if (lifted) {
      ctx.save()
      ctx.shadowColor = 'rgb(0 0 0 / 0.55)'
      ctx.shadowBlur = size * 0.8
      ctx.shadowOffsetY = size * 0.25
    }

    for (const [r, c] of piece.cells) {
      this.drawBlock(left + (c + 0.5) * size, top + (r + 0.5) * size, size, piece.style, alpha, 1)
    }

    if (lifted) {
      ctx.restore()
    }
  }

  private drawTray (state: BlockState, now: number, drag: Drag | null, selected: number | null) {
    const { ctx } = this

    state.tray.forEach((piece, i) => {
      const slot = this.slots[i]

      if (piece === null || slot === undefined || drag?.slot === i) {
        return
      }

      const back = this.returning.find(r => r.slot === i)

      if (back !== undefined) {
        const t = easeOut(clamp01((now - back.start) / RETURN_TIME))

        this.drawPiece(piece, back.x + (slot.x - back.x) * t, back.y + (slot.y - back.y) * t, back.cell + (this.trayCell - back.cell) * t, 1)

        if (t >= 1) {
          this.returning = this.returning.filter(r => r !== back)
        }

        return
      }

      if (selected === i) {
        ctx.fillStyle = 'rgb(255 255 255 / 0.06)'
        ctx.beginPath()
        ctx.roundRect(slot.x - this.slotWidth / 2 + 3, slot.y - this.slotHeight / 2, this.slotWidth - 6, this.slotHeight, 12)
        ctx.fill()
      }

      // a fresh set of pieces pops in one by one
      const dealt = easeOut(clamp01((now - this.dealtAt - i * 70) / DEAL_TIME))
      const playable = state.over || fitsAnywhere(state.board, piece)

      if (dealt > 0) {
        this.drawPiece(piece, slot.x, slot.y, this.trayCell * (0.6 + 0.4 * dealt), (playable ? 1 : 0.28) * dealt)
      }
    })
  }

  // cleared blocks shrink away while a bright glyph scrambles on their spot
  private drawClearing (now: number) {
    const { ctx, cell } = this

    this.clearing = this.clearing.filter(c => now - c.start < CLEAR_TIME)

    for (const c of this.clearing) {
      const t = (now - c.start) / CLEAR_TIME
      const x = this.boardX + (c.i % SIZE + 0.5) * cell
      const y = this.boardY + (Math.floor(c.i / SIZE) + 0.5) * cell

      if (t < 0) {
        this.setBlockFont(cell)
        this.drawBlock(x, y, cell, c.style, 1, 1)

        continue
      }

      this.drawBlock(x, y, cell, c.style, 1 - easeOut(t), 1 - easeOut(t) * 0.55, false)

      ctx.globalAlpha = (1 - t) * 0.95
      ctx.fillStyle = '#fff'
      ctx.font = `600 ${(cell * 0.62).toFixed(1)}px ${MONO_FAMILY}`
      ctx.fillText(glyphAt(c.i, now, 45), x, y)
      ctx.globalAlpha = 1
    }
  }

  // game over: every block scrambles into a glyph and fades, in no particular order
  private drawCrumble (i: number, style: number, x: number, y: number, now: number) {
    const { ctx, cell } = this
    const t = (now - this.overSince - (this.crumbleOrder[i] ?? 0) * 500) / CRUMBLE_TIME

    if (t < 0) {
      this.drawBlock(x, y, cell, style, 1, 1)
    } else if (t < 1) {
      this.drawBlock(x, y, cell, style, (1 - t) * 0.5, 1 - t * 0.5, false)
      ctx.globalAlpha = 1 - t
      ctx.fillStyle = '#fff'
      ctx.fillText(glyphAt(i, now, 50), x, y - easeOut(t) * cell * 0.4)
      ctx.globalAlpha = 1
    }
  }

  private drawPopups (now: number) {
    const { ctx } = this

    this.popups = this.popups.filter(p => now - p.start < 1000)

    for (const p of this.popups) {
      const t = (now - p.start) / 1000

      if (t < 0) {
        continue
      }

      ctx.globalAlpha = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35
      ctx.font = `600 ${p.size.toFixed(1)}px ${MONO_FAMILY}`
      ctx.fillStyle = '#fff'
      ctx.shadowColor = 'rgb(0 0 0 / 0.8)'
      ctx.shadowBlur = 12
      ctx.fillText(p.text, p.x, p.y - easeOut(Math.min(1, t * 1.6)) * this.cell * 0.9)
      ctx.shadowBlur = 0
    }

    ctx.globalAlpha = 1
  }
}
