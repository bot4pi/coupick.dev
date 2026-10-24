import { render } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

import { MONO_FAMILY } from '../../ascii'
import { useIntroPhase } from '../../intro'
import { prefersReducedMotion } from '../../shared/motion'

import './style.css'

const GLYPHS = ['*', '*', '·', '+', '.', '×']

// flakes are drawn back to front in a few depth layers, so the font changes only a handful of times a frame
const LAYERS = 6

interface Flake {
  x: number
  y: number
  // 0 = far away (small, slow, dim), 1 = close (big, fast, bright)
  depth: number
  layer: number
  glyph: string
  sway: number
  phase: number
}

// december on the visitor's own calendar, or `?snow` to see it any time
const isSnowSeason = () =>
  new Date().getMonth() === 11 || new URLSearchParams(window.location.search).has('snow')

// a flake that fell out of view starts over above the screen, at the same depth
const respawn = (flake: Flake, width: number, height: number, anywhere: boolean) => {
  flake.x = Math.random() * width
  flake.y = anywhere ? Math.random() * height : -20 - Math.random() * 60
  flake.glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
  flake.sway = 6 + Math.random() * 18
  flake.phase = Math.random() * Math.PI * 2
}

const createFlake = (width: number, height: number): Flake => {
  const depth = Math.random()
  const layer = Math.min(LAYERS - 1, Math.floor(depth * LAYERS))
  const flake: Flake = { x: 0, y: 0, depth, layer, glyph: '*', sway: 0, phase: 0 }

  respawn(flake, width, height, true)

  return flake
}

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

      // roughly one flake per 4.5k px²: a proper snowfall, still light enough for a phone
      const count = Math.min(420, Math.round((width * height) / 4_500))

      // the array is sorted by depth, so a shrinking window drops random flakes rather than the tail
      while (flakes.length > count) {
        flakes.splice(Math.floor(Math.random() * flakes.length), 1)
      }

      while (flakes.length < count) {
        flakes.push(createFlake(width, height))
      }

      flakes.sort((a, b) => a.depth - b.depth)
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

      let layer = -1

      for (const flake of flakes) {
        const speed = 18 + flake.depth * 46

        flake.y += speed * dt
        flake.x += (wind * (0.4 + flake.depth)) * dt

        if (flake.y > height + 20) {
          respawn(flake, width, height, false)
        }

        if (flake.x < -20) {
          flake.x += width + 40
        } else if (flake.x > width + 20) {
          flake.x -= width + 40
        }

        if (flake.layer !== layer) {
          const near = (flake.layer + 0.5) / LAYERS

          layer = flake.layer
          ctx.font = `${(8 + near * 10).toFixed(1)}px ${MONO_FAMILY}`
          ctx.globalAlpha = 0.18 + near * 0.5
        }

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
