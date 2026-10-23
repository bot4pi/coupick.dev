import type { RefObject } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

import { AsciiField, loadFieldFonts, type FieldOptions } from './field'
import { cellTargets, type CellTarget } from './targets'

export interface AsciiFieldHookOptions extends Omit<FieldOptions, 'image'> {
  // a picture to draw; the first url that loads wins
  image?: string[]
  // where the pointer "flashlight" listens: the whole window (for full screen fields) or the canvas
  pointer?: 'window' | 'canvas' | 'none'
  onReady?: (field: AsciiField) => void
  // the intro flies glyphs into this field instead of letting it simply fade in
  assembleTarget?: Pick<CellTarget, 'fade'>
  // extra drawing on top of the field; returning `false` freezes the canvas on this frame
  afterDraw?: (ctx: CanvasRenderingContext2D, now: number, dpr: number) => boolean | void
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const MAX_SIZE = 4096

const loadImage = (src: string) => new Promise<HTMLImageElement | null>(resolve => {
  const image = new Image()

  // pixels of a cross-origin picture (album covers) can only be read when it is loaded with cors
  image.crossOrigin = 'anonymous'
  image.onload = () => resolve(image)
  image.onerror = () => resolve(null)
  image.src = src
})

const loadFirstImage = async (sources: string[]) => {
  for (const src of sources) {
    const image = await loadImage(src)

    if (image !== null) {
      return image
    }
  }

  return null
}

/**
 * Runs an `AsciiField` on a canvas: sizes it to the element, pauses while it is off screen
 * and draws a single still frame for visitors who prefer reduced motion.
 */
export const useAsciiField = (ref: RefObject<HTMLCanvasElement>, options: AsciiFieldHookOptions) => {
  const fieldRef = useRef<AsciiField | null>(null)
  const latest = useRef(options)

  latest.current = options

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d') ?? null

    if (canvas === null || ctx === null) {
      return
    }

    const still = prefersReducedMotion()
    const pointerMode = latest.current.pointer ?? 'none'

    let field: AsciiField | null = null
    let target: CellTarget | null = null
    let raf = 0
    let last = 0
    let visible = true
    let frozen = false
    let disposed = false

    const frame = (now: number) => {
      raf = 0

      if (field === null) {
        return
      }

      const dt = last === 0 ? 0 : Math.min((now - last) / 1000, 0.05)

      last = now
      field.update(now, dt)
      field.draw()

      if (latest.current.afterDraw?.(ctx, now, field.dpr) === false) {
        frozen = true

        return
      }

      schedule()
    }

    const schedule = () => {
      if (raf === 0 && field !== null && visible && !still && !frozen && !disposed) {
        raf = requestAnimationFrame(frame)
      }
    }

    const drawStill = () => {
      if (field !== null) {
        field.update(performance.now(), 0)
        field.draw()
      }
    }

    const resize = () => {
      if (field === null || frozen) {
        return
      }

      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      // a guard against layouts that size the canvas by its own pixels
      const width = Math.min(rect.width, MAX_SIZE)
      const height = Math.min(rect.height, MAX_SIZE)

      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      field.resize(width, height, dpr)

      // resizing wipes the canvas, so a paused field needs its frame back
      if (still || !visible) {
        drawStill()
      }
    }

    const sources = latest.current.image

    Promise.all([loadFieldFonts(), sources === undefined ? null : loadFirstImage(sources)]).then(([, image]) => {
      if (disposed) {
        return
      }

      field = new AsciiField(ctx, { ...latest.current, image: image ?? undefined })
      fieldRef.current = field
      resize()

      if (latest.current.assembleTarget !== undefined) {
        target = { canvas, field, fade: latest.current.assembleTarget.fade }
        cellTargets.add(target)
      }
      latest.current.onReady?.(field)

      if (still) {
        drawStill()
      } else {
        schedule()
      }
    })

    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting

      if (visible) {
        last = 0
        schedule()
      }
    })

    resizeObserver.observe(canvas)
    intersectionObserver.observe(canvas)

    const onPointerMove = (event: PointerEvent) => {
      if (field === null || event.pointerType === 'touch') {
        return
      }

      const rect = pointerMode === 'window' ? null : canvas.getBoundingClientRect()

      field.pointer.x = event.clientX - (rect?.left ?? 0)
      field.pointer.y = event.clientY - (rect?.top ?? 0)
    }

    const onPointerLeave = () => {
      if (field !== null) {
        field.pointer.x = -1e5
        field.pointer.y = -1e5
      }
    }

    const pointerTarget = pointerMode === 'window' ? document.documentElement : pointerMode === 'canvas' ? canvas : null

    pointerTarget?.addEventListener('pointermove', onPointerMove)
    pointerTarget?.addEventListener('pointerleave', onPointerLeave)

    return () => {
      disposed = true

      if (target !== null) {
        cellTargets.delete(target)
      }

      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      pointerTarget?.removeEventListener('pointermove', onPointerMove)
      pointerTarget?.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  return fieldRef
}
