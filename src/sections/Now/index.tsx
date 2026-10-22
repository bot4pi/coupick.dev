import { SectionHead } from '../../components'
import type { NowPlayingState } from '../../shared'

import { CodingStatsCard } from './CodingStats'
import { NowPlayingCard } from './NowPlaying'

import './style.css'

export const NowSection = ({ nowPlaying }: { nowPlaying: NowPlayingState }) => (
  <section class='section container' id='now'>
    <SectionHead kicker='~/now' title='right now'>
      what's in my headphones and how much i've been coding lately. both are live
    </SectionHead>

    <div class='now-grid'>
      <div data-reveal=''>
        <NowPlayingCard state={nowPlaying} />
      </div>
      <div data-reveal='' style={{ '--reveal-delay': '90ms' }}>
        <CodingStatsCard />
      </div>
    </div>
  </section>
)
