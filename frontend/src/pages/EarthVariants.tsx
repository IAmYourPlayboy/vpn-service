/**
 * Тестовая страница — 4 варианта ASCII-Земли.
 * Заходи на localhost:5173/earth-test, выбирай лучший.
 */

import { useRef, useEffect, useState, useCallback } from 'react'

// ============================================================================
// ВАРИАНТ 1: Сфера + континенты (ASCII dots)
// Белые точки на белом фоне, Земля видна за счёт разницы яркости символов.
// Внешний контур — яркие символы, внутренние — затенённые.
// ============================================================================

function EarthVariant1() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const rotationRef = useRef(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Отслеживаем размер контейнера
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setSize({ w: width, h: height })
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    canvas.style.width = `${size.w}px`
    canvas.style.height = `${size.h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const fontSize = Math.max(8, Math.min(size.w, size.h) / 60)
    const cols = Math.floor(size.w / (fontSize * 0.6))
    const rows = Math.floor(size.h / (fontSize * 1.2))

    // Простая карта континентов (упрощённые точки на сфере)
    // [phi, theta, radius] — spherical coords
    // Упрощённые контуры континентов
    const landMasses: { latMin: number; latMax: number; lonRanges: [number, number][] }[] = [
      // Северная Америка
      { latMin: 25, latMax: 65, lonRanges: [[-130, -65], [-10, 5]] },
      // Южная Америка
      { latMin: -55, latMax: 12, lonRanges: [[-80, -35]] },
      // Европа
      { latMin: 36, latMax: 60, lonRanges: [[-10, 40]] },
      // Африка
      { latMin: -35, latMax: 37, lonRanges: [[-18, 52]] },
      // Азия
      { latMin: 10, latMax: 70, lonRanges: [[40, 145]] },
      // Индия
      { latMin: 8, latMax: 35, lonRanges: [[68, 90]] },
      // Австралия
      { latMin: -40, latMax: -12, lonRanges: [[113, 154]] },
      // Гренландия
      { latMin: 60, latMax: 77, lonRanges: [[-55, -20]] },
    ]

    function isLand(lat: number, lon: number): boolean {
      for (const m of landMasses) {
        if (lat < m.latMin || lat > m.latMax) continue
        for (const [min, max] of m.lonRanges) {
          if (lon >= min && lon <= max) return true
        }
      }
      return false
    }

    function animate() {
      const rot = rotationRef.current
      rotationRef.current += 0.004

      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, size.w, size.h)

      const cx = cols / 2
      const cy = rows / 2
      const radius = Math.min(cols, rows) * 0.45

      ctx.font = `monospace ${fontSize}px`

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const dx = (col - cx) / radius
          const dy = (row - cy) / radius
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist > 1) continue // за пределами сферы

          // Сферические координаты
          const lat = Math.asin(dy) * (180 / Math.PI)
          const baseLon = Math.asin(dx / Math.cos(Math.asin(dy))) * (180 / Math.PI)
          const lon = baseLon + rot * (180 / Math.PI)

          const isLandPoint = isLand(lat, ((lon % 360) + 360) % 360 - 180)

          // Яркость: контур яркий, земля тёмная, океан средний
          let char = '·'
          if (dist > 0.92) {
            // Край сферы — яркий контур
            const glow = 1 - (1 - dist) / 0.08
            ctx.fillStyle = `rgba(255,255,255,${0.4 + glow * 0.6})`
            char = '#'
          } else if (isLandPoint) {
            // Континент
            ctx.fillStyle = 'rgba(255,255,255,0.55)'
            char = isLandPoint ? '█' : '▓'
          } else {
            // Океан
            const depth = 1 - dist
            ctx.fillStyle = `rgba(255,255,255,${0.04 + depth * 0.06})`
            char = '·'
          }

          ctx.fillText(char, col * fontSize * 0.6, row * fontSize * 1.2)
        }
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [size])

  return (
    <div ref={containerRef} className="w-full aspect-square relative">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}

// ============================================================================
// ВАРИАНТ 2: Wireframe сфера (линии сетки)
// Тонкие линии широты/долготы вращаются. Чистый минимализм.
// ============================================================================

function EarthVariant2() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const rotationRef = useRef(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    canvas.style.width = `${size.w}px`
    canvas.style.height = `${size.h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    function drawSphereWireframe(rotx: number) {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, size.w, size.h)

      const { w, h } = size
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) * 0.4

      // Круг контур
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()

      // Параллели (широты)
      for (let lat = -70; lat <= 70; lat += 20) {
        const latRad = (lat * Math.PI) / 180
        const y = cy + Math.sin(latRad) * r

        // На видимой части шара рисуем эллипс
        const xLen = Math.cos(latRad) * r
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'
        ctx.beginPath()
        ctx.ellipse(cx, y, Math.abs(xLen), r * 0.05, 0, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Меридианы (долготы) — вращаются
      const meridianCount = 12
      const rot = rotationRef.current
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      for (let i = 0; i < meridianCount; i++) {
        const lon = (i / meridianCount) * Math.PI * 2 + rot
        const cosLon = Math.cos(lon)

        if (Math.abs(cosLon) < 0.05) continue // слишком близко к краю

        ctx.beginPath()
        const width = Math.cos(lon) * r
        if (width > 0) {
          ctx.ellipse(cx + width * 0, cy, Math.abs(width), r, 0, 0, Math.PI * 2)
        }
        ctx.stroke()
      }

      // Точки на пересечении
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      for (let lat = -60; lat <= 60; lat += 30) {
        const latRad = (lat * Math.PI) / 180
        for (let i = 0; i < meridianCount; i++) {
          const lon = (i / meridianCount) * Math.PI * 2 + rot
          const cosLon = Math.cos(lon)
          const sinLon = Math.sin(lon)

          const px = cx + Math.cos(latRad) * Math.sin(lon) * r * cosLon
          const py = cy + Math.sin(latRad) * r

          if (Math.cos(latRad) * cosLon > 0.1) {
            ctx.beginPath()
            ctx.arc(cx + Math.cos(latRad) * Math.sin(lon) * r, py, 1.5, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    }

    function animate() {
      rotationRef.current += 0.008
      drawSphereWireframe(rotationRef.current)
      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [size])

  return (
    <div ref={containerRef} className="w-full aspect-square relative">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}

// ============================================================================
// ВАРИАНТ 3: Точечная Земля (dot-matrix)
// Тысячи точек, плотность по континентам. Объём за счёт размера точек.
// ============================================================================

function EarthVariant3() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const rotationRef = useRef(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Упрощённая модель континентов — набор точек (lat, lon)
  const earthPointsRef = useRef<{ lat: number; lon: number }[]>([])

  // Генерируем точки на поверхности сферы
  useEffect(() => {
    const points: { lat: number; lon: number }[] = []

    // Континенты как наборы bounding-box полигонов
    const continentBoxes: { lat: [number, number]; lon: [number, number] }[] = [
      // Северная Америка
      { lat: [30, 65], lon: [-130, -60] },
      { lat: [15, 30], lon: [-117, -86] },
      // Южная Америка
      { lat: [-55, 5], lon: [-75, -35] },
      { lat: [5, 12], lon: [-77, -60] },
      // Европа
      { lat: [36, 60], lon: [-10, 40] },
      // Африка
      { lat: [-35, 37], lon: [-18, 52] },
      // Азия
      { lat: [10, 70], lon: [40, 145] },
      // Индия
      { lat: [8, 35], lon: [68, 90] },
      // Австралия
      { lat: [-40, -12], lon: [113, 154] },
      // Гренландия
      { lat: [60, 78], lon: [-55, -20] },
      // Япония
      { lat: [31, 46], lon: [130, 146] },
      // Индонезия
      { lat: [-10, 6], lon: [95, 141] },
    ]

    // Генерируем случайные точки внутри боксов континентов
    for (const box of continentBoxes) {
      const density = 150 // точек на континент
      for (let i = 0; i < density; i++) {
        points.push({
          lat: box.lat[0] + Math.random() * (box.lat[1] - box.lat[0]),
          lon: box.lon[0] + Math.random() * (box.lon[1] - box.lon[0]),
        })
      }
    }

    // Равномерно покрываем океан редкими точками
    for (let i = 0; i < 200; i++) {
      points.push({
        lat: -80 + Math.random() * 160,
        lon: -180 + Math.random() * 360,
      })
    }

    earthPointsRef.current = points
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    canvas.style.width = `${size.w}px`
    canvas.style.height = `${size.h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    function animate() {
      const rot = rotationRef.current
      rotationRef.current += 0.005

      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, size.w, size.h)

      const { w, h } = size
      const cx = w / 2
      const cy = h / 2
      const r = Math.min(w, h) * 0.42

      // Контур сферы
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()

      // Рисуем точки
      const points = earthPointsRef.current
      for (const pt of points) {
        const latRad = (pt.lat * Math.PI) / 180
        const lonRad = (pt.lon * Math.PI) / 180 + rot

        // 3D → 2D проекция (ортогональная)
        const cosLat = Math.cos(latRad)
        const sinLat = Math.sin(latRad)
        const cosLon = Math.cos(lonRad)
        const sinLon = Math.sin(lonRad)

        const x3d = cosLat * cosLon
        const y3d = sinLat
        const z3d = cosLat * sinLon

        // Скрываем заднюю полусферу
        if (z3d < -0.1) continue

        const x2d = cx + x3d * r
        const y2d = cy + y3d * r

        // Размер и прозрачность зависят от z (глубина)
        const alpha = 0.1 + (z3d + 1) * 0.4
        const dotSize = 0.5 + z3d * 2

        if (Math.sqrt((x2d - cx) ** 2 + (y2d - cy) ** 2) > r - 1) continue

        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.beginPath()
        ctx.arc(x2d, y2d, Math.max(0.5, dotSize), 0, Math.PI * 2)
        ctx.fill()
      }

      // Кольцо свечения вокруг сферы
      const gradient = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.2)
      gradient.addColorStop(0, 'rgba(255,255,255,0)')
      gradient.addColorStop(1, 'rgba(255,255,255,0.02)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)

      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [size])

  return (
    <div ref={containerRef} className="w-full aspect-square relative">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}

// ============================================================================
// ВАРИАНТ 4: Настоящая ASCII-символьная Земля (полностью текстовая)
// Каждый символ — часть рельефа. Настоящий ASCII art, без Canvas-точек.
// Использует Canvas только для отрисовки готовых символов.
// ============================================================================

function EarthVariant4() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const rotationRef = useRef(0)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Модель континентов (упрощённая карта: lat/lon → высота)
  function getElevation(lat: number, lon: number): number {
    // Упрощённые полигоны континентов
    const landDefs: { latMin: number; latMax: number; lonMin: number; lonMax: number }[] = [
      { latMin: 30, latMax: 65, lonMin: -130, lonMax: -60 },  // NA
      { latMin: 15, latMax: 30, lonMin: -117, lonMax: -86 },   // Central America
      { latMin: -55, latMax: 12, lonMin: -75, lonMax: -35 },   // SA
      { latMin: 36, latMax: 60, lonMin: -10, lonMax: 40 },     // EU
      { latMin: -35, latMax: 37, lonMin: -18, lonMax: 52 },    // Africa
      { latMin: 10, latMax: 70, lonMin: 40, lonMax: 145 },     // Asia
      { latMin: 8, latMax: 35, lonMin: 68, lonMax: 90 },       // India
      { latMin: -40, latMax: -12, lonMin: 113, lonMax: 154 },  // Australia
      { latMin: 60, latMax: 78, lonMin: -55, lonMax: -20 },    // Greenland
      { latMin: 31, latMax: 46, lonMin: 130, lonMax: 146 },    // Japan
      { latMin: -10, latMax: 6, lonMin: 95, lonMax: 141 },     // Indonesia
    ]

    for (const d of landDefs) {
      if (lat >= d.latMin && lat <= d.latMax && lon >= d.lonMin && lon <= d.lonMax) {
        return 0.6 + Math.random() * 0.4 // суша ярче
      }
    }
    return 0.05 + Math.random() * 0.15 // океан тусклый
  }

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    canvas.style.width = `${size.w}px`
    canvas.style.height = `${size.h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const fontSize = Math.max(10, Math.min(size.w, size.h) / 55)
    const cols = Math.floor(size.w / (fontSize * 0.6))
    const rows = Math.floor(size.h / (fontSize * 1.15))

    // ASCII символы по яркости (от тёмного к светлому)
    const asciiChars = ' .:;+=xX$&#@'

    function animate() {
      const rot = rotationRef.current
      rotationRef.current += 0.005

      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, size.w, size.h)

      const cx = cols / 2
      const cy = rows / 2
      const radius = Math.min(cols, rows) * 0.45

      ctx.font = `monospace ${fontSize}px`
      ctx.textBaseline = 'middle'

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const dx = col - cx
          const dy = row - cy
          const dist = Math.sqrt(dx * dx + dy * dy) / radius

          if (dist > 1.02) continue

          // Сферические координаты
          const lat = Math.asin((dy / radius)) * (180 / Math.PI)
          const baseLon = Math.asin(Math.min(1, Math.max(-1, (dx / radius) / Math.max(0.001, Math.cos(Math.asin(dy / radius))))) * 1)
            * (180 / Math.PI)
          const lon = ((baseLon + rot * (180 / Math.PI)) % 360)
          const normalizedLon = lon > 180 ? lon - 360 : lon < -180 ? lon + 360 : lon

          // Край сферы = яркий контур
          if (dist > 0.88) {
            const edgeGlow = (dist - 0.88) / 0.14
            ctx.fillStyle = `rgba(255,255,255,${0.2 + edgeGlow * 0.8})`
            ctx.fillText('#', col * fontSize * 0.6, row * fontSize * 1.15)
            continue
          }

          // Поверхность
          const elevation = getElevation(lat, normalizedLon)
          const z3d = Math.sqrt(1 - dist * dist) // глубина от зрителя
          const brightness = elevation * z3d

          const charIndex = Math.floor(brightness * (asciiChars.length - 1))
          const clamped = Math.max(0, Math.min(asciiChars.length - 1, charIndex))
          const char = asciiChars[clamped]

          const alpha = 0.15 + brightness * 0.7
          ctx.fillStyle = `rgba(255,255,255,${alpha})`
          ctx.fillText(char, col * fontSize * 0.6, row * fontSize * 1.15)
        }
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [size])

  return (
    <div ref={containerRef} className="w-full aspect-square relative">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}

// ============================================================================
// ГЛАВНАЯ СТРАНИЦА — 4 варианта рядом
// ============================================================================

const variants = [
  {
    id: 1,
    name: 'Сфера + континенты (ASCII)',
    desc: 'Символы заполняют шар: континенты яркие (#██), океан тусклый (·). Контур светится.',
    component: EarthVariant1,
  },
  {
    id: 2,
    name: 'Wireframe сетка',
    desc: 'Тонкие линии широты/долготы вращаются. Минимализм.',
    component: EarthVariant2,
  },
  {
    id: 3,
    name: 'Точечная карта',
    desc: 'Тысячи точек на поверхности сферы. Контуры континентов из точек.',
    component: EarthVariant3,
  },
  {
    id: 4,
    name: 'Полная ASCII карта',
    desc: 'Каждый символ — часть рельефа. Настоящий ASCII art.',
    component: EarthVariant4,
  },
]

export default function EarthVariants() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2 font-mono">Земля — 4 варианта</h1>
        <p className="text-gray-500 text-sm mb-8 font-mono">
          Выбери стиль. Потом настроим цвета и размер.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {variants.map((v) => (
            <div key={v.id} className="border border-[#222] rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-[#222] font-mono text-xs text-gray-500">
                [Вариант {v.id}] {v.name}
              </div>
              <div className="p-4">
                <v.component />
              </div>
              <div className="px-4 pb-4">
                <p className="text-gray-600 text-xs font-mono">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 border border-[#222] bg-black/50 font-mono text-xs text-gray-500">
          <p>$ echo "Уменьшай окно — Земля подстраивается. Все варианты адаптивные."</p>
          <p>$ echo "Посмотри, выбери номер. Потом настроим цвета под светлую/тёмную тему."</p>
          <p className="animate-pulse text-gray-400 mt-2">_</p>
        </div>
      </div>
    </div>
  )
}
