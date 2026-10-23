import { AsciiCanvas } from '../../components'
import { BrandIcon, IconArrowUpRight, siGithub, siTelegram, type NowPlayingState } from '../../shared'

import './style.css'

// matches the radial css mask on the portrait canvas, so glyphs land as bright as they are drawn
const portraitFade = (u: number, v: number) => {
  const d = Math.hypot((u - 0.5) / 0.5, (v - 0.5) / 0.5)

  if (d <= 0.45) {
    return 1
  }

  if (d <= 0.72) {
    return 1 - ((d - 0.45) / 0.27) * 0.5
  }

  return Math.max(0, 0.5 * (1 - (d - 0.72) / 0.28))
}

const Avatar = () => (
  <img
    class='hero-avatar'
    src='/api/avatar'
    alt='coup'
    width={96}
    height={96}
    onError={event => {
      // the avatar function only runs on vercel and in dev; fall back to the bundled picture
      const img = event.currentTarget

      if (!img.src.endsWith('/avatar.jpg')) {
        img.src = '/avatar.jpg'
      }
    }}
  />
)

export const Hero = ({ nowPlaying }: { nowPlaying: NowPlayingState }) => {
  const track = nowPlaying.status === 'ready' ? nowPlaying.data.track : null
  const listening = track?.playing === true

  return (
    <section class='hero' id='top'>
      <div class='hero-backdrop' aria-hidden='true' />

      <div class='container hero-inner'>
        <div class='hero-copy'>
          <div class='hero-id'>
            <span class={`hero-avatar-wrap${listening ? ' hero-avatar-live' : ''}`}>
              <Avatar />
            </span>

            <div class='hero-who'>
              <span class='hero-name'>Alex<span class='hero-name-rest'>ander</span></span>
              <span class='hero-meta mono'>
                @bot4pi
                {listening && (
                  <a class='hero-status' href='#now'>
                    <span class='hero-status-dot' />
                    on spotify
                  </a>
                )}
              </span>
            </div>
          </div>

          <h1 class='hero-title'>
            i'm coup, <span class='hero-title-dim'>and i make smth.</span>
          </h1>

          <p class='hero-bio'>
            bots, userbots, frameworks for bots <i>and</i> userbots, a wiki about all of it, sites, tools
            and whatever else i get curious about. and if it talks to telegram, i've probably written it
            at least twice <span class='muted'>(duh!)</span>
          </p>

          <div class='hero-actions'>
            <a class='button button-primary' href='https://t.me/bot4pi' target='_blank' rel='noopener noreferrer'>
              <BrandIcon icon={siTelegram} size='16px' />
              message me
            </a>
            <a class='button' href='https://github.com/bot4pi' target='_blank' rel='noopener noreferrer'>
              <BrandIcon icon={siGithub} size='16px' />
              github
              <IconArrowUpRight size='14px' />
            </a>
          </div>
        </div>

        <div class='hero-portrait' aria-hidden='true'>
          <AsciiCanvas
            class='ascii-assemble'
            assembleTarget={{ fade: portraitFade }}
            image={['/api/avatar', '/avatar.jpg']}
            cellWidth={5}
            cellHeight={10}
            fontSize={8}
            intensity={0.08}
            threshold={0.3}
            scale={0.5}
            wordIntensity={1}
            imageGamma={1.1}
            pointer='canvas'
            pointerRadius={90}
          />
        </div>
      </div>
    </section>
  )
}
