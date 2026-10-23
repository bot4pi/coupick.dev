import { useEffect, useState } from 'preact/hooks'

import type { Visits } from '../../api/visits'

import { isDemo } from './fetch-json'

export type { Visits }

const COUNTED_KEY = 'coupick:counted'

// counts this tab session once (POST), afterwards only reads; null until there is something to show
export const useVisits = () => {
  const [visits, setVisits] = useState<Visits | null>(null)

  useEffect(() => {
    if (isDemo) {
      setVisits({ configured: true, visitors: 1337, views: 4096 })

      return
    }

    let counted = false

    try {
      counted = window.sessionStorage.getItem(COUNTED_KEY) !== null
    } catch {
      // no storage: count every page open then
    }

    let cancelled = false

    fetch('/api/visits', { method: counted ? 'GET' : 'POST' })
      .then(response => (response.ok ? response.json() as Promise<Visits> : null))
      .then(data => {
        if (cancelled || data === null || !data.configured) {
          return
        }

        setVisits(data)

        if (!counted) {
          try {
            window.sessionStorage.setItem(COUNTED_KEY, '1')
          } catch {
            // see above
          }
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  return visits
}
