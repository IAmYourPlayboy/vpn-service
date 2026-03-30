/**
 * Страница настроек профиля.
 */

import { useEffect, useState } from 'react'
import { getMe, logout } from '../api/client'

interface User {
  id: number
  email: string | null
  telegram_id: number | null
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    getMe().then(setUser).catch(() => {})
  }, [])

  if (!user) {
    return <div className="text-gray-500">Загрузка...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>

      <div className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-dark-border/50">
          <span className="text-gray-400 text-sm">ID</span>
          <span className="text-sm">#{user.id}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-dark-border/50">
          <span className="text-gray-400 text-sm">Email</span>
          <span className="text-sm">{user.email || 'Не привязан'}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-dark-border/50">
          <span className="text-gray-400 text-sm">Telegram</span>
          <span className="text-sm">
            {user.telegram_id ? `ID: ${user.telegram_id}` : 'Не привязан'}
          </span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-dark-border/50">
          <span className="text-gray-400 text-sm">Регистрация</span>
          <span className="text-sm">{new Date(user.created_at).toLocaleDateString('ru')}</span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-gray-400 text-sm">Статус</span>
          <span className="text-sm">{user.is_active ? '✅ Активен' : '🚫 Заблокирован'}</span>
        </div>
      </div>

      <button
        onClick={logout}
        className="mt-6 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
      >
        🚪 Выйти из аккаунта
      </button>
    </div>
  )
}
