import type { ComponentChildren } from 'preact'

import { AsciiCanvas } from '../AsciiCanvas'
import { Scramble } from '../Scramble'
import { IconArrowUpRight, IconLock, useMediaQuery } from '../../shared'

import './style.css'

export interface Project {
  name: string
  // private projects have nowhere to link to
  url?: string
  status: 'current' | 'live' | 'open source' | 'invite only' | 'private'
  // drawn in glyphs on the cover; a letter or two reads best at that size
  monogram: string
  description: ComponentChildren
  tags: string[]
}

// a featured card is as wide as the grid, so its cover has room for the whole name
export const ProjectCard = ({ project: p, featured = false }: { project: Project, featured?: boolean }) => {
  const className = `card spot project${featured ? ' project-featured' : ''}`
  // on a phone even the featured cover is too narrow for a whole word
  const wide = useMediaQuery('(min-width: 721px)')
  const word = featured && wide ? p.name : p.monogram

  const body = (
    <>
      <div class='project-cover'>
        <AsciiCanvas
          key={word}
          word={word}
          cellWidth={5}
          cellHeight={10}
          fontSize={8}
          intensity={0.26}
          threshold={0.18}
          scale={0.42}
          wordIntensity={0.85}
          wordWidth={0.8}
          wordHeight={0.78}
          wordY={0.5}
          pointer='canvas'
          pointerRadius={80}
        />
      </div>

      <div class='project-info'>
        <div class='project-head'>
          <h3 class='project-name mono'>
            <Scramble text={p.name} on='hover' />
          </h3>
          <span class={`project-status project-status-${p.status.replace(' ', '-')}`}>{p.status}</span>
          <span class='project-link' aria-hidden='true'>
            {p.url !== undefined ? <IconArrowUpRight size='16px' /> : <IconLock size='15px' />}
          </span>
        </div>

        <p class='project-desc'>{p.description}</p>

        <ul class='project-tags mono'>
          {p.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
    </>
  )

  if (p.url !== undefined) {
    return (
      <a class={className} href={p.url} target='_blank' rel='noopener noreferrer'>
        {body}
      </a>
    )
  }

  return <div class={className} title='no public repo'>{body}</div>
}
