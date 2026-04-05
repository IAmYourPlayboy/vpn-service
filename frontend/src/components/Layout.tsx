/**
 * Layout — обёртка с навигацией (сайдбар на десктопе, таб-бар на мобилке).
 * Терминальный стиль: ASCII-иконки, символ ">" перед активным.
 * Мобильный таб-бар: elastic overscroll эффект.
 */

import { NavLink, Outlet, Link } from 'react-router-dom'
import { useEffect, useState, useRef, useCallback } from 'react'
import { getMe, logout } from '../api/client'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { to: '/dashboard', icon: '[~]', label: 'Главная' },
  { to: '/servers',   icon: '[>]', label: 'Серверы' },
  { to: '/subscription', icon: '[$]', label: 'Подписка' },
  { to: '/settings',  icon: '[*]', label: 'Настройки' },
]

/**
 * Хук для elastic overscroll эффекта на мобильном таб-баре.
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
    const resistance = 0.3
    const offset = deltaX * resistance
    const clamped = Math.max(-30, Math.min(30, offset))
    currentOffset.current = clamped
    ref.current.style.transform = `translateX(${clamped}px)`
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false
    if (!ref.current) return
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
  const { theme, toggleTheme } = useTheme()
  const tabBarRef = useElasticOverscroll()

  // Обновляем цвет страницы при смене темы
  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#000000' : '#ffffff'
    return () => { document.body.style.backgroundColor = '' }
  }, [theme])

  useEffect(() => {
    getMe().then((u) => setRole(u.role)).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col md:flex-row"
         style={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }}>
      {/* Сайдбар — десктоп */}
      <aside className="hidden md:flex flex-col w-56 border-r p-4"
             style={{
               backgroundColor: theme === 'dark' ? '#0a0a0a' : '#f5f5f5',
               borderColor: theme === 'dark' ? '#222' : '#e0e0e0',
             }}>
        <div className="text-xl font-bold mb-8 font-mono tracking-wider"
             style={{ color: theme === 'dark' ? '#fff' : '#1a1a1a' }}>
          ANDIGO
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors ${
                  isActive
                    ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black')
                    : (theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-black hover:bg-black/5')
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)' }} className="w-8 text-xs">{item.icon}</span>
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
                    ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black')
                    : (theme === 'dark' ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-black hover:bg-black/5')
                }`
              }
            >
              <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)' }} className="w-8 text-xs">[A]</span>
              <span>{role === 'owner' ? 'Админ панель' : 'Рабочая панель'}</span>
            </NavLink>
          )}
        </nav>
        <div className="mt-4 pt-4 flex items-center justify-between px-3"
             style={{ borderTop: `1px solid ${theme === 'dark' ? '#222' : '#e0e0e0'}` }}>
          <button
            onClick={logout}
            className="text-sm font-mono transition-colors"
            style={{ color: theme === 'dark' ? 'rgba(150,150,150,0.6)' : 'rgba(0,0,0,0.4)' }}
          >
            <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)' }} className="text-xs">[x]</span> Выйти
          </button>
          <ThemeToggle />
        </div>
      </aside>

      {/* Контент */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Футер — десктоп */}
        <footer className="hidden md:flex border-t py-4 px-8 items-center justify-between text-xs font-mono"
                style={{
                  borderColor: theme === 'dark' ? '#222' : '#e0e0e0',
                  color: theme === 'dark' ? 'rgba(150,150,150,0.6)' : 'rgba(0,0,0,0.4)',
                }}>
          <div>
            <span>© 2026 Andigo</span>
            <span className="ml-2">Самозанятый</span>
          </div>
          <div className="flex gap-4">
            <Link to="/offer" className="hover:text-gray-400 transition-colors"
                  style={{ color: theme === 'dark' ? 'inherit' : 'inherit' }}>Оферта</Link>
            <Link to="/privacy" className="hover:text-gray-400 transition-colors">Конфиденциальность</Link>
            <Link to="/terms" className="hover:text-gray-400 transition-colors">Соглашение</Link>
          </div>
        </footer>
      </div>

      {/* Таб-бар — мобилка */}
      <nav
        ref={tabBarRef}
        className="md:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around py-2 z-50 will-change-transform"
        style={{
          backgroundColor: theme === 'dark' ? '#0a0a0a' : '#f5f5f5',
          borderTopColor: theme === 'dark' ? '#222' : '#e0e0e0',
        }}>
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
            <span className="text-xs mb-0.5">[A]</span>
            <span>{role === 'owner' ? 'Админ' : 'Панель'}</span>
          </NavLink>
        )}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center text-[10px] py-1 px-3 font-mono"
          style={{ color: theme === 'dark' ? 'rgba(150,150,150,0.6)' : 'rgba(0,0,0,0.4)' }}
        >
          <span className="text-xs mb-0.5">{theme === 'dark' ? '[L]' : '[D]'}</span>
          <span>Тема</span>
        </button>
      </nav>
    </div>
  )
}
