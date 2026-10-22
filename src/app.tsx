import { useEffect } from 'preact/hooks'

import { MainPage, NotFoundPage } from './pages'

export const isHome = ['/', '/index.html'].includes(window.location.pathname)

export function App () {
  useEffect(() => {
    if (!isHome) {
      document.title = 'coupick.dev · not found'
    }
  }, [])

  return isHome ? <MainPage /> : <NotFoundPage />
}
