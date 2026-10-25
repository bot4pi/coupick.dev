import type { ComponentType } from 'preact'
import { useEffect, useState } from 'preact/hooks'

import { MainPage, NotFoundPage } from './pages'

const path = window.location.pathname.replace(/\/+$/, '') || '/'

export const isHome = path === '/' || path === '/index.html'

const gameNames: Record<string, string> = { '/snake': 'snake', '/blockblast': 'blockblast' }

export const pageTitle = isHome ? 'coupick.dev' : `coupick.dev · ${gameNames[path] ?? 'not found'}`

// the games are only downloaded when someone opens one
const games: Record<string, () => Promise<{ default: ComponentType }>> = {
  '/snake': () => import('./pages/games/snake'),
  '/blockblast': () => import('./pages/games/blockblast')
}

const LazyPage = ({ load }: { load: () => Promise<{ default: ComponentType }> }) => {
  const [Page, setPage] = useState<ComponentType | null>(null)

  useEffect(() => {
    load().then(module => setPage(() => module.default))
  }, [])

  return Page === null ? null : <Page />
}

export function App () {
  const game = games[path]

  if (isHome) {
    return <MainPage />
  }

  return game !== undefined ? <LazyPage load={game} /> : <NotFoundPage />
}
