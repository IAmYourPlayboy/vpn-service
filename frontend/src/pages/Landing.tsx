/**
 * Лендинг — "ASCII Cinema / Darknet Gateway".
 * Чёрный фон, Hex Matrix Rain (Canvas), терминальная эстетика.
 * Block/Shadow ASCII-иконки (█▓▒░), последовательные анимации карточек.
 */

import { Link } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import AsciiRain from '../components/AsciiRain'
import TypingText from '../components/TypingText'
import ScrambleText from '../components/ScrambleText'
import SpeedDemo from '../components/SpeedDemo'
import MultiLangText from '../components/MultiLangText'

// Block/Shadow ASCII-иконки (█▓▒░ стиль)
const ASCII_LOCK = `     ▄██▄
     █  █
  ▄████████▄
  █ ▒▒▒▒▒▒ █
  █ ▒▒▒▒▒▒ █
  █ ▒▒▒▒▒▒ █
  ▀████████▀`

const ASCII_BOLT = ` ▓███▀▀
  ▓██▀
  ▀██▓
▀▀▀▀▀▀▀▀▀
   ▀██▓
    ▀█▓
     ▀▓`

const ASCII_RACK = `  ▄████████▄
  █ ▪▪▪▪ ░░ █
  ▀████████▀
  ▄████████▄
  █ ▪▪▪▪ ░░ █
  ▀████████▀`

/**
 * Хук для fade-in секций при скролле (Intersection Observer).
 */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return ref
}

/**
 * Обёртка для секции с fade-in анимацией.
 */
function FadeSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useFadeIn()
  return (
    <div ref={ref} className={`fade-in-section ${className}`}>
      {children}
    </div>
  )
}

/**
 * Хук для последовательного запуска анимаций карточек.
 * Возвращает массив из 3 boolean: [card1Active, card2Active, card3Active].
 * Запускается при появлении секции в viewport, зацикливается.
 */
function useStaggeredAnimations() {
  const [triggers, setTriggers] = useState([false, false, false])
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const cycleRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Наблюдатель за видимостью секции
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [isVisible])

  // Запуск цикла анимаций
  const startCycle = useCallback(() => {
    // Сброс
    setTriggers([false, false, false])

    // Карточка 1 — сразу
    const t1 = setTimeout(() => {
      setTriggers([true, false, false])
    }, 100)

    // Карточка 2 — через 1.5с
    const t2 = setTimeout(() => {
      setTriggers([true, true, false])
    }, 1600)

    // Карточка 3 — ещё через 1.5с
    const t3 = setTimeout(() => {
      setTriggers([true, true, true])
    }, 3200)

    // Повтор цикла через ~15с (время на все анимации + пауза 3с)
    cycleRef.current = setTimeout(() => {
      startCycle()
    }, 18000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      if (cycleRef.current) clearTimeout(cycleRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isVisible) return
    const cleanupFn = startCycle()
    return cleanupFn
  }, [isVisible, startCycle])

  return { triggers, sectionRef }
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false)
  const { triggers, sectionRef } = useStaggeredAnimations()

  // Фиксированный хедер: backdrop-blur при скролле
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* ===== HEADER ===== */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ease-out ${
          scrolled ? 'bg-black/80 backdrop-blur-md border-dark-border' : 'bg-black/0 border-transparent'
        }`}
      >
        <Link to="/" className="text-lg font-bold font-mono tracking-wider">
          ANDIGO
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Войти
          </Link>
          <Link
            to="/register"
            className="btn-terminal text-sm px-5 py-2 tracking-wide uppercase"
          >
            Получить
          </Link>
        </div>
      </header>

      {/* ===== HERO (100vh) ===== */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        <AsciiRain />

        <div className="relative z-10 text-center px-4">
          {/* Логотип */}
          <h1 className="text-glow text-6xl md:text-8xl font-bold font-mono tracking-widest mb-6">
            ANDIGO
          </h1>

          {/* Подзаголовок — typing effect */}
          <p className="text-gray-400 text-lg md:text-xl font-mono mb-10 h-8">
            <TypingText text="Приватный доступ к интернету" speed={70} delay={800} />
          </p>

          {/* CTA */}
          <Link
            to="/register"
            className="btn-terminal inline-block px-10 py-4 text-sm tracking-[0.25em] uppercase font-medium"
          >
            Подключиться
          </Link>
        </div>

        {/* Scroll hint — стрелка вниз */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 opacity-30 animate-bounce-down">
          <span className="text-2xl font-mono">↓</span>
        </div>

        {/* Плавный градиент: hero → чёрный фон */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-black z-[1]" />
      </section>

      {/* ===== ФИЧИ (3 карточки с последовательными анимациями) ===== */}
      <FadeSection>
        <section ref={sectionRef} className="py-24 px-6 max-w-5xl mx-auto bg-noise">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Карточка 1: Шифрование — бинарный скрамбл (0/1) */}
            <div className="border border-dark-border p-6 hover:border-gray-500 transition-colors min-h-[260px]">
              <pre className="text-white/40 text-xs font-mono leading-tight mb-4 select-none whitespace-pre">
                {ASCII_LOCK}
              </pre>
              <h3 className="text-lg font-semibold mb-2">Шифрование трафика</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                <ScrambleText
                  text="Надёжное шифрование защищает ваши данные от перехвата. Современные протоколы обеспечивают безопасность соединения."
                  active={triggers[0]}
                  mode="binary"
                />
              </p>
            </div>

            {/* Карточка 2: Скорость — быстрая печать + пинг */}
            <div className="border border-dark-border p-6 hover:border-gray-500 transition-colors min-h-[260px]">
              <pre className="text-white/40 text-xs font-mono leading-tight mb-4 select-none whitespace-pre">
                {ASCII_BOLT}
              </pre>
              <h3 className="text-lg font-semibold mb-2">Высокая скорость</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                <SpeedDemo trigger={triggers[1]} />
              </p>
            </div>

            {/* Карточка 3: Серверы — смена языков */}
            <div className="border border-dark-border p-6 hover:border-gray-500 transition-colors min-h-[260px]">
              <pre className="text-white/40 text-xs font-mono leading-tight mb-4 select-none whitespace-pre">
                {ASCII_RACK}
              </pre>
              <h3 className="text-lg font-semibold mb-2">Серверы в нескольких странах</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                <MultiLangText trigger={triggers[2]} />
              </p>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ===== ТАРИФ (стиль терминала) ===== */}
      <FadeSection>
        <section className="py-24 px-6 bg-noise">
          <div className="max-w-md mx-auto border border-dark-border">
            {/* Заголовок терминала */}
            <div className="border-b border-dark-border px-6 py-3">
              <span className="text-gray-600 text-sm font-mono">$ cat /etc/pricing.conf</span>
            </div>

            <div className="p-8">
              <div className="text-5xl font-bold mb-1">
                249 <span className="text-lg text-gray-500 font-normal">₽/мес</span>
              </div>
              <p className="text-gray-500 text-sm mb-8">Полный доступ ко всем серверам</p>

              <div className="space-y-3 font-mono text-sm text-gray-300 mb-10">
                <div><span className="text-gray-600">&gt;</span> все серверы и локации</div>
                <div><span className="text-gray-600">&gt;</span> безлимитный трафик</div>
                <div><span className="text-gray-600">&gt;</span> до 3 устройств</div>
                <div><span className="text-gray-600">&gt;</span> поддержка 24/7</div>
              </div>

              <Link
                to="/register"
                className="btn-terminal block text-center py-3 text-sm tracking-[0.2em] uppercase font-medium"
              >
                Получить
              </Link>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ===== КАК ПОДКЛЮЧИТЬСЯ (3 шага) ===== */}
      <FadeSection>
        <section className="py-24 px-6 max-w-4xl mx-auto bg-noise">
          <h2 className="text-2xl font-bold text-center mb-16 font-mono tracking-wide">
            Как подключиться
          </h2>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              { num: '01', title: 'Регистрация', desc: 'Создайте аккаунт на сайте или через Telegram-бота' },
              { num: '02', title: 'Оплата', desc: 'Оплатите подписку — 249 ₽ в месяц' },
              { num: '03', title: 'Подключение', desc: 'Скачайте приложение и вставьте ключ' },
            ].map((step, i) => (
              <div key={step.num} className="text-center md:text-left flex flex-col">
                <div className="text-gray-600 font-mono text-sm mb-3">[{step.num}]</div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed flex-1">{step.desc}</p>
                {/* Пунктирная линия между шагами (только десктоп) — выровнены по одной линии */}
                {i < 2 && (
                  <div className="hidden md:block text-gray-700 font-mono text-xs mt-4 text-right">
                    · · · · · · &gt;
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </FadeSection>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-dark-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <span className="font-mono">© 2026 Andigo</span>
          <div className="flex gap-6">
            <a
              href="https://t.me/andigo_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Telegram
            </a>
            <a
              href="mailto:support@andigo.su"
              className="hover:text-white transition-colors"
            >
              Поддержка
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
