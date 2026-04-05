/**
 * Layout — обёртка с навигацией (сайдбар на десктопе, таб-бар на мобилке).
 * Терминальный стиль: ASCII-иконки вместо emoji, символ ">" перед активным.
 * Мобильный таб-бар: elastic overscroll эффект (Samsung-like rubber band).
 */

import { NavLink, Outlet, Link } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { getMe, logout } from '../api/client'

const navItems = [
  { to: '/dashboard', icon: '[~]', label: 'Главная' },
  { to: '/servers',   icon: '[>]', label: 'Серверы' },
  { to: '/subscription', icon: '[$]', label: 'Подписка' },
  { to: '/settings',  icon: '[*]', label: 'Настройки' },
]

/**
 * Хук для elastic overscroll эффекта на мобильном таб-баре.
 * При горизонтальном свайпе за край — тянется и пружинит обратно.
 */
function useElasticOverscroll() {
  const ref = useRef<HTMLElement>(null)
  const startX = useRef(0)
  const currentOffset = useRef(0)
  const isDragging = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX
    isDragging.current = true
    const el = ref.current
    if (el) el.style.transition = 'none'
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || !ref.current) return
    const deltaX = e.touches[0].clientX - startX.current
    // Коэффициент затухания — чем дальше тянешь, тем сильнее сопротивление
    const resistance = 0.3
    const offset = deltaX * resistance
    // Ограничение: максимум 30px в каждую сторону
    const clamped = Math.max(-30, Math.min(30, offset))
    currentOffset.current = clamped
    ref.current.style.transform = `translateX(${clamped}px)`
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false
    if (!ref.current) return
    // Пружинный возврат
    ref.current.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    ref.current.style.transform = 'translateX(0px)'
    currentOffset.current = 0
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return ref
}

export default function Layout() {
  const [role, setRole] = useState<string>('user')
  const tabBarRef = useElasticOverscroll()

  useEffect(() => {
    getMe().then((u) => setRole(u.role)).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-dark flex flex-col md:flex-row">
      {/* Сайдбар — десктоп */}
      <aside className="hidden md:flex flex-col w-56 bg-dark-card border-r border-dark-border p-4">
        <div className="text-xl font-bold mb-8 font-mono tracking-wider">ANDIGO</div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="text-white/30 w-8 text-xs">{item.icon}</span>
                  <span>{isActive ? `> ${item.label}` : item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          {(role === 'owner' || role === 'support') && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span className="text-white/30 w-8 text-xs">[⚙]</span>
              <span>{role === 'owner' ? 'Админ панель' : 'Рабочая панель'}</span>
            </NavLink>
          )}
        </nav>
        <button
          onClick={logout}
          className="text-sm text-gray-600 hover:text-red-400 mt-4 text-left px-3 py-2 font-mono transition-colors"
        >
          <span className="text-white/30 text-xs">[x]</span> Выйти
        </button>
      </aside>

      {/* Контент */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Футер — внизу страницы для авторизованных пользователей */}
        <footer className="hidden md:flex border-t border-dark-border py-4 px-8 items-center justify-between text-xs text-gray-700 font-mono">
          <div>
            <span>© 2026 Andigo</span>
            <span className="ml-2">Самозанятый</span>
          </div>
          <div className="flex gap-4">
            <Link to="/offer" className="hover:text-gray-400 transition-colors">Оферта</Link>
            <Link to="/privacy" className="hover:text-gray-400 transition-colors">Конфиденциальность</Link>
            <Link to="/terms" className="hover:text-gray-400 transition-colors">Соглашение</Link>
          </div>
        </footer>
      </div>

      {/* Таб-бар — мобилка с elastic overscroll */}
      <nav
        ref={tabBarRef}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-card border-t border-dark-border flex justify-around py-2 z-50 will-change-transform"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center text-[10px] py-1 px-3 font-mono ${
                isActive ? 'text-white' : 'text-gray-600'
              }`
            }
          >
            <span className="text-xs mb-0.5">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
        {(role === 'owner' || role === 'support') && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex flex-col items-center text-[10px] py-1 px-3 font-mono ${
                isActive ? 'text-white' : 'text-gray-600'
              }`
            }
          >
            <span className="text-xs mb-0.5">[⚙]</span>
            <span>{role === 'owner' ? 'Админ' : 'Панель'}</span>
          </NavLink>
        )}
      </nav>
    </div>
  )
}
