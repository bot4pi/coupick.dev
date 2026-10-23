import { createNoise3D } from './noise'

export const GLYPHS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

// heavier glyphs read better inside a word, so the word mask draws from these
const DENSE = Uint8Array.from('ABDEGHKMNOPQRSUWXZ02345689', ch => GLYPHS.indexOf(ch))

export const MONO_FAMILY = '"Geist Mono Variable", ui-monospace, monospace'
export const SANS_FAMILY = '"Geist Variable", ui-sans-serif, system-ui, sans-serif'

// how fast the collapse wave started by `collapse()` travels, px per second
export const WAVE_SPEED = 2600
// how far behind the wave front glyphs keep fading out
const WAVE_TAIL = 180
// width of the bright rim on the wave front
const WAVE_RING = 22

const OFF_SCREEN = -1e5

// how quickly the light catches up with the pointer, per second: ~0.2s to cover most of the way
const POINTER_FOLLOW = 5
// how quickly it fades in and out when the pointer enters or leaves
const POINTER_FADE = 4
// how quickly lit glyphs left behind the light go dark again
const TRAIL_DECAY = 3.5

// distance between the baselines of a multi-line word, as a share of the font size
const LINE_ADVANCE = 0.8

export interface FieldOptions {
  cellWidth: number
  cellHeight: number
  fontSize: number
  // the brightest a noise glyph gets (white at this alpha)
  intensity?: number
  // noise level where glyphs start to show up: the higher, the emptier the field
  threshold?: number
  // size of the noise blobs, 1 = tuned for a full screen
  scale?: number
  word?: string
  wordIntensity?: number
  // the word is fitted into this fraction of the field
  wordWidth?: number
  wordHeight?: number
  // vertical center of the word as a fraction of the height
  wordY?: number
  // a picture to draw instead of a word: brighter pixels become brighter glyphs
  image?: HTMLImageElement
  // > 1 pushes the picture's midtones down, so only its highlights stay bright
  imageGamma?: number
  // paint the glyphs in the picture's own colors instead of plain white
  tint?: boolean
  // the real picture drawn faintly under the glyphs (0..1), so a busy picture still reads
  underlay?: number
  pointerRadius?: number
}

type ResolvedOptions = Required<Omit<FieldOptions, 'word' | 'image'>> & {
  word: string | null
  image: HTMLImageElement | null
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

const smoothstep = (from: number, to: number, x: number) => {
  const t = clamp01((x - from) / (to - from))

  return t * t * (3 - 2 * t)
}

export const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

let fontsReady: Promise<void> | null = null

// the atlas and the word mask are rasterized once, so the fonts have to be there first
export const loadFieldFonts = () => {
  fontsReady ??= Promise.race([
    Promise.all([
      document.fonts.load(`16px ${MONO_FAMILY}`),
      document.fonts.load(`800 16px ${SANS_FAMILY}`)
    ]).then(() => undefined),
    new Promise<void>(resolve => setTimeout(resolve, 2500))
  ]).catch(() => undefined)

  return fontsReady
}

/**
 * A grid of glyphs whose brightness follows drifting simplex noise, optionally with a word
 * burned into it. Rendering goes through a pre-rasterized glyph atlas, so a full screen of
 * cells is a few thousand `drawImage` calls per frame.
 */
export class AsciiField {
  cols = 0
  rows = 0
  width = 0
  height = 0
  dpr = 1

  // where the pointer is; the light itself trails behind it
  readonly pointer = { x: OFF_SCREEN, y: OFF_SCREEN }
  private readonly lamp = { x: OFF_SCREEN, y: OFF_SCREEN, strength: 0 }

  // true once a collapse wave has swept every glyph away
  dark = false

  private glyphs = new Uint8Array(0)
  private alpha = new Float32Array(0)
  private seed = new Float32Array(0)
  // light each glyph got from the pointer, fading over time: the trail behind the light
  private trail = new Float32Array(0)
  private mask: Float32Array | null = null
  // the word mask spread out a few cells: noise is kept away from the letters so they read
  private halo: Float32Array | null = null

  // where the picture sits in the field (css px), once it is fitted
  private imageRect: { x: number, y: number, width: number, height: number } | null = null

  private readonly atlas = document.createElement('canvas')
  private glyphWidth = 0
  private glyphHeight = 0

  private readonly noise = createNoise3D()
  private wave: { x: number, y: number, start: number } | null = null
  private readonly options: ResolvedOptions

  constructor (private readonly ctx: CanvasRenderingContext2D, options: FieldOptions) {
    this.options = {
      intensity: 0.5,
      threshold: 0.12,
      scale: 1,
      wordIntensity: 0.8,
      wordWidth: 0.8,
      wordHeight: 0.5,
      wordY: 0.5,
      imageGamma: 1.4,
      tint: false,
      underlay: 0,
      pointerRadius: 150,
      ...options,
      word: options.word ?? null,
      image: options.image ?? null
    }
  }

  resize (width: number, height: number, dpr: number) {
    const { cellWidth, cellHeight } = this.options
    const cols = Math.max(1, Math.ceil(width / cellWidth))
    const rows = Math.max(1, Math.ceil(height / cellHeight))

    this.width = width
    this.height = height
    this.dpr = dpr

    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols
      this.rows = rows

      const count = cols * rows

      this.glyphs = new Uint8Array(count)
      this.alpha = new Float32Array(count)
      this.seed = new Float32Array(count)
      this.trail = new Float32Array(count)

      for (let i = 0; i < count; i++) {
        this.seed[i] = Math.random()
      }
    }

    this.buildAtlas()
    this.buildMask()

    for (let i = 0; i < this.glyphs.length; i++) {
      this.glyphs[i] = this.pick(i)
    }
  }

  // eases the light towards the pointer, so it follows with a soft delay instead of sticking to it
  private followPointer (dt: number) {
    const { pointer, lamp } = this
    const active = pointer.x > OFF_SCREEN / 2

    // a light that was off reappears right where the pointer came in, not flying in from afar
    if (active && lamp.strength < 0.01) {
      lamp.x = pointer.x
      lamp.y = pointer.y
    }

    if (active) {
      const follow = 1 - Math.exp(-dt * POINTER_FOLLOW)

      lamp.x += (pointer.x - lamp.x) * follow
      lamp.y += (pointer.y - lamp.y) * follow
    }

    lamp.strength += ((active ? 1 : 0) - lamp.strength) * (1 - Math.exp(-dt * POINTER_FADE))
  }

  // sends a wave from (x, y) that knocks every glyph out of the field
  collapse (x: number, y: number, now: number) {
    this.wave = { x, y, start: now }
  }

  update (now: number, dt: number) {
    this.followPointer(dt)

    const { cols, rows, alpha, seed, trail, glyphs, mask, halo, noise, wave, lamp } = this
    const { cellWidth, cellHeight, intensity, threshold, scale, wordIntensity, imageGamma, pointerRadius } = this.options
    const picture = this.options.image !== null

    const t = now / 1000
    const s1 = 0.0012 / scale
    const s2 = 0.0026 / scale
    const s3 = 0.0075 / scale

    const px = lamp.x
    const py = lamp.y
    const pr2 = lamp.strength > 0.005 ? pointerRadius * pointerRadius : 0
    const decay = Math.exp(-dt * TRAIL_DECAY)

    // a soft diagonal glint that sweeps across the word every few seconds
    const span = this.width + this.height * 0.6
    const glint = ((t * 0.18) % 1.7 - 0.35) * span

    const front = wave === null ? 0 : ((now - wave.start) / 1000) * WAVE_SPEED
    let lit = false

    for (let r = 0; r < rows; r++) {
      const y = (r + 0.5) * cellHeight

      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        const x = (c + 0.5) * cellWidth

        const warp = noise(x * s1, y * s1, t * 0.03)
        const n = noise(x * s2 + warp, y * s2 - warp * 0.6, t * 0.06) * 0.72 +
          noise(x * s3, y * s3, t * 0.12 + 9.1) * 0.28

        // every glyph twinkles at its own pace
        const sd = seed[i]
        const level = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(sd * 60 + t * (0.5 + sd * 1.5)))

        let a = smoothstep(threshold, threshold + 0.5, n) * level * intensity

        if (mask !== null) {
          if (halo !== null) {
            a *= 1 - halo[i] * 0.9
          }

          const m = mask[i]

          if (m > 0) {
            const g = (x + y * 0.6 - glint) / 90
            const shape = picture ? m ** imageGamma : smoothstep(0.08, 0.6, m)
            const w = shape * (wordIntensity * (0.7 + 0.3 * level) * (0.88 + 0.12 * n) + 0.3 * Math.exp(-g * g))

            if (w > a) {
              a = w
            }
          }
        }

        const dx = x - px
        const dy = y - py
        const d2 = dx * dx + dy * dy
        let glow = trail[i] * decay

        if (d2 < pr2) {
          let f = 1 - Math.sqrt(d2) / pointerRadius
          f *= f * lamp.strength

          const light = f * (0.25 + 0.55 * level)

          if (light > glow) {
            glow = light
          }

          if (Math.random() < f * dt * 10) {
            glyphs[i] = this.pick(i)
          }
        }

        trail[i] = glow

        if (glow > a) {
          a = glow
        }

        if (wave !== null) {
          const wx = x - wave.x
          const wy = y - wave.y
          const d = Math.sqrt(wx * wx + wy * wy)
          const ring = (d - front) / WAVE_RING

          // the field behind the front goes dark, the front itself flares up
          a *= smoothstep(front - WAVE_TAIL, front, d)

          if (ring > -2.5 && ring < 2.5) {
            const flare = Math.exp(-ring * ring) * (0.2 + 0.4 * level)

            if (flare > a) {
              a = flare
            }

            if (Math.random() < dt * 24) {
              glyphs[i] = this.pick(i)
            }
          }
        }

        alpha[i] = a

        if (a > 0.01) {
          lit = true
        }
      }
    }

    if (wave !== null && !lit) {
      this.dark = true
    }

    // background churn: a slice of the field changes glyphs every frame
    const swaps = Math.floor(glyphs.length * 0.45 * dt + Math.random())

    for (let k = 0; k < swaps; k++) {
      const i = Math.floor(Math.random() * glyphs.length)

      glyphs[i] = this.pick(i)
    }
  }

  draw () {
    const { ctx, cols, alpha, glyphs, atlas, glyphWidth: gw, glyphHeight: gh, dpr } = this
    const stepX = this.options.cellWidth * dpr
    const stepY = this.options.cellHeight * dpr

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    if (this.dark) {
      return
    }

    const { image, tint, underlay } = this.options
    const rect = this.imageRect
    const placeImage = () => {
      if (image !== null && rect !== null) {
        ctx.drawImage(image, rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr)
      }
    }

    if (underlay > 0) {
      ctx.globalAlpha = underlay
      placeImage()
    }

    for (let i = 0; i < alpha.length; i++) {
      const a = alpha[i]

      if (a < 0.015) {
        continue
      }

      const c = i % cols
      const r = (i - c) / cols

      ctx.globalAlpha = a > 1 ? 1 : a
      ctx.drawImage(atlas, glyphs[i] * gw, 0, gw, gh, Math.round(c * stepX), Math.round(r * stepY), gw, gh)
    }

    ctx.globalAlpha = 1

    // keep the alpha of what is drawn, take the color from the picture
    if (tint) {
      ctx.globalCompositeOperation = 'source-atop'
      placeImage()
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  // indices of glyphs bright enough to be seen right now
  litCells (min: number) {
    const cells: number[] = []

    for (let i = 0; i < this.alpha.length; i++) {
      if (this.alpha[i] >= min) {
        cells.push(i)
      }
    }

    return cells
  }

  cellCenter (i: number) {
    const c = i % this.cols
    const r = (i - c) / this.cols

    return { x: (c + 0.5) * this.options.cellWidth, y: (r + 0.5) * this.options.cellHeight }
  }

  cellGlyph (i: number) {
    return GLYPHS[this.glyphs[i]]
  }

  cellAlpha (i: number) {
    return this.alpha[i]
  }

  get fontSize () {
    return this.options.fontSize
  }

  private pick (i: number) {
    if (this.mask !== null && this.mask[i] > 0.35) {
      return DENSE[Math.floor(Math.random() * DENSE.length)]
    }

    return Math.floor(Math.random() * GLYPHS.length)
  }

  private buildAtlas () {
    const { cellWidth, cellHeight, fontSize } = this.options
    const gw = Math.ceil(cellWidth * this.dpr)
    const gh = Math.ceil(cellHeight * this.dpr)

    this.glyphWidth = gw
    this.glyphHeight = gh
    this.atlas.width = gw * GLYPHS.length
    this.atlas.height = gh

    const ctx = this.atlas.getContext('2d')

    if (ctx === null) {
      return
    }

    ctx.clearRect(0, 0, this.atlas.width, this.atlas.height)
    ctx.fillStyle = '#fff'
    ctx.font = `${fontSize * this.dpr}px ${MONO_FAMILY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < GLYPHS.length; i++) {
      ctx.fillText(GLYPHS[i], i * gw + gw / 2, gh / 2)
    }
  }

  // rasterizes the word (or the picture) at a few samples per cell and keeps a 0..1 value per cell
  private buildMask () {
    const { word, image, cellWidth, cellHeight, wordWidth, wordHeight, wordY } = this.options

    this.mask = null
    this.halo = null

    if (image !== null) {
      this.buildImageMask(image)

      return
    }

    if (word === null) {
      return
    }

    const sx = 3
    const sy = 6
    const canvas = document.createElement('canvas')

    canvas.width = this.cols * sx
    canvas.height = this.rows * sy

    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    if (ctx === null) {
      this.mask = null

      return
    }

    // measured at 100px, then scaled to fit; `\n` stacks lines `LINE_ADVANCE` of the size apart
    const lines = word.split('\n')

    ctx.scale(sx / cellWidth, sy / cellHeight)
    ctx.font = `800 100px ${SANS_FAMILY}`
    ctx.letterSpacing = '-4px'

    const probes = lines.map(line => ctx.measureText(line))
    const probeWidth = Math.max(...probes.map(probe => probe.width))
    const probeTop = probes[0].actualBoundingBoxAscent
    const probeHeight = probeTop + probes[probes.length - 1].actualBoundingBoxDescent + LINE_ADVANCE * 100 * (lines.length - 1)
    const scale = Math.min((this.width * wordWidth) / probeWidth, (this.height * wordHeight) / probeHeight)
    const size = 100 * scale

    ctx.font = `800 ${size}px ${SANS_FAMILY}`
    ctx.letterSpacing = `${-size * 0.04}px`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#fff'

    const top = this.height * wordY - (probeHeight * scale) / 2 + probeTop * scale

    lines.forEach((line, i) => ctx.fillText(line, this.width / 2, top + i * LINE_ADVANCE * size))

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const mask = new Float32Array(this.cols * this.rows)
    const samples = sx * sy * 255

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        let sum = 0

        for (let y = 0; y < sy; y++) {
          const row = (r * sy + y) * canvas.width

          for (let x = 0; x < sx; x++) {
            sum += data[(row + c * sx + x) * 4 + 3]
          }
        }

        mask[r * this.cols + c] = sum / samples
      }
    }

    this.mask = mask
    this.halo = blur(mask, this.cols, this.rows, 4, 2)
  }

  // the picture covers the field like `object-fit: cover`; every cell keeps its luminance
  private buildImageMask (image: HTMLImageElement) {
    const sx = 2
    const sy = 4
    const canvas = document.createElement('canvas')

    canvas.width = this.cols * sx
    canvas.height = this.rows * sy

    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    if (ctx === null || image.naturalWidth === 0) {
      return
    }

    const fieldWidth = this.cols * this.options.cellWidth
    const fieldHeight = this.rows * this.options.cellHeight
    const cover = Math.max(fieldWidth / image.naturalWidth, fieldHeight / image.naturalHeight)
    const width = image.naturalWidth * cover
    const height = image.naturalHeight * cover

    this.imageRect = { x: (fieldWidth - width) / 2, y: (fieldHeight - height) / 2, width, height }

    ctx.scale(sx / this.options.cellWidth, sy / this.options.cellHeight)
    ctx.drawImage(image, this.imageRect.x, this.imageRect.y, width, height)

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const mask = new Float32Array(this.cols * this.rows)
    const samples = sx * sy * 255

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        let sum = 0

        for (let y = 0; y < sy; y++) {
          const row = (r * sy + y) * canvas.width

          for (let x = 0; x < sx; x++) {
            const p = (row + c * sx + x) * 4

            sum += data[p] * 0.2126 + data[p + 1] * 0.7152 + data[p + 2] * 0.0722
          }
        }

        mask[r * this.cols + c] = sum / samples
      }
    }

    // stretch the levels so the darkest cell is black and the brightest is white
    let min = 1
    let max = 0

    for (const v of mask) {
      min = Math.min(min, v)
      max = Math.max(max, v)
    }

    const range = max - min || 1

    for (let i = 0; i < mask.length; i++) {
      mask[i] = (mask[i] - min) / range
    }

    this.mask = mask
  }
}

// separable box blur, normalized so the strongest cell becomes 1
const blur = (source: Float32Array, cols: number, rows: number, rx: number, ry: number) => {
  const tmp = new Float32Array(source.length)
  const out = new Float32Array(source.length)
  let max = 0

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0

      for (let k = Math.max(0, c - rx); k <= Math.min(cols - 1, c + rx); k++) {
        sum += source[r * cols + k]
      }

      tmp[r * cols + c] = sum
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0

      for (let k = Math.max(0, r - ry); k <= Math.min(rows - 1, r + ry); k++) {
        sum += tmp[k * cols + c]
      }

      out[r * cols + c] = sum
      max = Math.max(max, sum)
    }
  }

  if (max > 0) {
    for (let i = 0; i < out.length; i++) {
      out[i] = Math.min(1, (out[i] / max) * 2.5)
    }
  }

  return out
}
