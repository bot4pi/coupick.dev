// vercel function: coding time from wakatime.
// with WAKATIME_API_KEY (wakatime.com/settings/api-key) it reports the last 7 days day by day;
// without it, the public all-time stats of WAKATIME_USERNAME (my profile by default).

const API_URL = 'https://wakatime.com/api/v1/users'
const DEFAULT_USERNAME = 'coup'

export interface CodingDay {
  // yyyy-mm-dd in the wakatime account's timezone
  date: string
  seconds: number
}

export interface CodingLanguage {
  name: string
  seconds: number
  percent: number
}

export interface CodingStats {
  configured: boolean
  range: 'week' | 'all-time'
  // e.g. "since feb 12 2025" for all-time stats
  rangeLabel: string | null
  totalSeconds: number
  dailyAverageSeconds: number
  days: CodingDay[]
  languages: CodingLanguage[]
  editor: string | null
  allTimeSeconds: number | null
  fetchedAt: number
}

interface WakaItem {
  name: string
  total_seconds: number
}

interface WakaPublicStats {
  total_seconds?: number
  daily_average?: number
  // the profile page counts time in the "Other" language too; total_seconds leaves it out
  total_seconds_including_other_language?: number
  daily_average_including_other_language?: number
  human_readable_range?: string
  languages?: (WakaItem & { percent?: number })[]
  editors?: WakaItem[]
}

interface WakaDay {
  grand_total?: { total_seconds?: number }
  languages?: WakaItem[]
  editors?: WakaItem[]
  range?: { date?: string }
}

const request = async <T>(path: string, key?: string): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: key === undefined ? {} : { Authorization: `Basic ${Buffer.from(key).toString('base64')}` },
    signal: AbortSignal.timeout(8000)
  })

  if (!response.ok) {
    throw new Error(`wakatime ${path.split('?')[0]}: ${response.status}`)
  }

  return await response.json() as T
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10)

const getSummaries = async (key: string) => {
  try {
    // a named range is resolved in the account's own timezone
    return await request<{ data: WakaDay[] }>(`/current/summaries?${new URLSearchParams({ range: 'Last 7 Days' })}`, key)
  } catch {
    const end = new Date()
    const start = new Date(end.getTime() - 6 * 86_400_000)

    return await request<{ data: WakaDay[] }>(`/current/summaries?${new URLSearchParams({ start: isoDate(start), end: isoDate(end) })}`, key)
  }
}

// optional: the account may not have its all-time total calculated yet
const getAllTime = async (key: string) => {
  try {
    const json = await request<{ data?: { total_seconds?: number } }>('/current/all_time_since_today', key)

    return json.data?.total_seconds ?? null
  } catch {
    return null
  }
}

// wakatime reports languages and editors per day; fold them into one ranking for the week
const rank = (days: WakaDay[], pick: (day: WakaDay) => WakaItem[] | undefined) => {
  const totals = new Map<string, number>()

  for (const day of days) {
    for (const item of pick(day) ?? []) {
      totals.set(item.name, (totals.get(item.name) ?? 0) + item.total_seconds)
    }
  }

  return [...totals].sort((a, b) => b[1] - a[1])
}

const empty = (configured: boolean): CodingStats => ({
  configured,
  range: 'week',
  rangeLabel: null,
  totalSeconds: 0,
  dailyAverageSeconds: 0,
  days: [],
  languages: [],
  editor: null,
  allTimeSeconds: null,
  fetchedAt: Date.now()
})

// what anyone can see on the public profile: only the all-time range is shared there
const getPublicStats = async (username: string): Promise<CodingStats> => {
  const { data } = await request<{ data: WakaPublicStats }>(`/${encodeURIComponent(username)}/stats/all_time`)

  return {
    ...empty(true),
    range: 'all-time',
    rangeLabel: data.human_readable_range?.toLowerCase() ?? null,
    totalSeconds: Math.round(data.total_seconds_including_other_language ?? data.total_seconds ?? 0),
    dailyAverageSeconds: Math.round(data.daily_average_including_other_language ?? data.daily_average ?? 0),
    languages: (data.languages ?? []).filter(language => language.name !== 'Other').slice(0, 5).map(language => ({
      name: language.name,
      seconds: Math.round(language.total_seconds),
      percent: language.percent ?? 0
    })),
    editor: data.editors?.[0]?.name ?? null
  }
}

const getWeekStats = async (key: string): Promise<CodingStats> => {
  const [summaries, allTime] = await Promise.all([getSummaries(key), getAllTime(key)])
  const days = summaries.data.map(day => ({ date: day.range?.date ?? '', seconds: Math.round(day.grand_total?.total_seconds ?? 0) }))
  const total = days.reduce((sum, day) => sum + day.seconds, 0)

  return {
    ...empty(true),
    totalSeconds: total,
    dailyAverageSeconds: days.length > 0 ? Math.round(total / days.length) : 0,
    days,
    languages: rank(summaries.data, day => day.languages)
      .filter(([name]) => name !== 'Other')
      .slice(0, 5)
      .map(([name, seconds]) => ({ name, seconds: Math.round(seconds), percent: total > 0 ? (seconds / total) * 100 : 0 })),
    editor: rank(summaries.data, day => day.editors)[0]?.[0] ?? null,
    allTimeSeconds: allTime === null ? null : Math.round(allTime)
  }
}

export async function GET (): Promise<Response> {
  const headers = { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' }
  const key = process.env.WAKATIME_API_KEY
  const username = process.env.WAKATIME_USERNAME || DEFAULT_USERNAME

  try {
    const stats = key ? await getWeekStats(key) : await getPublicStats(username)

    return Response.json(stats, { headers })
  } catch (error) {
    console.error(error)

    return Response.json({ error: 'wakatime is unreachable' }, { status: 502 })
  }
}
