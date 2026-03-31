/**
 * SpeedDemo — анимация "скорости" для карточки фичей.
 * Быстрый typing-эффект + строка с пингом + обратная анимация (стирание).
 * Цикл: печать → пинг → пауза → стереть пинг → стереть текст → повтор.
 */

import { useEffect, useRef, useState } from 'react'

const DESCRIPTION = 'Протоколы VLESS и WireGuard обеспечивают максимальную скорость. Минимальная задержка на всех серверах.'
const PING_LINE = '> ping: 12ms ✓'
const TYPE_SPEED = 12
const PING_DELAY = 400
const PING_TYPE_SPEED = 30
const HOLD_DELAY = 5000     // пауза после полного показа (дольше, чтобы успеть прочитать)
const ERASE_SPEED = 8       // скорость стирания — быстрее печати
const RESTART_DELAY = 800   // короткая пауза перед новым циклом

type Phase = 'idle' | 'typing' | 'ping-wait' | 'ping-typing' | 'hold' | 'erase-ping' | 'erase-desc' | 'restart-wait'

interface Props {
  trigger: boolean
  className?: string
}

export default function SpeedDemo({ trigger, className }: Props) {
  const [descChars, setDescChars] = useState(0)
  const [pingChars, setPingChars] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function cleanup() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    timeoutRef.current = null
    intervalRef.current = null
  }

  useEffect(() => {
    if (trigger && phase === 'idle') setPhase('typing')
  }, [trigger, phase])

  useEffect(() => {
    cleanup()

    switch (phase) {
      case 'typing': {
        setDescChars(0)
        setPingChars(0)
        let i = 0
        intervalRef.current = setInterval(() => {
          i++
          setDescChars(i)
          if (i >= DESCRIPTION.length) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setPhase('ping-wait')
          }
        }, TYPE_SPEED)
        break
      }

      case 'ping-wait': {
        timeoutRef.current = setTimeout(() => setPhase('ping-typing'), PING_DELAY)
        break
      }

      case 'ping-typing': {
        let i = 0
        intervalRef.current = setInterval(() => {
          i++
          setPingChars(i)
          if (i >= PING_LINE.length) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setPhase('hold')
          }
        }, PING_TYPE_SPEED)
        break
      }

      case 'hold': {
        timeoutRef.current = setTimeout(() => setPhase('erase-ping'), HOLD_DELAY)
        break
      }

      case 'erase-ping': {
        let i = PING_LINE.length
        intervalRef.current = setInterval(() => {
          i--
          setPingChars(i)
          if (i <= 0) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setPhase('erase-desc')
          }
        }, ERASE_SPEED)
        break
      }

      case 'erase-desc': {
        let i = DESCRIPTION.length
        intervalRef.current = setInterval(() => {
          i--
          setDescChars(i)
          if (i <= 0) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setPhase('restart-wait')
          }
        }, ERASE_SPEED)
        break
      }

      case 'restart-wait': {
        timeoutRef.current = setTimeout(() => setPhase('typing'), RESTART_DELAY)
        break
      }
    }

    return cleanup
  }, [phase])

  // До запуска — статичный текст + зарезервированное место под пинг
  if (phase === 'idle') {
    return (
      <span className={className}>
        {DESCRIPTION}
        <br />
        <span className="text-green-500/70 font-mono text-xs mt-1 inline-block invisible">
          {PING_LINE}
        </span>
      </span>
    )
  }

  return (
    <span className={className}>
      {DESCRIPTION.slice(0, descChars)}
      {descChars > 0 && descChars < DESCRIPTION.length && (
        <span className="cursor-blink">▌</span>
      )}
      <br />
      <span className={`text-green-500/70 font-mono text-xs mt-1 inline-block ${pingChars > 0 ? '' : 'invisible'}`}>
        {pingChars > 0 ? PING_LINE.slice(0, pingChars) : PING_LINE}
        {pingChars > 0 && pingChars < PING_LINE.length && (
          <span className="cursor-blink">▌</span>
        )}
      </span>
    </span>
  )
}
