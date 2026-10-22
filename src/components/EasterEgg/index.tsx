import { useEffect, useRef, useState } from 'preact/hooks'

import { prefersReducedMotion } from '../../shared/motion'
import { scramble } from '../Scramble'

import './style.css'

interface EasterEggProps {
  text: string
  secret: string
  class?: string
}

// looks like plain text; pointing at it (or focusing it) decodes a note above it
export const EasterEgg = ({ text, secret, class: className }: EasterEggProps) => {
  const [open, setOpen] = useState(false)
  const note = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const node = note.current?.firstChild

    if (!open || !(node instanceof Text) || prefersReducedMotion()) {
      return
    }

    return scramble(node, secret, 520)
  }, [open])

  return (
    <span
      class={`egg${className ? ` ${className}` : ''}`}
      tabIndex={0}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {text}
      {open && <span ref={note} class='egg-note mono' role='tooltip'>{secret}</span>}
    </span>
  )
}
