/**
 * MultiLangText — анимация смены языков для карточки "Серверы".
 * Стирает текст посимвольно (backspace), затем печатает на другом языке.
 * Флаг страны в конце текста (Twemoji CDN — Apple-подобные флаги на всех ОС).
 * Цикл: RU → EN → DE → FR → RU...
 */

import { useEffect, useRef, useState } from 'react'

// Twemoji CDN — SVG флаги, выглядят как Apple emoji на любой ОС
const FLAGS: Record<string, string> = {
  ru: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1f7-1f1fa.svg',
  gb: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1ec-1f1e7.svg',
  de: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1e9-1f1ea.svg',
  fr: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1eb-1f1f7.svg',
}

const LANGUAGES = [
  { text: 'Подключайтесь к ближайшему серверу', flag: 'ru' },
  { text: 'Connect to the nearest server', flag: 'gb' },
  { text: 'Verbinden Sie sich mit dem nächsten Server', flag: 'de' },
  { text: 'Connectez-vous au serveur le plus proche', flag: 'fr' },
]

const DELETE_SPEED = 20
const TYPE_SPEED = 40
const PAUSE_BEFORE_DELETE = 3000
const PAUSE_AFTER_DELETE = 300

type Phase = 'idle' | 'typing' | 'paused' | 'deleting' | 'gap'

interface Props {
  trigger: boolean
  className?: string
}

function FlagImg({ code }: { code: string }) {
  return (
    <img
      src={FLAGS[code]}
      alt=""
      className="inline-block w-4 h-4 ml-1.5 align-baseline"
      style={{ verticalAlign: '-1px' }}
    />
  )
}

export default function MultiLangText({ trigger, className }: Props) {
  const [langIndex, setLangIndex] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const current = LANGUAGES[langIndex]

  function cleanup() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    timeoutRef.current = null
    intervalRef.current = null
  }

  useEffect(() => {
    if (trigger && phase === 'idle') {
      setCharCount(0)
      setPhase('typing')
    }
  }, [trigger, phase])

  useEffect(() => {
    cleanup()

    switch (phase) {
      case 'typing': {
        let i = charCount
        intervalRef.current = setInterval(() => {
          i++
          setCharCount(i)
          if (i >= current.text.length) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setPhase('paused')
          }
        }, TYPE_SPEED)
        break
      }

      case 'paused': {
        timeoutRef.current = setTimeout(() => setPhase('deleting'), PAUSE_BEFORE_DELETE)
        break
      }

      case 'deleting': {
        let i = current.text.length
        intervalRef.current = setInterval(() => {
          i--
          setCharCount(i)
          if (i <= 0) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setPhase('gap')
          }
        }, DELETE_SPEED)
        break
      }

      case 'gap': {
        timeoutRef.current = setTimeout(() => {
          setLangIndex((prev) => (prev + 1) % LANGUAGES.length)
          setCharCount(0)
          setPhase('typing')
        }, PAUSE_AFTER_DELETE)
        break
      }
    }

    return cleanup
  }, [phase, current.text.length])

  if (phase === 'idle') {
    return (
      <span className={className}>
        {LANGUAGES[0].text}
        <FlagImg code={LANGUAGES[0].flag} />
      </span>
    )
  }

  // Флаг показываем когда текст полностью напечатан или удаляется (пока есть символы)
  const showFlag = charCount > 0

  return (
    <span className={className}>
      {current.text.slice(0, charCount)}
      <span className="cursor-blink">_</span>
      {showFlag && charCount >= current.text.length && (
        <FlagImg code={current.flag} />
      )}
    </span>
  )
}
