/**
 * Страница настроек профиля.
 * Редактирование nickname, привязка Telegram, информация об аккаунте.
 */

import { useEffect, useState } from 'react'
import { getMe, logout, updateProfile } from '../api/client'

interface User {
  id: number
  email: string | null
  telegram_id: number | null
  nickname: string | null
  is_active: boolean
  role: string
  created_at: string
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(null)
  const [nickname, setNickname] = useState('')
  const [editingNickname, setEditingNickname] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getMe().then((u) => {
      setUser(u)
      setNickname(u.nickname || '')
    }).catch(() => {})
  }, [])

  async function handleSaveNickname() {
    setSaving(true)
    try {
      const updated = await updateProfile({ nickname: nickname.trim() })
      setUser(updated)
      setEditingNickname(false)
    } catch {
      alert('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

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

        {/* Nickname — редактируемое поле */}
        <div className="flex justify-between items-center py-2 border-b border-dark-border/50">
          <span className="text-gray-400 text-sm">Имя</span>
          {editingNickname ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={50}
                placeholder="Ваш никнейм"
                className="bg-black border border-dark-border px-3 py-1 text-sm text-white font-mono focus:outline-none focus:border-white w-40"
              />
              <button
                onClick={handleSaveNickname}
                disabled={saving}
                className="text-green-400 text-sm hover:text-green-300 font-mono"
              >
                {saving ? '...' : '✓'}
              </button>
              <button
                onClick={() => {
                  setEditingNickname(false)
                  setNickname(user.nickname || '')
                }}
                className="text-gray-500 text-sm hover:text-white font-mono"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm">{user.nickname || 'Не задано'}</span>
              <button
                onClick={() => setEditingNickname(true)}
                className="text-green-400 text-xs hover:text-green-300 font-mono"
              >
                Изменить
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center py-2 border-b border-dark-border/50">
          <span className="text-gray-400 text-sm">Email</span>
          <span className="text-sm">{user.email || 'Не привязан'}</span>
        </div>

        {/* Telegram — привязка через бота */}
        <div className="flex justify-between items-center py-2 border-b border-dark-border/50">
          <span className="text-gray-400 text-sm">Telegram</span>
          <span className="text-sm">
            {user.telegram_id ? (
              `ID: ${user.telegram_id}`
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-white">Не привязан.</span>
                <a
                  href="https://t.me/andigo_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 transition-colors"
                >
                  Привязать
                </a>
              </span>
            )}
          </span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-dark-border/50">
          <span className="text-gray-400 text-sm">Регистрация</span>
          <span className="text-sm">{new Date(user.created_at).toLocaleDateString('ru')}</span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-gray-400 text-sm">Статус</span>
          <span className="text-sm">{user.is_active ? 'Активен' : 'Заблокирован'}</span>
        </div>
      </div>

      <button
        onClick={logout}
        className="mt-6 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
      >
        Выйти из аккаунта
      </button>
    </div>
  )
}
