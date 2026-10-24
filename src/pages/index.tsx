import { Snow } from '../components'
import { ContactSection, Footer, Hero, Nav, NowSection, PlaySection, ProjectsSection, StackSection, SupportSection } from '../sections'
import { useNowPlaying, useReveal, useSpotlight } from '../shared'

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
        <PlaySection />
        <ContactSection />
      </main>

      <Footer />
      <Snow />
    </>
  )
}

export { NotFoundPage } from './NotFound'
