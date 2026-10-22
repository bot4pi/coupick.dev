import { useEffect, useState } from 'preact/hooks'

import type { NowPlaying, Track } from '../../api/now-playing'

import { usePolledJson, type Loadable } from './fetch-json'

export type { NowPlaying, Track }

export type NowPlayingState = Loadable<NowPlaying>

const POLL_MS = 10_000

export const useNowPlaying = () => usePolledJson<NowPlaying>({
  url: '/api/now-playing',
  intervalMs: POLL_MS,
  hiddenIntervalMs: 30_000,
  demo: import.meta.env.DEV ? () => import('./demo').then(m => m.demoNowPlaying()) : undefined
})

// spotify reports progress at fetch time; move it forward locally between polls
export const useProgress = (track: Track | null, fetchedAt: number) => {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!track?.playing) {
      return
    }

    const id = setInterval(() => setNow(Date.now()), 1000)

    return () => clearInterval(id)
  }, [track])

  if (track === null) {
    return 0
  }

  if (!track.playing) {
    return track.progressMs
  }

  // clamp in case the visitor's clock disagrees with vercel's
  const elapsed = Math.min(Math.max(now - fetchedAt, 0), POLL_MS * 3)

  return Math.min(track.progressMs + elapsed, track.durationMs)
}
