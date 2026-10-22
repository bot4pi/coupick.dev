import type { CodingDay, CodingLanguage, CodingStats } from '../../api/wakatime'

import { usePolledJson } from './fetch-json'

export type { CodingDay, CodingLanguage, CodingStats }

export const useCodingStats = () => usePolledJson<CodingStats>({
  url: '/api/wakatime',
  demo: import.meta.env.DEV ? () => import('./demo').then(m => m.demoCodingStats()) : undefined
})

// 83_640 -> "23h 14m", 2_700 -> "45m"
export const formatDuration = (seconds: number) => {
  const minutes = Math.round(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours === 0) {
    return `${minutes}m`
  }

  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`
}
