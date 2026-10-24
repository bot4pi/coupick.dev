import { render } from 'preact'

import './fonts'
import './index.css'

import { App, isHome } from './app'
import { playIntro, shouldPlayIntro } from './intro'

const intro = isHome && shouldPlayIntro()

if (intro) {
  // the intro always starts from the top of the page
  history.scrollRestoration = 'manual'
  document.documentElement.dataset.intro = 'intro'
} else {
  document.documentElement.dataset.entry = 'plain'
}

render(<App />, document.getElementById('app')!)

if (intro) {
  playIntro()
}

// vercel web analytics: anonymous page views without cookies, only on the deployed build (local dev sends nothing).
// it loads after the page and falls back to /_vercel/insights when vercel passed no paths at build time
if (import.meta.env.PROD) {
  import('@vercel/analytics').then(({ inject }) => inject({ mode: 'production' }, __VERCEL_ANALYTICS_CONFIG__ || undefined))
}
