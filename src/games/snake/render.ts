import { MONO_FAMILY } from '../../ascii'
import { Drift, glyphAt, paintTiles, Ripples, easeOut } from '../effects'

import { delta, type Point, type SnakeState } from './engine'

// how long each segment takes to crumble into glyphs when the run ends, and the delay between them
const CRUMBLE = 650
const CRUMBLE_STAGGER = 28

const FOOD_GLYPH = '$'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Draws a snake game on a canvas: faint drifting glyphs on the empty board, the snake sliding smoothly
 * between cells, the money it eats and the glyph effects around both.
 */
export class SnakeRenderer {
  width = 0
  height = 0
  cell = 0
  // where the board starts inside the canvas: it is centered when the aspect ratios differ
  left = 0
  top = 0

  private dpr = 1
  private cols = 0
  private rows = 0
  private readonly tiles = document.createElement('canvas')
  private readonly drift = new Drift()
  private readonly ripples = new Ripples()
  private food: Point | null = null
  private foodSince = 0
  private overSince = 0

  constructor (private readonly ctx: CanvasRenderingContext2D) {}

  resize (width: number, height: number, dpr: number, cols: number, rows: number) {
    this.width = width
    this.height = height
    this.dpr = dpr
    this.cols = cols
    this.rows = rows
    this.cell = Math.min(width / cols, height / rows)
    this.left = (width - this.cell * cols) / 2
    this.top = (height - this.cell * rows) / 2

    // the empty tiles never change, so they are drawn once and copied every frame
    paintTiles(this.tiles, width, height, dpr, this.left, this.top, this.cell, cols, rows)
  }

  // css px of a cell's center, for effects outside the canvas
  cellCenter (p: Point) {
    return { x: this.left + (p.x + 0.5) * this.cell, y: this.top + (p.y + 0.5) * this.cell }
  }

  ripple (p: Point, now: number) {
    this.ripples.add(p.x, p.y, now)
  }

  reset () {
    this.ripples.clear()
    this.overSince = 0
    this.food = null
  }

  /** `progress` is how far the snake is between its last two cells, 0..1. */
  draw (state: SnakeState, progress: number, now: number) {
    const { ctx, cell } = this

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.drawImage(this.tiles, 0, 0, this.width, this.height)

    ctx.save()
    ctx.beginPath()
    ctx.rect(this.left, this.top, cell * this.cols, cell * this.rows)
    ctx.clip()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `500 ${(cell * 0.56).toFixed(1)}px ${MONO_FAMILY}`

    this.drawDrift(now)
    this.drawRipples(now)
    this.drawFood(state, now)

    if (state.status === 'over' && !state.won) {
      if (this.overSince === 0) {
        this.overSince = now
      }

      this.drawCrumbling(state, now)
    } else {
      this.overSince = 0
      // linear on purpose: any easing makes the snake stutter on every cell
      this.drawSnake(state, Math.min(1, Math.max(0, progress)))
    }

    ctx.restore()
  }

  private drawDrift (now: number) {
    const { ctx, cell } = this

    ctx.fillStyle = '#ededed'

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const alpha = this.drift.alpha(x, y, now)

        if (alpha > 0) {
          ctx.globalAlpha = alpha
          ctx.fillText(this.drift.glyph(y * this.cols + x, now), this.left + (x + 0.5) * cell, this.top + (y + 0.5) * cell)
        }
      }
    }

    ctx.globalAlpha = 1
  }

  private drawRipples (now: number) {
    const { ctx, cell } = this

    if (!this.ripples.update(now)) {
      return
    }

    ctx.fillStyle = '#ededed'

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const light = this.ripples.light(x, y, now)

        if (light > 0.02) {
          ctx.globalAlpha = light * 0.75
          ctx.fillText(glyphAt(y * this.cols + x, now, 60), this.left + (x + 0.5) * cell, this.top + (y + 0.5) * cell)
        }
      }
    }

    ctx.globalAlpha = 1
  }

  private drawFood (state: SnakeState, now: number) {
    const food = state.food

    if (food === null) {
      return
    }

    if (this.food === null || this.food.x !== food.x || this.food.y !== food.y) {
      this.food = { ...food }
      this.foodSince = now
    }

    const { ctx, cell } = this
    const appear = easeOut(Math.min(1, (now - this.foodSince) / 320))
    const pulse = 0.5 + 0.5 * Math.sin(now / 260)
    const { x, y } = this.cellCenter(food)

    ctx.save()
    ctx.translate(x, y)
    ctx.scale(appear, appear)
    ctx.font = `600 ${(cell * 0.82).toFixed(1)}px ${MONO_FAMILY}`
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgb(255 255 255 / 0.75)'
    ctx.shadowBlur = cell * (0.35 + pulse * 0.45)
    ctx.fillText(FOOD_GLYPH, 0, cell * 0.04)
    ctx.restore()
  }

  // every segment slides from where it was to where it is now; across a portal it shows on both sides
  private segmentPositions (state: SnakeState, i: number, t: number): Point[] {
    const to = state.body[i]
    const from = state.from[i] ?? to
    const dx = to.x - from.x
    const dy = to.y - from.y

    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
      return [{ x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }]
    }

    const mx = dx > 1 ? -1 : dx < -1 ? 1 : dx
    const my = dy > 1 ? -1 : dy < -1 ? 1 : dy

    return [
      { x: from.x + mx * t, y: from.y + my * t },
      { x: to.x - mx * (1 - t), y: to.y - my * (1 - t) }
    ]
  }

  private drawSnake (state: SnakeState, t: number) {
    const { ctx, cell } = this
    const length = state.body.length

    ctx.fillStyle = '#ededed'

    // tail first, so the head is drawn on top
    for (let i = length - 1; i >= 0; i--) {
      const share = length > 1 ? i / (length - 1) : 0
      const size = cell * (i === 0 ? 0.88 : 0.8 - share * 0.2)

      ctx.globalAlpha = i === 0 ? 1 : 0.92 - share * 0.62

      for (const p of this.segmentPositions(state, i, t)) {
        const x = this.left + (p.x + 0.5) * cell
        const y = this.top + (p.y + 0.5) * cell

        ctx.beginPath()
        ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.3)
        ctx.fill()

        if (i === 0) {
          this.drawEyes(state, x, y, size)
        }
      }
    }

    ctx.globalAlpha = 1
  }

  private drawEyes (state: SnakeState, x: number, y: number, size: number) {
    const { ctx } = this
    const d = delta(state.direction)
    const eye = size * 0.15
    const forward = size * 0.16
    const side = size * 0.21

    ctx.save()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#0a0a0a'

    for (const s of [-1, 1]) {
      const ex = x + d.x * forward + d.y * side * s
      const ey = y + d.y * forward + d.x * side * s

      ctx.beginPath()
      ctx.roundRect(ex - eye / 2, ey - eye / 2, eye, eye, eye * 0.3)
      ctx.fill()
    }

    ctx.restore()
  }

  // the run is over: from the head back, every segment scrambles into glyphs and fades out
  private drawCrumbling (state: SnakeState, now: number) {
    const { ctx, cell } = this
    const elapsed = now - this.overSince
    const length = state.body.length

    ctx.font = `600 ${(cell * 0.7).toFixed(1)}px ${MONO_FAMILY}`

    for (let i = length - 1; i >= 0; i--) {
      const t = (elapsed - i * CRUMBLE_STAGGER) / CRUMBLE
      const share = length > 1 ? i / (length - 1) : 0
      const base = i === 0 ? 1 : 0.92 - share * 0.62
      const { x, y } = this.cellCenter(state.body[i])

      if (t < 0) {
        const size = cell * (i === 0 ? 0.88 : 0.8 - share * 0.2)

        ctx.globalAlpha = base
        ctx.fillStyle = '#ededed'
        ctx.beginPath()
        ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.3)
        ctx.fill()
      } else if (t < 1) {
        ctx.globalAlpha = base * (1 - t)
        ctx.fillStyle = '#fff'
        ctx.fillText(glyphAt(i * 31 + 7, now, 50), x, y - easeOut(t) * cell * 0.6)
      }
    }

    ctx.globalAlpha = 1
  }
}
