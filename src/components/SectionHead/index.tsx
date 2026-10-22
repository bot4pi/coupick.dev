import type { ComponentChildren } from 'preact'

import { Scramble } from '../Scramble'

interface SectionHeadProps {
  kicker: string
  title: ComponentChildren
  children?: ComponentChildren
}

export const SectionHead = ({ kicker, title, children }: SectionHeadProps) => (
  <div class='section-head' data-reveal=''>
    <Scramble class='kicker' text={kicker} />
    <h2 class='section-title'>{title}</h2>
    {children !== undefined && <p class='section-sub'>{children}</p>}
  </div>
)
