import { useRef } from 'preact/hooks'

import { useAsciiField, type AsciiFieldHookOptions } from '../../ascii'

import './style.css'

type AsciiCanvasProps = AsciiFieldHookOptions & { class?: string }

// the options are read once on mount
export const AsciiCanvas = ({ class: className, ...options }: AsciiCanvasProps) => {
  const ref = useRef<HTMLCanvasElement>(null)

  useAsciiField(ref, options)

  return <canvas ref={ref} class={`ascii-canvas${className ? ` ${className}` : ''}`} aria-hidden='true' />
}
