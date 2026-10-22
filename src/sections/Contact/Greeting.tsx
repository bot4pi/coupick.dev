import { useEffect, useRef, useState } from 'preact/hooks'

import { prefersReducedMotion } from '../../shared'

// [greeting, language], roughly by how many people speak it
const greetings: [string, string][] = [
  ['hi', 'english'],
  ['hola', 'spanish'],
  ['你好', 'chinese'],
  ['नमस्ते', 'hindi'],
  ['مرحبا', 'arabic'],
  ['bonjour', 'french'],
  ['привет', 'russian'],
  ['olá', 'portuguese'],
  ['নমস্কার', 'bengali'],
  ['こんにちは', 'japanese'],
  ['hallo', 'german'],
  ['halo', 'indonesian'],
  ['آداب', 'urdu'],
  ['merhaba', 'turkish'],
  ['안녕하세요', 'korean'],
  ['xin chào', 'vietnamese'],
  ['ciao', 'italian'],
  ['வணக்கம்', 'tamil'],
  ['నమస్కారం', 'telugu'],
  ['سلام', 'persian'],
  ['สวัสดี', 'thai'],
  ['jambo', 'swahili'],
  ['cześć', 'polish'],
  ['привіт', 'ukrainian'],
  ['kumusta', 'filipino'],
  ['sannu', 'hausa'],
  ['apa khabar', 'malay'],
  ['salut', 'romanian'],
  ['hoi', 'dutch'],
  ['ndewo', 'igbo'],
  ['ሰላም', 'amharic'],
  ['မင်္ဂလာပါ', 'burmese'],
  ['salom', 'uzbek'],
  ['γειά σου', 'greek'],
  ['ahoj', 'czech'],
  ['szia', 'hungarian'],
  ['hej', 'swedish'],
  ['sawubona', 'zulu'],
  ['сәлем', 'kazakh'],
  ['здраво', 'serbian'],
  ['здравейте', 'bulgarian'],
  ['שלום', 'hebrew'],
  ['hei', 'finnish'],
  ['hallå', 'norwegian'],
  ['bok', 'croatian'],
  ['សួស្តី', 'khmer'],
  ['გამარჯობა', 'georgian'],
  ['բարեւ', 'armenian'],
  ['прывітанне', 'belarusian'],
  ['labas', 'lithuanian'],
  ['sveiki', 'latvian'],
  ['tere', 'estonian'],
  ['živjo', 'slovenian'],
  ['сайн уу', 'mongolian'],
  ['dia duit', 'irish'],
  ['shwmae', 'welsh'],
  ['kaixo', 'basque'],
  ['halló', 'icelandic'],
  ['aloha', 'hawaiian'],
  ['kia ora', 'māori'],
  ['saluton', 'esperanto'],
  ['salve', 'latin'],
  ['hello, world', 'c']
]

const INTERVAL_MS = 2200

/**
 * The "hi" in "say hi", cycling through languages. It only runs while it is on screen
 * and stays a plain "hi" for visitors who prefer reduced motion.
 */
export const Greeting = () => {
  const ref = useRef<HTMLSpanElement>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const el = ref.current

    if (el === null || prefersReducedMotion()) {
      return
    }

    let timer: ReturnType<typeof setInterval> | undefined

    const observer = new IntersectionObserver(([entry]) => {
      clearInterval(timer)

      if (entry.isIntersecting) {
        timer = setInterval(() => setIndex(i => (i + 1) % greetings.length), INTERVAL_MS)
      }
    })

    observer.observe(el)

    return () => {
      observer.disconnect()
      clearInterval(timer)
    }
  }, [])

  const [word, language] = greetings[index]

  return (
    <span ref={ref} class='greeting' aria-hidden='true'>
      <span key={index} class='greeting-word' title={language}>{word}</span>
      <span key={`${index}-lang`} class='greeting-lang mono'>{language}</span>
    </span>
  )
}
