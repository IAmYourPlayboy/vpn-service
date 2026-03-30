/**
 * Layout — обёртка с навигацией (сайдбар на десктопе, таб-бар на мобилке).
 */

import { NavLink, Outlet } from 'react-router-dom'
import { logout } from '../api/client'

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'Главная' },
  { to: '/servers', icon: '🌍', label: 'Серверы' },
  { to: '/subscription', icon: '💳', label: 'Подписка' },
  { to: '/settings', icon: '⚙️', label: 'Настройки' },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-dark flex flex-col md:flex-row">
      {/* Сайдбар — десктоп */}
      <aside className="hidden md:flex flex-col w-56 bg-dark-card border-r border-dark-border p-4">
        <div className="text-xl font-bold mb-8">Andigo</div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-400 mt-4 text-left px-3 py-2"
        >
          🚪 Выйти
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
              `flex flex-col items-center text-xs py-1 px-3 ${
                isActive ? 'text-primary' : 'text-gray-500'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
