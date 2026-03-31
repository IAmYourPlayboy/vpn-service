/**
 * ScrambleText — эффект "шифрования" текста.
 * При active=true запускает внутренний цикл:
 *   шифрование (слева→направо, символы фиксируются) → пауза →
 *   расшифровка (слева→направо, оригинал возвращается) → пауза → повтор.
 */

import { useEffect, useRef, useState } from 'react'

const BINARY_CHARS = '0123456789ABCDEFabcdef#$%&@◆◇■□▪▫'
const GLITCH_CHARS = '!@#$%^&*(){}[]<>?/\\|~±§£¥€¢'

const ENCRYPT_SPEED = 18   // мс на символ при шифровании
const DECRYPT_SPEED = 12   // мс на символ при расшифровке (быстрее)
const HOLD_ENCRYPTED = 2500 // пауза в зашифрованном состоянии
const HOLD_DECRYPTED = 3000 // пауза в расшифрованном состоянии

type Phase = 'idle' | 'encrypting' | 'hold-encrypted' | 'decrypting' | 'hold-decrypted'

interface Props {
  text: string
  active: boolean
  mode?: 'glitch' | 'binary'
  className?: string
}

export default function ScrambleText({ text, active, mode = 'glitch', className }: Props) {
  const [displayed, setDisplayed] = useState(text)
  const [phase, setPhase] = useState<Phase>('idle')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const frozenRef = useRef<string[]>([])
  const startedRef = useRef(false)

  const chars = mode === 'binary' ? BINARY_CHARS : GLITCH_CHARS

  function cleanup() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    intervalRef.current = null
    timeoutRef.current = null
  }

  // Запуск цикла при active=true
  useEffect(() => {
    if (active && !startedRef.current) {
      startedRef.current = true
      // Генерируем фиксированные зашифрованные значения
      frozenRef.current = text.split('').map((char) =>
        char === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)]
      )
      setPhase('encrypting')
    }
  }, [active, text, chars])

  // Машина состояний
  useEffect(() => {
    cleanup()

    switch (phase) {
      case 'encrypting': {
        let progress = 0
        intervalRef.current = setInterval(() => {
          progress++
          setDisplayed(
            text.split('').map((char, i) => {
              if (char === ' ') return ' '
              if (i < progress) return frozenRef.current[i]
              return char
            }).join('')
          )
          if (progress >= text.length) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setPhase('hold-encrypted')
          }
        }, ENCRYPT_SPEED)
        break
      }

      case 'hold-encrypted': {
        timeoutRef.current = setTimeout(() => setPhase('decrypting'), HOLD_ENCRYPTED)
        break
      }

      case 'decrypting': {
        // Расшифровка слева направо — оригинальные символы появляются с начала
        let progress = 0
        intervalRef.current = setInterval(() => {
          progress++
          setDisplayed(
            text.split('').map((char, i) => {
              if (char === ' ') return ' '
              if (i < progress) return char
              return frozenRef.current[i] || char
            }).join('')
          )
          if (progress >= text.length) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setDisplayed(text)
            setPhase('hold-decrypted')
          }
        }, DECRYPT_SPEED)
        break
      }

      case 'hold-decrypted': {
        // Новые фиксированные значения для следующего цикла
        frozenRef.current = text.split('').map((char) =>
          char === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)]
        )
        timeoutRef.current = setTimeout(() => setPhase('encrypting'), HOLD_DECRYPTED)
        break
      }
    }

    return cleanup
  }, [phase, text, chars])

  return <span className={className}>{displayed}</span>
}
