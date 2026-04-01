/**
 * Страница настроек профиля.
 * Редактирование nickname, смена email, привязка/перепривязка Telegram.
 */

import { useEffect, useState } from 'react'
import { getMe, logout, updateProfile, changeEmail, linkEmail, getTelegramLinkToken } from '../api/client'

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

  // Nickname
  const [nickname, setNickname] = useState('')
  const [editingNickname, setEditingNickname] = useState(false)
  const [savingNickname, setSavingNickname] = useState(false)

  // Email
  const [editingEmail, setEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Telegram
  const [linkingTelegram, setLinkingTelegram] = useState(false)

  useEffect(() => {
    getMe().then((u) => {
      setUser(u)
      setNickname(u.nickname || '')
    }).catch(() => {})
  }, [])

  // === Nickname ===
  async function handleSaveNickname() {
    setSavingNickname(true)
    try {
      const updated = await updateProfile({ nickname: nickname.trim() })
      setUser(updated)
      setEditingNickname(false)
    } catch {
      alert('Ошибка сохранения')
    } finally {
      setSavingNickname(false)
    }
  }

  // === Email ===
  async function handleSaveEmail() {
    setSavingEmail(true)
    setEmailError('')
    try {
      if (user?.email) {
        // Смена существующего email
        const updated = await changeEmail(newEmail.trim(), emailPassword)
        setUser(updated)
      } else {
        // Привязка нового email (аккаунт из Telegram)
        await linkEmail(newEmail.trim(), emailPassword)
        // Перезагружаем данные пользователя
        const updated = await getMe()
        setUser(updated)
      }
      setEditingEmail(false)
      setNewEmail('')
      setEmailPassword('')
    } catch (e: any) {
      setEmailError(e.response?.data?.detail || 'Ошибка')
    } finally {
      setSavingEmail(false)
    }
  }

  // === Telegram ===
  async function handleLinkTelegram() {
    setLinkingTelegram(true)
    try {
      const { link } = await getTelegramLinkToken()
      // Открываем deep link в новой вкладке
      window.open(link, '_blank')
    } catch {
      alert('Ошибка генерации ссылки')
    } finally {
      setLinkingTelegram(false)
    }
  }

  if (!user) {
    return <div className="text-gray-500">Загрузка...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>

      <div className="bg-dark-card border border-dark-border rounded-xl p-6 space-y-4">
        {/* ID */}
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
                disabled={savingNickname}
                className="text-green-400 text-sm hover:text-green-300 font-mono"
              >
                {savingNickname ? '...' : '✓'}
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

        {/* Email — редактируемое поле */}
        <div className="py-2 border-b border-dark-border/50">
          {editingEmail ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">
                  {user.email ? 'Новый email' : 'Привязать email'}
                </span>
                <button
                  onClick={() => {
                    setEditingEmail(false)
                    setNewEmail('')
                    setEmailPassword('')
                    setEmailError('')
                  }}
                  className="text-gray-500 text-sm hover:text-white font-mono"
                >
                  ✕
                </button>
              </div>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-black border border-dark-border px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-white"
              />
              <input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder={user.email ? 'Текущий пароль' : 'Придумайте пароль'}
                className="w-full bg-black border border-dark-border px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-white"
              />
              {emailError && (
                <div className="text-red-400 text-xs font-mono">{emailError}</div>
              )}
              <button
                onClick={handleSaveEmail}
                disabled={savingEmail || !newEmail.trim() || !emailPassword}
                className="bg-green-900/30 border border-green-800 text-green-400 px-4 py-1.5 text-sm font-mono hover:bg-green-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {savingEmail ? '...' : 'Сохранить'}
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Email</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">{user.email || 'Не привязан'}</span>
                <button
                  onClick={() => setEditingEmail(true)}
                  className="text-green-400 text-xs hover:text-green-300 font-mono"
                >
                  {user.email ? 'Изменить' : 'Привязать'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Telegram — привязка/перепривязка через бота */}
        <div className="flex justify-between items-center py-2 border-b border-dark-border/50">
          <span className="text-gray-400 text-sm">Telegram</span>
          <span className="text-sm">
            {user.telegram_id ? (
              <span className="flex items-center gap-2">
                <span className="text-white">ID: {user.telegram_id}</span>
                <button
                  onClick={handleLinkTelegram}
                  disabled={linkingTelegram}
                  className="text-green-400 text-xs hover:text-green-300 font-mono disabled:opacity-50"
                >
                  {linkingTelegram ? '...' : 'Перепривязать'}
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-white">Не привязан</span>
                <button
                  onClick={handleLinkTelegram}
                  disabled={linkingTelegram}
                  className="text-green-400 hover:text-green-300 transition-colors font-mono text-xs disabled:opacity-50"
                >
                  {linkingTelegram ? '...' : 'Привязать'}
                </button>
              </span>
            )}
          </span>
        </div>

        {/* Регистрация */}
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-400 text-sm">Регистрация</span>
          <span className="text-sm">{new Date(user.created_at).toLocaleDateString('ru')}</span>
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
