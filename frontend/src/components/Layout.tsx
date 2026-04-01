/**
 * Layout — обёртка с навигацией (сайдбар на десктопе, таб-бар на мобилке).
 * Терминальный стиль: ASCII-иконки вместо emoji, символ ">" перед активным.
 */

import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getMe, logout } from '../api/client'

const navItems = [
  { to: '/dashboard', icon: '[~]', label: 'Главная' },
  { to: '/servers',   icon: '[>]', label: 'Серверы' },
  { to: '/subscription', icon: '[$]', label: 'Подписка' },
  { to: '/settings',  icon: '[*]', label: 'Настройки' },
]

export default function Layout() {
  const [role, setRole] = useState<string>('user')

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
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Таб-бар — мобилка */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-card border-t border-dark-border flex justify-around py-2 z-50">
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
      </nav>
    </div>
  )
}
