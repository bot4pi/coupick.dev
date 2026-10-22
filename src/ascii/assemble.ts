import { MONO_FAMILY, WAVE_SPEED, randomGlyph, type AsciiField } from './field'

// one visible character of the page, in viewport coordinates
export interface GlyphTarget {
  ch: string
  x: number
  // alphabetic baseline
  y: number
  font: string
  color: string
  opacity: number
}

interface ResolvedStyle {
  opacity: number
  clip: DOMRect | null
  font: string
  color: string
  transform: string
}

const isOutside = (rect: DOMRect, width: number, height: number) =>
  rect.width === 0 || rect.bottom < 0 || rect.top > height || rect.right < 0 || rect.left > width

const isClipped = (rect: DOMRect, clip: DOMRect | null) =>
  clip !== null && (rect.left < clip.left - 1 || rect.right > clip.right + 1 || rect.top < clip.top - 1 || rect.bottom > clip.bottom + 1)

const intersect = (a: DOMRect | null, b: DOMRect) => {
  if (a === null) {
    return b
  }

  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)

  return new DOMRect(left, top, Math.max(0, Math.min(a.right, b.right) - left), Math.max(0, Math.min(a.bottom, b.bottom) - top))
}

const applyTransform = (ch: string, transform: string) => {
  if (transform === 'uppercase') {
    return ch.toUpperCase()
  }

  if (transform === 'lowercase') {
    return ch.toLowerCase()
  }

  return ch
}

/**
 * Collects every character of `root` that is currently inside the viewport, with the font,
 * color and baseline it is painted with. The root's own opacity is ignored on purpose:
 * the page is measured while it is still hidden behind the intro.
 */
export const collectTargets = (root: HTMLElement, limit = 2500): GlyphTarget[] => {
  const width = window.innerWidth
  const height = window.innerHeight
  const targets: GlyphTarget[] = []

  const range = document.createRange()
  const styles = new Map<Element, ResolvedStyle | null>()
  const ascents = new Map<string, number>()
  const measure = document.createElement('canvas').getContext('2d')

  const resolve = (el: Element): ResolvedStyle | null => {
    const cached = styles.get(el)

    if (cached !== undefined) {
      return cached
    }

    let resolved: ResolvedStyle | null = null
    const parent = el.parentElement === null || el === root ? null : el.parentElement === root ? undefined : resolve(el.parentElement)

    if (parent !== null && !(el instanceof HTMLElement && el.dataset.assemble === 'off')) {
      const cs = getComputedStyle(el)
      const opacity = (parent?.opacity ?? 1) * parseFloat(cs.opacity)

      if (cs.visibility !== 'hidden' && cs.display !== 'none' && opacity > 0.02) {
        const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible'

        resolved = {
          opacity,
          clip: clips ? intersect(parent?.clip ?? null, el.getBoundingClientRect()) : parent?.clip ?? null,
          font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
          color: cs.color,
          transform: cs.textTransform
        }
      }
    }

    styles.set(el, resolved)

    return resolved
  }

  const ascentOf = (font: string) => {
    let ascent = ascents.get(font)

    if (ascent === undefined) {
      if (measure !== null) {
        measure.font = font
      }

      // the range rects span the font's ascent + descent, so the baseline sits one ascent below the top
      ascent = measure?.measureText('Hg').fontBoundingBoxAscent ?? 0
      ascents.set(font, ascent)
    }

    return ascent
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.nodeValue
    const parent = node.parentElement

    if (text === null || parent === null || !/\S/.test(text)) {
      continue
    }

    const style = resolve(parent)

    if (style === null) {
      continue
    }

    range.selectNodeContents(node)

    if (isOutside(range.getBoundingClientRect(), width, height)) {
      continue
    }

    const ascent = ascentOf(style.font)
    let offset = 0

    for (const ch of text) {
      const length = ch.length

      if (ch.trim() !== '') {
        range.setStart(node, offset)
        range.setEnd(node, offset + length)

        const rect = range.getBoundingClientRect()

        if (!isOutside(rect, width, height) && !isClipped(rect, style.clip)) {
          targets.push({
            ch: applyTransform(ch, style.transform),
            x: rect.left,
            y: rect.top + ascent,
            font: style.font,
            color: style.color,
            opacity: style.opacity
          })

          if (targets.length >= limit) {
            return targets
          }
        }
      }

      offset += length
    }
  }

  return targets
}

interface Particle {
  target: GlyphTarget
  x0: number
  y0: number
  cx: number
  cy: number
  delay: number
  duration: number
  from: number
  glyph: string
  nextGlyph: number
}

// past this share of its flight a particle shows its real character in the real font
const SETTLE = 0.76
// how many random lit cells compete to be a particle's launch point
const CANDIDATES = 10

const easeOutQuart = (t: number) => 1 - (1 - t) ** 4

/**
 * Flies glyphs out of a collapsing `AsciiField` into the characters of the page. Every
 * particle leaves its cell when the collapse wave reaches it and lands exactly where the
 * page will paint the same character, so the page can be swapped in underneath.
 */
export class Assembly {
  readonly end: number

  private readonly particles: Particle[] = []
  private readonly fieldFont: number
  private readonly fonts = new Map<number, string>()

  constructor (targets: GlyphTarget[], field: AsciiField, origin: { x: number, y: number }, private readonly start: number) {
    const lit = field.litCells(0.16)
    const fieldFont = field.fontSize
    let end = 0

    this.fieldFont = fieldFont

    for (const target of targets) {
      let best = -1
      let bestDistance = Infinity

      for (let k = 0; k < CANDIDATES && lit.length > 0; k++) {
        const cell = lit[Math.floor(Math.random() * lit.length)]
        const p = field.cellCenter(cell)
        const d = (p.x - target.x) ** 2 + (p.y - target.y) ** 2

        if (d < bestDistance) {
          best = cell
          bestDistance = d
        }
      }

      const source = best >= 0 ? field.cellCenter(best) : { x: Math.random() * field.width, y: Math.random() * field.height }
      // from the middle of a cell to the baseline-left corner of its glyph
      const x0 = source.x - fieldFont * 0.3
      const y0 = source.y + fieldFont * 0.36

      const dx = target.x - x0
      const dy = target.y - y0
      const distance = Math.sqrt(dx * dx + dy * dy)
      const bend = (Math.random() - 0.5) * 0.5

      const delay = (Math.hypot(source.x - origin.x, source.y - origin.y) / WAVE_SPEED) * 1000 + Math.random() * 90
      const duration = 520 + Math.min(distance, 900) * 0.42 + Math.random() * 180

      this.particles.push({
        target,
        x0,
        y0,
        // a control point off to the side, so glyphs arc instead of sliding in straight lines
        cx: x0 + dx * 0.5 - dy * bend,
        cy: y0 + dy * 0.5 + dx * bend,
        delay,
        duration,
        from: best >= 0 ? Math.max(field.cellAlpha(best), 0.3) : 0,
        glyph: best >= 0 ? field.cellGlyph(best) : randomGlyph(),
        nextGlyph: 0
      })

      end = Math.max(end, delay + duration)
    }

    this.end = start + end + 60
  }

  done (now: number) {
    return now >= this.end
  }

  draw (ctx: CanvasRenderingContext2D, now: number, dpr: number) {
    const frame: { font: string, color: string, alpha: number, ch: string, x: number, y: number }[] = []

    for (const p of this.particles) {
      const progress = (now - this.start - p.delay) / p.duration

      // not launched yet: the field still draws this glyph in its cell
      if (progress < 0) {
        continue
      }

      const k = progress > 1 ? 1 : progress
      const e = easeOutQuart(k)
      const inv = 1 - e

      const x = inv * inv * p.x0 + 2 * inv * e * p.cx + e * e * p.target.x
      const y = inv * inv * p.y0 + 2 * inv * e * p.cy + e * e * p.target.y

      if (k >= SETTLE) {
        frame.push({ font: p.target.font, color: p.target.color, alpha: p.target.opacity, ch: p.target.ch, x, y })

        continue
      }

      if (now >= p.nextGlyph) {
        p.glyph = randomGlyph()
        p.nextGlyph = now + 40 + Math.random() * 60
      }

      const size = this.fieldFont + (this.targetSize(p.target.font) - this.fieldFont) * e

      frame.push({
        font: this.monoFont(size),
        color: '#fff',
        alpha: p.from + (0.95 - p.from) * Math.min(1, k * 4),
        ch: p.glyph,
        x,
        y
      })
    }

    // switching fonts is the slow part of canvas text, so draw everything grouped by font
    frame.sort((a, b) => (a.font < b.font ? -1 : a.font > b.font ? 1 : 0))

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    let font = ''

    for (const item of frame) {
      if (item.font !== font) {
        font = item.font
        ctx.font = font
      }

      ctx.globalAlpha = item.alpha
      ctx.fillStyle = item.color
      ctx.fillText(item.ch, item.x, item.y)
    }

    ctx.globalAlpha = 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  private readonly sizes = new Map<string, number>()

  private targetSize (font: string) {
    let size = this.sizes.get(font)

    if (size === undefined) {
      size = parseFloat(/([\d.]+)px/.exec(font)?.[1] ?? '') || this.fieldFont
      this.sizes.set(font, size)
    }

    return size
  }

  private monoFont (size: number) {
    const key = Math.round(size * 2) / 2
    let font = this.fonts.get(key)

    if (font === undefined) {
      font = `${key}px ${MONO_FAMILY}`
      this.fonts.set(key, font)
    }

    return font
  }
}
