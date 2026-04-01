/**
 * AdminLayout — обёртка с навигацией для админ-панели.
 * Терминальный стиль, отдельный от пользовательского Layout.
 */

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getMe, logout } from '../api/client'

// Все пункты меню, ownerOnly отмечает доступ только для owner
const allNavItems = [
  { to: '/admin',              icon: '[~]', label: 'Обзор',        end: true,  ownerOnly: false },
  { to: '/admin/users',        icon: '[U]', label: 'Пользователи', end: false, ownerOnly: false },
  { to: '/admin/subscriptions', icon: '[S]', label: 'Подписки',    end: false, ownerOnly: false },
  { to: '/admin/payments',     icon: '[P]', label: 'Платежи',      end: false, ownerOnly: false },
  { to: '/admin/servers',      icon: '[>]', label: 'Серверы',      end: false, ownerOnly: true },
  { to: '/admin/plans',        icon: '[$]', label: 'Тарифы',       end: false, ownerOnly: true },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [email, setEmail] = useState<string>('')
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    getMe().then((u) => {
      if (!['owner', 'support'].includes(u.role)) {
        navigate('/dashboard', { replace: true })
        return
      }
      setRole(u.role)
      setEmail(u.email || `TG:${u.telegram_id}`)
    }).catch(() => navigate('/login', { replace: true }))
  }, [navigate])

  // Фильтруем пункты меню по роли
  const navItems = allNavItems.filter((item) => !item.ownerOnly || role === 'owner')

  return (
    <div className="min-h-screen bg-dark flex flex-col md:flex-row">
      {/* Сайдбар — десктоп */}
      <aside className="hidden md:flex flex-col w-56 bg-dark-card border-r border-dark-border p-4">
        <div className="text-xl font-bold mb-2 font-mono tracking-wider text-green-400">
          {role === 'support' ? 'SUPPORT' : 'ADMIN'}
        </div>
        <div className="text-xs text-gray-600 font-mono mb-6 truncate">{email}</div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors ${
                  isActive
                    ? 'bg-green-400/10 text-green-400'
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
        </nav>
        <NavLink
          to="/dashboard"
          className="text-sm text-gray-600 hover:text-white mt-4 text-left px-3 py-2 font-mono transition-colors"
        >
          <span className="text-white/30 text-xs">[←]</span> На сайт
        </NavLink>
        <button
          onClick={logout}
          className="text-sm text-gray-600 hover:text-red-400 mt-1 text-left px-3 py-2 font-mono transition-colors"
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
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center text-[10px] py-1 px-2 font-mono ${
                isActive ? 'text-green-400' : 'text-gray-600'
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
