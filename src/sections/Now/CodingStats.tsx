import { useRef } from 'preact/hooks'

import { Spinner } from '../../components'
import {
  BrandIcon,
  formatDuration,
  siWakatime,
  useCodingStats,
  useInView,
  type CodingDay,
  type CodingLanguage,
  type CodingStats
} from '../../shared'

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// noon keeps the date on the same day in every timezone
const weekday = (date: string) => WEEKDAYS[new Date(`${date}T12:00:00`).getDay()] ?? ''

const Chart = ({ days }: { days: CodingDay[] }) => {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const max = Math.max(...days.map(day => day.seconds), 1)

  return (
    <div
      ref={ref}
      class={`cs-chart${inView ? ' cs-in' : ''}`}
      role='img'
      aria-label={days.map(day => `${weekday(day.date)} ${formatDuration(day.seconds)}`).join(', ')}
    >
      {days.map((day, i) => (
        <div
          key={day.date}
          class={`cs-day with-note${i === days.length - 1 ? ' cs-today' : ''}`}
          data-note={formatDuration(day.seconds)}
          style={{ '--h': day.seconds / max, '--i': i }}
        >
          <span class='cs-col'>
            <span class='cs-bar' />
          </span>
          <span class='cs-day-label mono'>{weekday(day.date)}</span>
        </div>
      ))}
    </div>
  )
}

const Languages = ({ languages, limit }: { languages: CodingLanguage[], limit: number }) => {
  const ref = useRef<HTMLUListElement>(null)
  const inView = useInView(ref)

  return (
    <ul ref={ref} class={`cs-langs${inView ? ' cs-in' : ''}`}>
      {languages.slice(0, limit).map((language, i) => (
        <li key={language.name} class='cs-lang' style={{ '--share': language.percent / 100, '--i': i }}>
          <span class='cs-lang-name'>{language.name.toLowerCase()}</span>
          <span class='cs-lang-track'>
            <span class='cs-lang-fill' />
          </span>
          <span class='cs-lang-value mono'>{Math.round(language.percent)}%</span>
        </li>
      ))}
    </ul>
  )
}

const Stats = ({ stats }: { stats: CodingStats }) => (
  <>
    <div class='cs-summary'>
      <span class='cs-total'>{formatDuration(stats.totalSeconds)}</span>
      <span class='cs-sub'>
        {formatDuration(stats.dailyAverageSeconds)} a day on average
        {stats.editor !== null && <>, mostly in {stats.editor.toLowerCase()}</>}
        {stats.rangeLabel !== null && <>, {stats.rangeLabel}</>}
      </span>
    </div>

    {stats.days.length > 0 && <Chart days={stats.days} />}
    {stats.languages.length > 0 && <Languages languages={stats.languages} limit={4} />}

    {stats.allTimeSeconds !== null && (
      <p class='cs-foot mono'>
        {Math.round(stats.allTimeSeconds / 3600).toLocaleString('en')} hours tracked in total
      </p>
    )}
  </>
)

export const CodingStatsCard = () => {
  const state = useCodingStats()

  return (
    <article class='card spot cs'>
      <header class='card-head'>
        <span class='card-label'>
          <BrandIcon icon={siWakatime} />
          wakatime
        </span>
        {state.status === 'ready' && state.data.configured && (
          <span>{state.data.range === 'week' ? 'last 7 days' : 'all time'}</span>
        )}
      </header>

      {state.status === 'loading' && (
        <p class='widget-loading mono'>
          <Spinner />
          <span class='shimmer'>counting keystrokes…</span>
        </p>
      )}

      {state.status === 'error' && (
        <div class='np-idle'>
          <p class='np-idle-title'>wakatime isn't answering</p>
          <p class='np-idle-sub'>the stats will be back in a bit</p>
        </div>
      )}

      {state.status === 'ready' && (state.data.configured
        ? <Stats stats={state.data} />
        : (
          <div class='np-idle'>
            <p class='np-idle-title'>no stats yet</p>
            <p class='np-idle-sub'>wakatime isn't connected to this site</p>
          </div>
        ))}
    </article>
  )
}
