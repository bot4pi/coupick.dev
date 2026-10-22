import { BrandIcon } from '../../shared'

import './style.css'

interface SkillProps {
  name: string
  icon?: string
  href?: string
  note?: string
  // a quiet suffix inside the chip, e.g. a language level
  detail?: string
  mood?: 'loved' | 'disliked'
}

// an inline chip with an optional tooltip; turns into a link when `href` is set
export const Skill = ({ name, icon, href, note, detail, mood }: SkillProps) => {
  const className = `skill with-note${mood ? ` skill-${mood}` : ''}`

  const content = (
    <>
      {icon && <BrandIcon icon={icon} />}
      <span class='skill-name'>{name}</span>
      {detail !== undefined && <span class='skill-detail mono'>{detail}</span>}
    </>
  )

  if (href) {
    return (
      <a class={className} data-note={note} href={href} target='_blank' rel='noopener noreferrer'>
        {content}
      </a>
    )
  }

  return (
    <span class={className} data-note={note} tabIndex={note ? 0 : undefined}>
      {content}
    </span>
  )
}
