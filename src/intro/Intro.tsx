import { useEffect, useMemo, useRef, useState } from 'preact/hooks'

import { Assembly, collectTargets, useAsciiField, type FieldOptions } from '../ascii'

import { setIntroPhase } from './state'

import './style.css'

type Stage = 'loading' | 'ready' | 'assembling' | 'out'

const fieldOptions = (): Omit<FieldOptions, 'image'> => {
  const small = window.innerWidth < 640
  // the word needs about ten rows of glyphs to read, so narrower screens give it more width
  const wide = window.innerWidth >= 1100

  return {
    cellWidth: small ? 9 : 10,
    cellHeight: small ? 18 : 20,
    fontSize: small ? 12 : 13,
    intensity: 0.46,
    threshold: 0.15,
    // phones are tall and narrow: two short lines read better than one long one
    word: small ? 'co\nup' : 'coup',
    wordWidth: wide ? 0.64 : small ? 0.72 : 0.86,
    wordHeight: 0.5,
    wordY: 0.46,
    wordIntensity: 0.92
  }
}

const TRIGGER_KEYS = new Set(['Enter', ' ', 'Escape', 'ArrowDown', 'PageDown'])

interface IntroProps {
  // the page; its text is what the glyphs assemble into
  root: HTMLElement
  onClose: () => void
}

export const Intro = ({ root, onClose }: IntroProps) => {
  const canvas = useRef<HTMLCanvasElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const assembly = useRef<Assembly | null>(null)

  const [stage, setStage] = useState<Stage>('loading')
  const stageRef = useRef(stage)

  stageRef.current = stage

  const options = useMemo(fieldOptions, [])
  const touch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])

  const field = useAsciiField(canvas, {
    ...options,
    pointer: 'window',
    onReady: () => {
      // the page has to be measured with its real fonts, not the fallbacks
      document.fonts.ready.then(() => setStage(current => (current === 'loading' ? 'ready' : current)))
    },
    afterDraw: (ctx, now, dpr) => {
      const current = assembly.current

      if (current === null) {
        return
      }

      current.draw(ctx, now, dpr)

      if (current.done(now)) {
        setIntroPhase('done')
        setStage('out')
        setTimeout(onClose, 420)

        // keep the last frame: the page is now painted exactly underneath it
        return false
      }
    }
  })

  const trigger = (x: number, y: number) => {
    const current = field.current

    if (current === null || stageRef.current !== 'ready') {
      return
    }

    const now = performance.now()
    const targets = collectTargets(root)

    current.pointer.x = -1e5
    current.pointer.y = -1e5
    current.collapse(x, y, now)
    assembly.current = new Assembly(targets, current, { x, y }, now)

    root.inert = false
    stageRef.current = 'assembling'
    setIntroPhase('assembling')
    setStage('assembling')
  }

  useEffect(() => {
    overlay.current?.focus({ preventScroll: true })

    const fromCenter = () => trigger(window.innerWidth / 2, window.innerHeight / 2)

    const onKeyDown = (event: KeyboardEvent) => {
      if (TRIGGER_KEYS.has(event.key)) {
        event.preventDefault()
        fromCenter()
      }
    }

    // trying to scroll is as good as a click
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY > 0) {
        fromCenter()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, { passive: true })

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel)
    }
  }, [])

  return (
    <div
      ref={overlay}
      class={`intro intro-${stage}`}
      role='button'
      tabIndex={0}
      aria-label='enter coupick.dev'
      onPointerDown={event => trigger(event.clientX, event.clientY)}
      onTouchMove={event => {
        const touchPoint = event.touches[0]

        if (touchPoint !== undefined) {
          trigger(touchPoint.clientX, touchPoint.clientY)
        }
      }}
    >
      <canvas ref={canvas} class='intro-canvas' aria-hidden='true' />

      <span class='intro-label intro-label-top' aria-hidden='true'>coupick.dev</span>

      <span class='intro-label intro-label-hint' aria-hidden='true'>
        {touch ? 'tap anywhere' : 'click anywhere'}
        <span class='intro-caret' />
      </span>
    </div>
  )
}
