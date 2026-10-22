import { AsciiCanvas, SectionHead } from '../../components'
import { playIntro } from '../../intro'
import { BrandIcon, IconArrowUpRight, IconReplay, siGithub, siSteam, siTelegram } from '../../shared'

import { Greeting } from './Greeting'

import './style.css'

const socials = [
  { name: 'telegram', handle: '@bot4pi', url: 'https://t.me/bot4pi', icon: siTelegram, note: 'the fastest way to reach me' },
  { name: 'github', handle: 'bot4pi', url: 'https://github.com/bot4pi', icon: siGithub, note: 'where the code lives' },
  { name: 'steam', handle: 'coupick', url: 'https://steamcommunity.com/id/coupick/', icon: siSteam, note: 'for after hours' }
]

export const ContactSection = () => (
  <section class='section container' id='contact'>
    <SectionHead kicker='~/contact' title={<><span class='sr-only'>say hi</span><span aria-hidden='true'>say <Greeting /></span></>}>
      about a bot, a framework, a job or nothing in particular. i answer on telegram
    </SectionHead>

    <ul class='contact-list' data-reveal=''>
      {socials.map(social => (
        <li key={social.name}>
          <a class='contact-item' href={social.url} target='_blank' rel='noopener noreferrer'>
            <span class='contact-icon'>
              <BrandIcon icon={social.icon} size='18px' />
            </span>
            <span class='contact-name'>{social.name}</span>
            <span class='contact-note'>{social.note}</span>
            <span class='contact-handle mono'>{social.handle}</span>
            <IconArrowUpRight size='16px' />
          </a>
        </li>
      ))}
    </ul>
  </section>
)

export const Footer = () => (
  <footer class='footer'>
    <div class='container'>
      <div class='footer-art'>
        <AsciiCanvas
          word='coupick.dev'
          cellWidth={5}
          cellHeight={10}
          fontSize={8}
          intensity={0.18}
          threshold={0.22}
          scale={0.6}
          wordIntensity={0.6}
          wordWidth={0.92}
          wordHeight={0.86}
          wordY={0.5}
          pointer='canvas'
          pointerRadius={110}
        />
      </div>
    </div>

    <div class='container footer-bar'>
      <span>© {__BUILD_DATE__.slice(0, 4)} coup</span>
      <span class='footer-built mono'>built {__BUILD_DATE__.slice(0, 10)}</span>
      <button type='button' class='footer-replay' onClick={playIntro}>
        <IconReplay size='14px' />
        replay the intro
      </button>
    </div>
  </footer>
)
