import { render } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

import { MONO_FAMILY } from '../../ascii'
import { useIntroPhase } from '../../intro'
import { prefersReducedMotion } from '../../shared/motion'

import './style.css'

const GLYPHS = ['*', '*', '·', '+', '.', '×']

interface Flake {
  x: number
  y: number
  // 0 = far away (small, slow, dim), 1 = close (big, fast, bright)
  depth: number
  glyph: string
  sway: number
  phase: number
}

// december on the visitor's own calendar, or `?snow` to see it any time
const isSnowSeason = () =>
  new Date().getMonth() === 11 || new URLSearchParams(window.location.search).has('snow')

const createFlake = (width: number, height: number, anywhere: boolean): Flake => ({
  x: Math.random() * width,
  y: anywhere ? Math.random() * height : -20 - Math.random() * 40,
  depth: Math.random(),
  glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
  sway: 6 + Math.random() * 18,
  phase: Math.random() * Math.PI * 2
})

const SnowCanvas = () => {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d') ?? null

    if (canvas === null || ctx === null) {
      return
    }

    let width = 0
    let height = 0
    let dpr = 1
    let flakes: Flake[] = []
    let raf = 0
    let last = 0

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)

      // roughly one flake per 13k px², fewer on phones, never a blizzard
      const count = Math.min(150, Math.round((width * height) / 13_000))

      flakes = flakes.slice(0, count)

      while (flakes.length < count) {
        flakes.push(createFlake(width, height, true))
      }
    }

    const frame = (now: number) => {
      const dt = last === 0 ? 0 : Math.min((now - last) / 1000, 0.05)
      const t = now / 1000
      // a slow breeze that changes direction every so often
      const wind = Math.sin(t * 0.13) * 14

      last = now

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      for (const flake of flakes) {
        const speed = 18 + flake.depth * 46

        flake.y += speed * dt
        flake.x += (wind * (0.4 + flake.depth)) * dt

        if (flake.y > height + 20) {
          Object.assign(flake, createFlake(width, height, false))
        }

        if (flake.x < -20) {
          flake.x += width + 40
        } else if (flake.x > width + 20) {
          flake.x -= width + 40
        }

        const size = 8 + flake.depth * 9

        ctx.font = `${size.toFixed(1)}px ${MONO_FAMILY}`
        ctx.globalAlpha = 0.18 + flake.depth * 0.45
        ctx.fillText(flake.glyph, flake.x + Math.sin(t * 0.9 + flake.phase) * flake.sway, flake.y)
      }

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    resize()
    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} class='snow' aria-hidden='true' />
}

// rendered straight into <body>: fixed elements inside #app can end up positioned against #app
const SnowLayer = () => {
  useEffect(() => {
    const host = document.createElement('div')

    document.body.append(host)
    render(<SnowCanvas />, host)

    return () => {
      render(null, host)
      host.remove()
    }
  }, [])

  return null
}

// falls over the whole page in december, once the intro is over
export const Snow = () => {
  const phase = useIntroPhase()

  if (phase !== 'done' || !isSnowSeason() || prefersReducedMotion()) {
    return null
  }

  return <SnowLayer />
}
