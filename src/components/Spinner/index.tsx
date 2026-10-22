import { useEffect, useState } from 'preact/hooks'

// a little star that pulses through a few glyphs while something loads
const FRAMES = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢']

export const Spinner = () => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame(i => (i + 1) % FRAMES.length), 120)

    return () => clearInterval(id)
  }, [])

  return <span class='spinner' aria-hidden='true'>{FRAMES[frame]}</span>
}
