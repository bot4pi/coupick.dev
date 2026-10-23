import { useMemo, useState } from 'preact/hooks'

import { AsciiCanvas, Spinner } from '../../components'
import { BrandIcon, siSpotify, useProgress, type NowPlayingState, type Track } from '../../shared'

const idleMessages = [
  'silence. probably counting money',
  "nothing's playing. must be deep in a debugger",
  'no music: the borrow checker demands full attention',
  'spotify is quiet. telegram never is'
]

const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000))

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const artistsOf = (track: Track) => track.artists.map(artist => artist.name).join(', ')

const Equalizer = ({ playing }: { playing: boolean }) => (
  <span class={`eq${playing ? ' eq-playing' : ''}`} aria-hidden='true'>
    <i />
    <i />
    <i />
    <i />
  </span>
)

// the cover is drawn in glyphs painted in its own colors; pointing at it shows the real artwork
const Cover = ({ track }: { track: Track }) => {
  const [ascii, setAscii] = useState(false)
  const image = track.album.image

  return (
    <a
      class={`np-cover${ascii ? ' np-cover-ascii' : ''}`}
      href={track.url}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`open ${track.name} on spotify`}
    >
      {image !== null && (
        <>
          <AsciiCanvas
            image={[image]}
            cellWidth={4}
            cellHeight={8}
            fontSize={7}
            intensity={0}
            wordIntensity={1}
            imageGamma={0.75}
            tint
            underlay={0.22}
            onReady={() => setAscii(true)}
          />
          <img src={image} alt='' width={184} height={184} />
        </>
      )}
    </a>
  )
}

const TrackView = ({ track, fetchedAt }: { track: Track, fetchedAt: number }) => {
  const progress = useProgress(track, fetchedAt)
  const share = track.durationMs > 0 ? progress / track.durationMs : 0

  return (
    <div class='np-track'>
      <Cover key={track.album.image} track={track} />

      <div class='np-meta'>
        <a class='np-name' href={track.url} target='_blank' rel='noopener noreferrer'>{track.name}</a>
        <span class='np-artist'>{artistsOf(track)}</span>
        <span class='np-album'>{track.album.name}</span>

        <div class='np-player'>
          <Equalizer playing={track.playing} />

          <span class='np-bar'>
            <span class='np-bar-fill' style={{ transform: `scaleX(${share})` }} />
          </span>

          <span class='np-times mono'>
            <span>{formatTime(progress)}</span>
            <span>{formatTime(track.durationMs)}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

const IdleView = ({ recent }: { recent: Track[] }) => {
  const message = useMemo(() => idleMessages[Math.floor(Math.random() * idleMessages.length)], [])

  return (
    <div class='np-idle'>
      <p class='np-idle-title'>{message}</p>
      <p class='np-idle-sub'>nothing is playing right now</p>

      {recent.length === 0 && (
        // nothing to list: the empty space dozes off instead
        <div class='np-sleep'>
          <AsciiCanvas
            word='zzz'
            cellWidth={5}
            cellHeight={10}
            fontSize={8}
            intensity={0.16}
            threshold={0.24}
            scale={0.45}
            wordIntensity={0.6}
            wordWidth={0.5}
            wordHeight={0.7}
            wordY={0.5}
            pointer='canvas'
            pointerRadius={70}
          />
        </div>
      )}

      {recent.length > 0 && (
        <>
          <p class='np-recent-label mono'>last played</p>
          <ul class='np-recent'>
            {recent.map(track => (
              <li key={track.url}>
                <a class='np-recent-item' href={track.url} target='_blank' rel='noopener noreferrer'>
                  {track.album.image !== null && <img src={track.album.image} alt='' width={32} height={32} />}
                  <span class='np-recent-text'>
                    <span class='np-recent-name'>{track.name}</span>
                    <span class='np-recent-artist'>{artistsOf(track)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export const NowPlayingCard = ({ state }: { state: NowPlayingState }) => {
  const data = state.status === 'ready' ? state.data : null
  const track = data?.track ?? null

  const status = state.status === 'loading'
    ? null
    : track === null ? 'offline' : track.playing ? 'playing' : 'paused'

  return (
    <article class='card spot np'>
      {track?.album.image && (
        <span class='np-glow' style={{ backgroundImage: `url("${track.album.image}")` }} aria-hidden='true' />
      )}

      <header class='card-head'>
        <span class='card-label'>
          <BrandIcon icon={siSpotify} />
          spotify
        </span>
        {status !== null && <span class={`np-badge np-badge-${status}`}>{status}</span>}
      </header>

      {state.status === 'loading' && (
        <p class='widget-loading mono'>
          <Spinner />
          <span class='shimmer'>asking spotify…</span>
        </p>
      )}

      {state.status === 'error' && (
        <div class='np-idle'>
          <p class='np-idle-title'>spotify isn't answering</p>
          <p class='np-idle-sub'>try again in a bit</p>
        </div>
      )}

      {data !== null && (track === null ? <IdleView recent={data.recent} /> : <TrackView track={track} fetchedAt={data.fetchedAt} />)}
    </article>
  )
}
