import { AsciiCanvas } from '../components'
import { ContactSection, Footer, Hero, Nav, NowSection, ProjectsSection, StackSection, SupportSection } from '../sections'
import { IconArrowLeft, useNowPlaying, useReveal, useSpotlight } from '../shared'

import './style.css'

export const MainPage = () => {
  const nowPlaying = useNowPlaying()

  useReveal()
  useSpotlight()

  return (
    <>
      <Nav />

      <main>
        <Hero nowPlaying={nowPlaying} />
        <NowSection nowPlaying={nowPlaying} />
        <StackSection />
        <ProjectsSection />
        <SupportSection />
        <ContactSection />
      </main>

      <Footer />
    </>
  )
}

const currentPath = () => {
  try {
    return decodeURIComponent(window.location.pathname)
  } catch {
    return window.location.pathname
  }
}

export const NotFoundPage = () => {
  const small = window.innerWidth < 640

  return (
    <main class='not-found'>
      <AsciiCanvas
        class='not-found-field'
        word='404'
        cellWidth={small ? 9 : 10}
        cellHeight={small ? 18 : 20}
        fontSize={small ? 12 : 13}
        intensity={0.4}
        threshold={0.14}
        wordIntensity={0.8}
        wordWidth={small ? 0.8 : 0.56}
        wordHeight={0.42}
        wordY={0.4}
        pointer='window'
      />

      <div class='container not-found-content'>
        <p class='kicker'>~/404</p>
        <h1 class='not-found-title'>
          <span class='mono'>{currentPath()}</span> doesn't exist
        </h1>
        <p class='not-found-sub'>not a single thing here... not even money</p>
        <a class='button button-primary' href='/'>
          <IconArrowLeft size='16px' />
          back home
        </a>
      </div>
    </main>
  )
}
