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
