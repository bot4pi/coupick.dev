import { ProjectCard, SectionHead, type Project } from '../../components'

import './style.css'

const projects: Project[] = [
  {
    name: 'yuigram',
    url: 'https://github.com/yuigram/yuigram',
    status: 'current',
    monogram: 'Y',
    description: <>one typescript framework for telegram bots <i>and</i> user accounts, with zero runtime dependencies</>,
    tags: ['typescript', 'bot api', 'mtproto']
  },
  {
    name: 'daikoku',
    url: 'https://t.me/DaikokuApp',
    status: 'invite only',
    monogram: 'D',
    description: 'a telegram service that watches the gift marketplaces, catches listings under the floor and can buy them with stars on its own',
    tags: ['typescript', 'gifts', 'yuigram']
  },
  {
    name: 'tele-wiki',
    url: 'https://tele-wiki.org',
    status: 'live',
    monogram: 'T',
    description: 'a wiki about the telegram ecosystem: people, bots and scam breakdowns',
    tags: ['typescript', 'wiki']
  },
  {
    name: 'mirai',
    status: 'private',
    monogram: 'M',
    description: 'a userbot living in my own telegram account: 30+ commands and anti-delete',
    tags: ['typescript', 'userbot']
  },
  {
    name: 'spotify-telegram-sync',
    url: 'https://github.com/bot4pi/spotify-telegram-sync',
    status: 'open source',
    monogram: 'S',
    description: 'syncs my spotify music to telegram through a userbot, built on mtcute',
    tags: ['typescript', 'mtcute', 'userbot']
  }
]

export const ProjectsSection = () => (
  <section class='section container' id='projects'>
    <SectionHead kicker='~/projects' title='projects'>
      the things i'm building right now or keep alive. the covers aren't pictures, by the way
    </SectionHead>

    <ul class='projects-grid'>
      {projects.map((project, i) => (
        <li key={project.name} data-reveal='' style={{ '--reveal-delay': `${(i % 2) * 90}ms` }}>
          <ProjectCard project={project} featured={i === 0} />
        </li>
      ))}
    </ul>
  </section>
)
