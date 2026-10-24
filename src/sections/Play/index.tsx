import type { ComponentChildren } from 'preact'
import { useMemo } from 'preact/hooks'

import { Scramble, SectionHead } from '../../components'
import { readBest } from '../../games/scores'
import { BlockBlastPreview } from '../../games/blockblast/BlockBlastPreview'
import { SnakePreview } from '../../games/snake/SnakePreview'
import { IconArrowRight } from '../../shared'

import './style.css'

interface Game {
  name: string
  href: string
  // every mode keeps its own best; the card shows the highest
  scores: string[]
  formatScore: (score: number) => string
  description: ComponentChildren
  tags: string[]
  preview: ComponentChildren
}

const games: Game[] = [
  {
    name: 'snake',
    href: '/snake',
    scores: ['snake-walls', 'snake-portal'],
    formatScore: score => `$${score}`,
    description: 'the classic, except this snake eats money and speeds up with every $. walls or portals, your call',
    tags: ['arrows', 'swipes', '2 modes'],
    preview: <SnakePreview />
  },
  {
    name: 'blockblast',
    href: '/blockblast',
    scores: ['blockblast'],
    formatScore: score => score.toLocaleString('en').replace(/,/g, ' '),
    description: 'drop the pieces, fill rows and columns, keep the combo going. the app, minus an ad every 30 seconds',
    tags: ['drag', 'tap', 'keyboard'],
    preview: <BlockBlastPreview />
  }
]

const GameCard = ({ game }: { game: Game }) => {
  const best = useMemo(() => Math.max(...game.scores.map(readBest)), [])

  return (
    <a class='card spot game-card' href={game.href}>
      <div class='game-card-cover'>{game.preview}</div>

      <div class='game-card-info'>
        <div class='game-card-head'>
          <h3 class='game-card-name mono'>
            <Scramble text={game.name} on='hover' />
          </h3>
          {best > 0 && <span class='game-card-best mono'>best {game.formatScore(best)}</span>}
          <span class='game-card-play mono' aria-hidden='true'>
            play
            <IconArrowRight size='14px' />
          </span>
        </div>

        <p class='game-card-desc'>{game.description}</p>

        <ul class='game-card-tags mono'>
          {game.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
    </a>
  )
}

export const PlaySection = () => (
  <section class='section container' id='play'>
    <SectionHead kicker='~/play' title='play'>
      a couple of tiny games, because why not. no ads, no accounts, your best score stays in your browser
    </SectionHead>

    <ul class='play-grid'>
      {games.map((game, i) => (
        <li key={game.name} data-reveal='' style={{ '--reveal-delay': `${i * 90}ms` }}>
          <GameCard game={game} />
        </li>
      ))}
    </ul>
  </section>
)
