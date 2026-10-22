// sample data for `?demo` in dev, so the widgets can be styled without api keys

import type { NowPlaying } from '../../api/now-playing'
import type { CodingStats } from '../../api/wakatime'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const demoNowPlaying = async (): Promise<NowPlaying> => {
  await wait(600)

  return {
    configured: true,
    track: {
      name: 'Nightcall',
      url: 'https://open.spotify.com',
      artists: [{ name: 'Kavinsky', url: 'https://open.spotify.com' }],
      album: { name: 'OutRun', image: '/avatar.jpg' },
      durationMs: 258_000,
      progressMs: 61_000,
      playing: true
    },
    recent: [],
    fetchedAt: Date.now()
  }
}

export const demoCodingStats = async (): Promise<CodingStats> => {
  await wait(900)

  const today = new Date()
  const hours = [3.2, 5.6, 2.1, 6.8, 4.4, 1.2, 3.9]

  const days = hours.map((h, i) => {
    const date = new Date(today.getTime() - (hours.length - 1 - i) * 86_400_000)

    return { date: date.toISOString().slice(0, 10), seconds: Math.round(h * 3600) }
  })

  const total = days.reduce((sum, day) => sum + day.seconds, 0)
  const shares: [string, number][] = [['TypeScript', 0.64], ['Python', 0.14], ['FunC', 0.08], ['Rust', 0.06], ['Markdown', 0.04]]

  return {
    configured: true,
    range: 'week',
    rangeLabel: null,
    totalSeconds: total,
    dailyAverageSeconds: Math.round(total / 7),
    days,
    languages: shares.map(([name, share]) => ({ name, seconds: Math.round(total * share), percent: share * 100 })),
    editor: 'VS Code',
    allTimeSeconds: 1_734_000,
    fetchedAt: Date.now()
  }
}
