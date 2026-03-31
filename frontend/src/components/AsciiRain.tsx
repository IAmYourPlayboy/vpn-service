/**
 * HexRain — Canvas-анимация падающих hex-символов (0-9, A-F).
 * Заменяет старый CSS-based AsciiRain.
 * GPU-ускорение через Canvas + requestAnimationFrame.
 */

import { useEffect, useRef } from 'react'

// Набор hex-символов (шестнадцатеричные, НЕ японские)
const HEX_CHARS = '0123456789ABCDEF'
const CHAR_SIZE = 14        // размер символа в px
const FADE_ALPHA = 0.06     // затухание: rgba(0,0,0,0.06) — чистый фон
const BASE_OPACITY = 0.11   // обычная яркость символов
const FLASH_OPACITY = 0.35  // яркость при вспышке
const FLASH_CHANCE = 0.002  // вероятность вспышки на столбец на кадр (~0.2%)

// Столбец падающих символов
interface HexColumn {
  x: number       // позиция по горизонтали (px)
  y: number       // текущая позиция головы (px)
  speed: number   // скорость падения (переменная)
}

interface Props {
  className?: string
}

export default function AsciiRain({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const columnsRef = useRef<HexColumn[]>([])
  const rafRef = useRef<number>(0)
  const frameCountRef = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Захватываем non-null ссылки для замыканий
    const _container = container
    const _canvas = canvas
    const _ctx = ctx
    const isMobile = window.innerWidth < 768

    // Инициализация столбцов
    function initColumns(width: number, height: number) {
      const gap = isMobile ? CHAR_SIZE * 2.5 : CHAR_SIZE * 1.4
      const numCols = Math.floor(width / gap)
      const cols: HexColumn[] = []

      for (let i = 0; i < numCols; i++) {
        cols.push({
          x: i * gap + Math.random() * gap * 0.3,
          y: Math.random() * height,
          speed: 0.2 + Math.random() * 0.5,
        })
      }

      columnsRef.current = cols
    }

    // Настройка canvas под размер контейнера + HiDPI
    function resize() {
      const rect = _container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      _canvas.width = rect.width * dpr
      _canvas.height = rect.height * dpr
      _canvas.style.width = `${rect.width}px`
      _canvas.style.height = `${rect.height}px`

      _ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initColumns(rect.width, rect.height)
    }

    // Основной цикл отрисовки
    function draw() {
      frameCountRef.current++

      // На мобильных пропускаем каждый 2-й кадр
      if (isMobile && frameCountRef.current % 2 !== 0) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const dpr = window.devicePixelRatio || 1
      const w = _canvas.width / dpr
      const h = _canvas.height / dpr

      // Затухание — полупрозрачный чёрный поверх
      _ctx.fillStyle = `rgba(0, 0, 0, ${FADE_ALPHA})`
      _ctx.fillRect(0, 0, w, h)

      // Рисуем символы
      _ctx.font = `${CHAR_SIZE}px 'JetBrains Mono', 'Fira Code', monospace`
      _ctx.textBaseline = 'top'

      for (const col of columnsRef.current) {
        // Случайный hex-символ
        const char = HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)]

        // Вспышка: редко, но заметно
        const isFlash = Math.random() < FLASH_CHANCE
        const opacity = isFlash ? FLASH_OPACITY : BASE_OPACITY

        _ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
        _ctx.fillText(char, col.x, col.y)

        // Двигаем голову вниз
        col.y += col.speed * CHAR_SIZE

        // Сброс за границей экрана
        if (col.y > h + CHAR_SIZE) {
          col.y = -CHAR_SIZE * (1 + Math.random() * 5)
          col.speed = 0.2 + Math.random() * 0.5
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    // Запуск
    resize()

    // ResizeObserver для корректного ресайза
    const observer = new ResizeObserver(() => resize())
    observer.observe(_container)

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className || ''}`}
      style={{ zIndex: 0 }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  )
}
