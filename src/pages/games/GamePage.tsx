import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

import type { AsciiField } from '../../ascii'
import { AsciiCanvas, SectionHead } from '../../components'
import { IconArrowLeft } from '../../shared'

import './games.css'

interface GamePageProps {
  name: string
  sub: ComponentChildren
  // how tall the game is for its width, so the page can fit it into the screen
  ratio?: number
  children: (burst: (x: number, y: number) => void) => ComponentChildren
}

/**
 * The frame every mini-game lives in: a quiet glyph field over the whole screen (the game pings it when
 * something happens), a way back home and the usual section head.
 */
export const GamePage = ({ name, sub, ratio = 1, children }: GamePageProps) => {
  const field = useRef<AsciiField | null>(null)

  useEffect(() => {
    document.title = `coupick.dev · ${name}`
  }, [])

  const burst = (x: number, y: number) => field.current?.ping(x, y, performance.now())

  return (
    <main class='game-page'>
      <AsciiCanvas
        class='game-page-field'
        cellWidth={10}
        cellHeight={20}
        fontSize={13}
        intensity={0.22}
        threshold={0.2}
        scale={0.7}
        pointer='window'
        onReady={ready => {
          field.current = ready
        }}
      />

      <div class='container game-page-inner' style={{ '--game-ratio': ratio }}>
        <nav class='game-page-top'>
          <a class='button game-page-back' href='/#play'>
            <IconArrowLeft size='16px' />
            coupick.dev
          </a>
        </nav>

        <SectionHead kicker={`~/play/${name}`} title={name}>
          {sub}
        </SectionHead>

        {children(burst)}
      </div>
    </main>
  )
}
