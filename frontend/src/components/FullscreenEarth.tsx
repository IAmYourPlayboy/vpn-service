/**
 * FullscreenEarth — полноэкранная вращающаяся Земля на Canvas.
 * Точечная карта континентов: тысячи точек, 3D-проекция, плавное вращение.
 * Адаптивный размер — при изменении окна пересчитывается.
 * Учитывает текущую тему (dark/light).
 */

import { useRef, useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'

// Континенты как bounding-box полигоны (latMin, latMax, lonMin, lonMax)
const CONTINENTS = [
  { lat: [30, 65], lon: [-130, -60] },   // Северная Америка
  { lat: [15, 30], lon: [-117, -86] },    // Центральная Америка
  { lat: [-55, 12], lon: [-75, -35] },    // Южная Америка
  { lat: [5, 12], lon: [-77, -60] },      // Карибы
  { lat: [36, 60], lon: [-10, 40] },      // Европа
  { lat: [-35, 37], lon: [-18, 52] },     // Африка
  { lat: [10, 70], lon: [40, 145] },      // Азия
  { lat: [8, 35], lon: [68, 90] },        // Индия
  { lat: [-40, -12], lon: [113, 154] },   // Австралия
  { lat: [60, 78], lon: [-55, -20] },     // Гренландия
  { lat: [31, 46], lon: [130, 146] },     // Япония
  { lat: [-10, 6], lon: [95, 141] },      // Индонезия
  { lat: [37, 46], lon: [-125, -67] },    // Канада/США север
  { lat: [25, 50], lon: [-125, -103] },   // Запад США
]

// Генерируем точки один раз при старте модуля
function generatePoints(): { lat: number; lon: number; isLand: boolean }[] {
  const points: { lat: number; lon: number; isLand: boolean }[] = []

  for (const box of CONTINENTS) {
    const count = 120
    for (let i = 0; i < count; i++) {
      points.push({
        lat: box.lat[0] + Math.random() * (box.lat[1] - box.lat[0]),
        lon: box.lon[0] + Math.random() * (box.lon[1] - box.lon[0]),
        isLand: true,
      })
    }
  }

  // Редкие океанские точки для фона
  for (let i = 0; i < 250; i++) {
    points.push({
      lat: -80 + Math.random() * 160,
      lon: -180 + Math.random() * 360,
      isLand: false,
    })
  }

  return points
}

const POINTS = generatePoints()

export default function FullscreenEarth() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const rotationRef = useRef(0)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef(theme)
  themeRef.current = theme

  // Отслеживаем размер окна
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height })
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Анимация на Canvas
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas || canvasSize.w === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    function resize() {
      const rect = container.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()

    const observer = new ResizeObserver(() => resize())
    observer.observe(container)

    const isMobile = window.innerWidth < 768
    let frameCount = 0

    function animate() {
      frameCount++
      if (isMobile && frameCount % 2 !== 0) {
        animRef.current = requestAnimationFrame(animate)
        return
      }

      const rot = rotationRef.current
      rotationRef.current += 0.005

      const w = canvasSize.w
      const h = canvasSize.h
      const isDark = themeRef.current === 'dark'

      // Фон
      ctx.fillStyle = isDark ? '#000000' : '#ffffff'
      ctx.fillRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2
      const radius = Math.min(w, h) * 0.42

      // Свечение вокруг сферы
      const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.3)
      if (isDark) {
        glowGrad.addColorStop(0, 'rgba(255,255,255,0)')
        glowGrad.addColorStop(0.9, 'rgba(255,255,255,0.01)')
        glowGrad.addColorStop(1, 'rgba(255,255,255,0.04)')
      } else {
        glowGrad.addColorStop(0, 'rgba(0,0,0,0)')
        glowGrad.addColorStop(0.9, 'rgba(0,0,0,0.01)')
        glowGrad.addColorStop(1, 'rgba(0,0,0,0.04)')
      }
      ctx.fillStyle = glowGrad
      ctx.fillRect(0, 0, w, h)

      // Контур сферы
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()

      // Рисуем точки
      for (const pt of POINTS) {
        const latRad = (pt.lat * Math.PI) / 180
        const lonRad = (pt.lon * Math.PI) / 180 + rot

        // 3D → 2D ортогональная проекция
        const cosLat = Math.cos(latRad)
        const sinLat = Math.sin(latRad)
        const cosLon = Math.cos(lonRad)
        const z3d = cosLat * cosLon // глубина (z)

        // Скрываем заднюю полусферу
        if (z3d < 0) continue

        const cosLatSinLon = cosLat * Math.sin(lonRad)
        // Проверяем что точка внутри круга сферы
        const xNorm = cosLatSinLon
        const yNorm = sinLat
        const distSq = xNorm * xNorm + yNorm * yNorm
        if (distSq > 1) continue

        const x2d = cx + xNorm * radius
        const y2d = cy + yNorm * radius

        // Яркость и размер зависят от z-глубины
        const normalizedZ = z3d // 0..1
        const baseAlpha = pt.isLand ? 0.15 : 0.06
        const alpha = baseAlpha + normalizedZ * 0.45
        const dotRadius = 0.3 + normalizedZ * 2.5

        if (isDark) {
          ctx.fillStyle = `rgba(255,255,255,${alpha})`
        } else {
          ctx.fillStyle = `rgba(0,0,0,${alpha})`
        }

        ctx.beginPath()
        ctx.arc(x2d, y2d, dotRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Яркое кольцо на экваторе — тонкий штрих
      ctx.strokeStyle = isDark
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(cx, cy, radius, radius * 0.1, 0, 0, Math.PI * 2)
      ctx.stroke()

      animRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animRef.current)
      observer.disconnect()
    }
  }, [canvasSize])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0"
      style={{ pointerEvents: 'none' }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
