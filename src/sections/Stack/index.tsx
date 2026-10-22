import { EasterEgg, SectionHead, Skill } from '../../components'

import { Bleep } from './Bleep'
import {
  BrandIcon,
  IconProtocol,
  siDocker,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siPreact,
  siPython,
  siRedis,
  siSqlite,
  siTelegram,
  siTon,
  siTypescript,
  siJavascript
} from '../../shared'

import './style.css'

// the things almost every project of mine is made of
const core = [
  { name: 'typescript', icon: siTypescript, note: 'the main one. strict mode or nothing' },
  { name: 'javascript', icon: siJavascript, note: "what's left after the types are gone" },
  { name: 'python', icon: siPython, note: 'aiogram, for when a bot has to exist by tomorrow' },
  { name: 'node.js', icon: siNodedotjs, note: '22 lts, nothing older' },
  { name: 'bot api', icon: siTelegram, note: 'polite, documented, limited' },
  { name: 'mtproto', icon: null, note: 'no wrappers. well, now there is my own' }
]

const toolbox = [
  { name: 'next.js', icon: siNextdotjs },
  { name: 'preact', icon: siPreact, note: 'this site, btw' },
  { name: 'postgres', icon: siPostgresql },
  { name: 'redis', icon: siRedis },
  { name: 'sqlite', icon: siSqlite, note: 'one bot, one file' },
  { name: 'docker', icon: siDocker, note: 'straight to a vps' },
  { name: 'ton', icon: siTon, note: 'wallets, gifts, funC contracts' }
]

export const StackSection = () => (
  <section class='section container' id='stack'>
    <SectionHead kicker='~/stack' title='the stack'>
      what i actually ship with, the strongest first
    </SectionHead>

    <ul class='stack-core'>
      {core.map((item, i) => (
        <li key={item.name} data-reveal='' style={{ '--reveal-delay': `${i * 70}ms` }}>
          <div class='card spot stack-tile'>
            <span class='stack-icon'>
              {item.icon === null ? <IconProtocol size='20px' /> : <BrandIcon icon={item.icon} size='20px' />}
            </span>
            <span class='stack-name'>{item.name}</span>
            <span class='stack-note'>{item.note}</span>
          </div>
        </li>
      ))}
    </ul>

    <div class='card stack-box' data-reveal=''>
      <div class='stack-box-head mono'>
        <span>also in the toolbox</span>
        <span class='stack-box-hint'>point at a chip: most come with a story</span>
      </div>

      <p class='stack-chips'>
        {toolbox.map(item => <Skill key={item.name} name={item.name} icon={item.icon} note={item.note} />)}
      </p>

      <dl class='stack-facts'>
        <div>
          <dt class='mono'>speaks</dt>
          <dd>
            <Skill name='русский' detail='native' />
            <Skill name='english' detail='b2' />
          </dd>
        </div>
        <div>
          <dt class='mono'>loves</dt>
          <dd>
            <Skill name='music' note='the spotify card up there never lies' />
            <Skill name='dogs' note='every single one of them' />
            <Skill name='$$ money' note='unironically' mood='loved' />
            <Skill name='inventing' note='mostly things nobody asked for' />
          </dd>
        </div>
        <div>
          <dt class='mono'>dislikes</dt>
          <dd>
            <Skill name='bot api limits' note="that's why mtproto" mood='disliked' />
            <Skill name='claude code limits' note='always right in the middle of a refactor' mood='disliked' />
            <Skill name='being broke' note='see above' mood='disliked' />
          </dd>
        </div>
        <div class='stack-facts-wide'>
          <dt class='mono'>on ai</dt>
          <dd class='stack-facts-text'>
            i can't stand vibe-coded <Bleep />, but i don't mind some help from{' '}
            <EasterEgg class='skill' text='ai' secret='claude one love' /> while i build
          </dd>
        </div>
      </dl>
    </div>
  </section>
)
