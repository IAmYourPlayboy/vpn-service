/**
 * TypingText — эффект печатания текста как в терминале.
 * Показывает мигающий курсор во время и после набора.
 */

import { useEffect, useState } from 'react'

interface Props {
  text: string
  speed?: number      // мс между символами (default: 80)
  delay?: number      // мс перед началом печати (default: 0)
  className?: string
}

export default function TypingText({ text, speed = 80, delay = 0, className }: Props) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  // Задержка перед началом
  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  // Печатание по одному символу
  useEffect(() => {
    if (!started) return

    let index = 0
    const interval = setInterval(() => {
      index++
      setDisplayed(text.slice(0, index))
      if (index >= text.length) {
        clearInterval(interval)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [started, text, speed])

  return (
    <span className={className}>
      {displayed}
      <span className="cursor-blink">▌</span>
    </span>
  )
}
