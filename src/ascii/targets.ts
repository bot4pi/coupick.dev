import type { AsciiField } from './field'

// a glyph field on the page that the intro should fly glyphs into, like the hero portrait
export interface CellTarget {
  canvas: HTMLCanvasElement
  field: AsciiField
  // how visible the canvas is at a point (0..1 across the canvas), for canvases with a css mask
  fade?: (u: number, v: number) => number
}

// one glyph of such a field, in viewport coordinates
export interface CellGoal {
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  glyph: number
  alpha: number
}

export const cellTargets = new Set<CellTarget>()

export const collectCellGoals = (min = 0.06): CellGoal[] => {
  const goals: CellGoal[] = []
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  for (const { canvas, field, fade } of cellTargets) {
    const rect = canvas.getBoundingClientRect()

    if (rect.width === 0 || rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) {
      continue
    }

    const { width, height } = field.cellSize

    for (const i of field.litCells(min)) {
      const center = field.cellCenter(i)
      const x = rect.left + center.x - width / 2
      const y = rect.top + center.y - height / 2

      if (x + width < 0 || x > viewportWidth || y + height < 0 || y > viewportHeight) {
        continue
      }

      const alpha = Math.min(1, field.cellAlpha(i)) * (fade?.(center.x / rect.width, center.y / rect.height) ?? 1)

      if (alpha >= min) {
        goals.push({ x, y, width, height, fontSize: field.fontSize, glyph: field.cellGlyphIndex(i), alpha })
      }
    }
  }

  return goals
}
