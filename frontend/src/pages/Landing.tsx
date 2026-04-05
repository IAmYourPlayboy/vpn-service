/**
 * Лендинг — "ASCII Cinema / Darknet Gateway".
 * Чёрный фон, Hex Matrix Rain (Canvas), терминальная эстетика.
 * Block/Shadow ASCII-иконки (█▓▒░), последовательные анимации карточек.
 */

import { Link } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import { isAuthenticated, getMe } from '../api/client'
import AsciiRain from '../components/AsciiRain'
import TypingText from '../components/TypingText'
import ScrambleText from '../components/ScrambleText'
import SpeedDemo from '../components/SpeedDemo'
import MultiLangText from '../components/MultiLangText'
import ThemeToggle from '../components/ThemeToggle'

interface AuthUser {
  nickname: string | null
  email: string | null
  has_active_subscription: boolean
}

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

    // Карточка 1 — через 4 сек после появления секции
    const t1 = setTimeout(() => {
      setTriggers([true, false, false])
    }, 4000)

    // Карточка 2 — через 1.5с после первой
    const t2 = setTimeout(() => {
      setTriggers([true, true, false])
    }, 5500)

    // Карточка 3 — ещё через 1.5с
    const t3 = setTimeout(() => {
      setTriggers([true, true, true])
    }, 7000)

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
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const { triggers, sectionRef } = useStaggeredAnimations()

  // Проверяем авторизацию — без вызова logout при ошибке
  useEffect(() => {
    if (isAuthenticated()) {
      getMe()
        .then((u) => setAuthUser({
          nickname: u.nickname,
          email: u.email,
          has_active_subscription: u.has_active_subscription,
        }))
        .catch(() => {
          // Токен невалидный — просто не показываем авторизованный UI
          setAuthUser(null)
        })
    }
  }, [])

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
          {authUser ? (
            <Link
              to="/dashboard"
              className="text-sm text-white hover:text-gray-300 transition-colors font-mono"
            >
              {authUser.nickname || authUser.email || 'Личный кабинет'}
            </Link>
          ) : (
            <>
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
            </>
          )}
          <ThemeToggle />
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
            <TypingText text="Сервис защищённого доступа к интернету · WireGuard · OpenVPN" speed={70} delay={800} />
          </p>

          {/* CTA */}
          {authUser?.has_active_subscription ? (
            <Link
              to="/dashboard"
              className="inline-block px-10 py-4 text-sm tracking-[0.25em] uppercase font-medium border-2 border-green-400 text-green-400 hover:bg-green-400/10 transition-colors"
            >
              Вы подключены
            </Link>
          ) : (
            <Link
              to={authUser ? '/subscription' : '/register'}
              className="btn-terminal inline-block px-10 py-4 text-sm tracking-[0.25em] uppercase font-medium"
            >
              Подключиться
            </Link>
          )}
        </div>

        {/* Scroll hint — стрелка вниз */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 opacity-30 animate-bounce-down">
          <span className="text-2xl font-mono">↓</span>
        </div>

        {/* Плавный градиент: hero → чёрный фон */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-black z-[1]" />
      </section>

      {/* ===== ОПИСАНИЕ УСЛУГИ (для модерации Robokassa и ясности пользователям) ===== */}
      <FadeSection>
        <section className="py-16 px-6 max-w-3xl mx-auto bg-noise">
          <h2 className="text-xl font-bold mb-6 font-mono text-green-400">
            $ cat /docs/services.json
          </h2>
          <div className="text-gray-400 text-sm leading-relaxed space-y-4 font-mono">
            <p className="text-white font-semibold">
              Andigo предоставляет услугу по обеспечению защищённого доступа к сети Интернет.
            </p>
            <p>
              <span className="text-green-400">{`>`}</span> Пользователь получает доступ к серверам защищённого соединения
              (WireGuard, OpenVPN) в нескольких странах. Весь трафик между устройством пользователя
              и сервером шифруется — данные не могут быть перехвачены третьими лицами при использовании
              публичных Wi-Fi-сетей или других незащищённых соединений.
            </p>
            <p>
              <span className="text-green-400">{`>`}</span> <span className="text-white">Подписка «Стандарт» — 249 ₽/мес (30 дней).</span> Стоимость фиксирована
              на весь период действия подписки. Оплата производится онлайн банковской картой,
              через СБП или криптовалютой. После оплаты пользователь получает ссылку для импорта
              ключа подключения в любое VPN-приложение.
            </p>
            <p>
              <span className="text-green-400">{`>`}</span> <span className="text-white">Входит в подписку:</span> доступ ко всем серверам и локациям,
              безлимитный трафик, подключение до 3 устройств одновременно, техническая поддержка
              по email и Telegram. Автопродление — подписка автоматически продлевается каждый месяц.
              Отключение — в любой момент в личном кабинете.
            </p>
            <p>
              <span className="text-green-400">{`>`}</span> <span className="text-white">Возврат средств:</span> возможен в течение 14 дней при неиспользованной
              подписке. Подробнее — на странице <Link to="/offer" className="text-green-400 underline">оферты</Link>.
            </p>
          </div>
        </section>
      </FadeSection>

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
              <div className="text-gray-500 text-sm leading-relaxed h-auto md:h-[4.5rem] md:overflow-hidden">
                <ScrambleText
                  text="Надёжное шифрование защищает ваши данные от перехвата. Современные протоколы обеспечивают безопасность соединения."
                  active={triggers[0]}
                  mode="binary"
                />
              </div>
            </div>

            {/* Карточка 2: Скорость — быстрая печать + пинг */}
            <div className="border border-dark-border p-6 hover:border-gray-500 transition-colors min-h-[260px]">
              <pre className="text-white/40 text-xs font-mono leading-tight mb-4 select-none whitespace-pre">
                {ASCII_BOLT}
              </pre>
              <h3 className="text-lg font-semibold mb-2">Высокая скорость</h3>
              <div className="text-gray-500 text-sm leading-relaxed h-auto md:h-[4.5rem] md:overflow-hidden">
                <SpeedDemo trigger={triggers[1]} />
              </div>
            </div>

            {/* Карточка 3: Серверы — смена языков */}
            <div className="border border-dark-border p-6 hover:border-gray-500 transition-colors min-h-[260px]">
              <pre className="text-white/40 text-xs font-mono leading-tight mb-4 select-none whitespace-pre">
                {ASCII_RACK}
              </pre>
              <h3 className="text-lg font-semibold mb-2">Серверы в нескольких странах</h3>
              <div className="text-gray-500 text-sm leading-relaxed h-auto md:h-[4.5rem] md:overflow-hidden">
                <MultiLangText trigger={triggers[2]} />
              </div>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ===== ТАРИФ (стиль терминала) ===== */}
      <FadeSection>
        <section className="py-24 px-6 bg-noise">
          <div className="max-w-lg mx-auto border border-dark-border">
            {/* Заголовок терминала */}
            <div className="border-b border-dark-border px-6 py-3">
              <span className="text-gray-600 text-sm font-mono">$ cat /etc/pricing.conf</span>
            </div>

            <div className="p-8">
              <div className="text-5xl font-bold mb-1">
                249 <span className="text-lg text-gray-500 font-normal">₽/мес</span>
              </div>
              <p className="text-gray-500 text-sm mb-6">Тариф «Стандарт» · срок подписки 30 дней</p>

              <div className="space-y-2 font-mono text-sm text-gray-300 mb-6">
                <div><span className="text-gray-600">&gt;</span> доступ ко всем серверам и локациям</div>
                <div><span className="text-gray-600">&gt;</span> безлимитный трафик</div>
                <div><span className="text-gray-600">&gt;</span> подключение до 3 устройств одновременно</div>
                <div><span className="text-gray-600">&gt;</span> протоколы WireGuard и OpenVPN</div>
                <div><span className="text-gray-600">&gt;</span> техническая поддержка по email и Telegram</div>
                <div><span className="text-gray-600">&gt;</span> автопродление с отключением в любой момент</div>
              </div>

              {/* Способы оплаты */}
              <div className="mb-6 p-3 border border-dark-border bg-dark-card">
                <p className="text-gray-600 text-xs font-mono mb-2">Способы оплаты:</p>
                <p className="text-gray-400 text-xs font-mono">
                  [x] Банк. карты РФ &nbsp; [x] СБП &nbsp; [x] Криптовалюта (USDT, BTC, ETH)
                </p>
              </div>

              {/* Условия возврата */}
              <p className="text-gray-600 text-xs font-mono mb-6">
                Возврат средств: до 14 дней при неиспользованной подписке. Подробнее в оферте.
              </p>

              {authUser?.has_active_subscription ? (
                <div className="block text-center py-3 text-sm tracking-[0.2em] uppercase font-medium border-2 border-green-400 text-green-400">
                  Вы подключены
                </div>
              ) : (
                <Link
                  to={authUser ? '/subscription' : '/register'}
                  className="btn-terminal block text-center py-3 text-sm tracking-[0.2em] uppercase font-medium"
                >
                  {authUser ? 'Оформить подписку' : 'Получить'}
                </Link>
              )}
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

      {/* ===== ДОКУМЕНТЫ (видимые кнопки для модерации Robokassa) ===== */}
      <FadeSection>
        <section className="py-12 px-6 bg-noise">
          <div className="max-w-lg mx-auto">
            <h2 className="text-sm font-mono text-gray-600 mb-4 text-center">
              $ ls /docs/
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link
                to="/offer"
                className="border border-dark-border p-4 text-center hover:border-green-400 transition-colors group"
              >
                <div className="text-green-400 font-bold font-mono text-sm mb-1 group-hover:underline">
                  [offer.txt]
                </div>
                <div className="text-gray-500 text-xs font-mono">
                  Публичная оферта
                </div>
              </Link>
              <Link
                to="/privacy"
                className="border border-dark-border p-4 text-center hover:border-green-400 transition-colors group"
              >
                <div className="text-green-400 font-bold font-mono text-sm mb-1 group-hover:underline">
                  [privacy.txt]
                </div>
                <div className="text-gray-500 text-xs font-mono">
                  Конфиденциальность (152-ФЗ)
                </div>
              </Link>
              <Link
                to="/terms"
                className="border border-dark-border p-4 text-center hover:border-green-400 transition-colors group"
              >
                <div className="text-green-400 font-bold font-mono text-sm mb-1 group-hover:underline">
                  [terms.txt]
                </div>
                <div className="text-gray-500 text-xs font-mono">
                  Пользовательское соглашение
                </div>
              </Link>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-dark-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div>
            <span className="font-mono">© 2026 Andigo · Самозанятый · ИНН 682805907931</span>
          </div>
          <div className="flex flex-wrap gap-4 md:gap-6">
            <a href="tel:+79805382648" className="hover:text-white transition-colors">
              +7 (980) 538-26-48
            </a>
            <Link to="/offer" className="hover:text-white transition-colors">Оферта</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Конфиденциальность</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Соглашение</Link>
            <a
              href="https://t.me/ANDIGO_VpnBot"
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
