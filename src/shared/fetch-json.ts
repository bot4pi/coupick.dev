import { useEffect, useState } from 'preact/hooks'

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready', data: T }

// `npm run dev -- ?demo`: the widgets show sample data instead of asking the api
export const isDemo = import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')

interface PollOptions<T> {
  url: string
  // 0 = load once
  intervalMs?: number
  hiddenIntervalMs?: number
  demo?: () => Promise<T>
}

export const usePolledJson = <T>({ url, intervalMs = 0, hiddenIntervalMs = intervalMs, demo }: PollOptions<T>) => {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    if (isDemo && demo !== undefined) {
      demo().then(data => !cancelled && setState({ status: 'ready', data }))

      return () => {
        cancelled = true
      }
    }

    const load = async () => {
      try {
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`status ${response.status}`)
        }

        const data = await response.json() as T

        if (!cancelled) {
          setState({ status: 'ready', data })
        }
      } catch {
        // keep showing the last good answer if one poll fails
        if (!cancelled) {
          setState(prev => (prev.status === 'ready' ? prev : { status: 'error' }))
        }
      }

      if (!cancelled && intervalMs > 0) {
        timer = setTimeout(load, document.hidden ? hiddenIntervalMs : intervalMs)
      }
    }

    load()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [url])

  return state
}
