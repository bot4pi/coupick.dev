import { GLYPHS } from '../ascii'
import { createNoise3D } from '../ascii/noise'

// glyph effects both game boards share, drawn per cell on top of the board tiles

/** A stable pseudo-random glyph for a cell that changes every `period` ms: reads as scrambling. */
export const glyphAt = (i: number, now: number, period: number) => {
  let h = (i * 374761393 + Math.floor(now / period) * 668265263) | 0

  h = Math.imul(h ^ (h >>> 13), 1274126177)

  return GLYPHS[((h ^ (h >>> 16)) >>> 0) % GLYPHS.length]
}

/**
 * The board isn't empty, it's quiet: a few faint glyphs surface out of slow noise, like everywhere else on
 * the site. Returns the alpha of the glyph in a cell, 0 for most of them.
 */
export class Drift {
  private readonly noise = createNoise3D()

  alpha (x: number, y: number, now: number) {
    const n = this.noise(x * 0.16, y * 0.16, now / 1000 * 0.12)

    return n < 0.3 ? 0 : Math.min(0.1, (n - 0.3) * 0.25)
  }

  glyph (i: number, now: number) {
    return glyphAt(i, now + i * 97, 2400)
  }
}

const RIPPLE_SPEED = 15
const RIPPLE_WIDTH = 1.4
const RIPPLE_REACH = 11

/** Rings of glyphs running over the board, in cells: the sonar ping of the site, sized for a game board. */
export class Ripples {
  private list: { x: number, y: number, start: number }[] = []

  add (x: number, y: number, now: number) {
    this.list.push({ x, y, start: now })
  }

  clear () {
    this.list = []
  }

  // drops finished rings; false when there is nothing left to draw
  update (now: number) {
    this.list = this.list.filter(r => (now - r.start) / 1000 * RIPPLE_SPEED < RIPPLE_REACH + RIPPLE_WIDTH)

    return this.list.length > 0
  }

  light (x: number, y: number, now: number) {
    let light = 0

    for (const r of this.list) {
      const radius = (now - r.start) / 1000 * RIPPLE_SPEED
      const band = 1 - Math.abs(Math.hypot(x - r.x, y - r.y) - radius) / RIPPLE_WIDTH

      if (band > 0) {
        light = Math.max(light, band * (1 - radius / (RIPPLE_REACH + RIPPLE_WIDTH)))
      }
    }

    return light
  }
}

export const easeOut = (t: number) => 1 - (1 - t) ** 3

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/** Paints the faint empty tiles of a board once, into a canvas the renderer copies every frame. */
export const paintTiles = (
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
  left: number,
  top: number,
  cell: number,
  cols: number,
  rows: number
) => {
  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(height * dpr))

  const ctx = canvas.getContext('2d')

  if (ctx === null) {
    return
  }

  const inset = Math.max(1, cell * 0.06)

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = 'rgb(255 255 255 / 0.028)'

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.beginPath()
      ctx.roundRect(left + x * cell + inset, top + y * cell + inset, cell - inset * 2, cell - inset * 2, cell * 0.2)
      ctx.fill()
    }
  }
}
