import { useEffect, useState } from 'preact/hooks'

import { BrandIcon, siGithub, siTelegram } from '../../shared'

import './style.css'

const links = [
  { id: 'now', label: 'now' },
  { id: 'stack', label: 'stack' },
  { id: 'projects', label: 'projects' },
  { id: 'support', label: 'support' },
  { id: 'play', label: 'play' },
  { id: 'contact', label: 'contact' }
]

const useActiveSection = () => {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    // a section counts as active while it crosses the middle of the screen
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActive(entry.target.id)
        }
      }
    }, { rootMargin: '-45% 0px -50% 0px' })

    for (const { id } of links) {
      const section = document.getElementById(id)

      if (section !== null) {
        observer.observe(section)
      }
    }

    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.3) {
        setActive(null)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return active
}

export const Nav = () => {
  const [scrolled, setScrolled] = useState(false)
  const active = useActiveSection()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header class={`nav${scrolled ? ' nav-scrolled' : ''}`}>
      <div class='container nav-inner'>
        <a class='nav-logo mono' href='#top' aria-label='coupick.dev, back to the top'>
          coupick.dev
        </a>

        <nav class='nav-links' aria-label='sections'>
          {links.map(link => (
            <a
              key={link.id}
              class={`nav-link${active === link.id ? ' nav-link-active' : ''}`}
              href={`#${link.id}`}
              aria-current={active === link.id ? 'location' : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div class='nav-icons'>
          <a class='nav-icon' href='https://github.com/bot4pi' target='_blank' rel='noopener noreferrer' aria-label='github'>
            <BrandIcon icon={siGithub} size='16px' />
          </a>
          <a class='nav-icon' href='https://t.me/bot4pi' target='_blank' rel='noopener noreferrer' aria-label='telegram'>
            <BrandIcon icon={siTelegram} size='16px' />
          </a>
        </div>
      </div>
    </header>
  )
}
