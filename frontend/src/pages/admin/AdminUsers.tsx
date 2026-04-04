/**
 * Админка — Пользователи. Таблица с ролями, Telegram по ID, кнопка "Подробнее".
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminUsers, banUser, unbanUser, createUser, getMe, deleteUser } from '../../api/client'

// Цвета бейджей ролей
const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  owner:   { bg: 'bg-purple-900/40', text: 'text-purple-400', label: 'owner' },
  support: { bg: 'bg-sky-900/40',    text: 'text-sky-400',    label: 'support' },
  user:    { bg: 'bg-gray-800/40',   text: 'text-gray-500',   label: 'user' },
}

export default function AdminUsers() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [myRole, setMyRole] = useState<string>('user')
  const [myId, setMyId] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'user', activate_subscription: false })
  const [createError, setCreateError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [data, me] = await Promise.all([getAdminUsers(0, 200), getMe()])
      setUsers(data)
      setMyRole(me.role)
      setMyId(me.id)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleBan = async (id: number) => {
    if (!confirm('Заблокировать пользователя?')) return
    await banUser(id)
    loadData()
  }

  const handleUnban = async (id: number) => {
    await unbanUser(id)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('ВНИМАНИЕ: Удалить пользователя навсегда?')) return
    if (!confirm('Это действие необратимо. Подписки и платежи тоже будут удалены. Продолжить?')) return
    try {
      await deleteUser(id)
      loadData()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Ошибка удаления')
    }
  }

  const handleCreate = async () => {
    setCreateError('')
    try {
      await createUser(createForm)
      setShowCreateModal(false)
      setCreateForm({ email: '', password: '', role: 'user', activate_subscription: false })
      loadData()
    } catch (e: any) {
      setCreateError(e.response?.data?.detail || 'Ошибка создания')
    }
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU')

  // Фильтрация по поиску
  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (u.nickname && u.nickname.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.telegram_id && String(u.telegram_id).includes(q)) ||
      String(u.id).includes(q)
    )
  })

  const isOwner = myRole === 'owner'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-green-400">&gt; admin/users</h1>
        <div className="flex gap-2">
          {isOwner && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1 text-sm font-mono border border-green-800 text-green-400 hover:bg-green-900/30 transition-colors"
            >
              [+ Добавить]
            </button>
          )}
          <button
            onClick={loadData}
            className="px-3 py-1 text-sm font-mono border border-dark-border text-gray-400 hover:text-white hover:border-green-400 transition-colors"
          >
            [↻ Обновить]
          </button>
        </div>
      </div>

      {/* Поиск */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск по имени, email, telegram_id, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 bg-dark-card border border-dark-border text-white px-3 py-2 text-sm font-mono placeholder-gray-600 focus:border-green-400 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="text-gray-500 font-mono">Загрузка...</div>
      ) : (
        <div className="bg-dark-card border border-dark-border overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-dark-border">
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Имя</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Telegram</th>
                <th className="text-left p-3">Статус</th>
                <th className="text-left p-3">Роль</th>
                <th className="text-left p-3">Создан</th>
                <th className="text-left p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const role = ROLE_STYLES[u.role] || ROLE_STYLES.user
                return (
                  <tr key={u.id} className="border-b border-dark-border/50 text-gray-300 hover:bg-white/[0.02]">
                    <td className="p-3 text-gray-600">{u.id}</td>
                    <td className="p-3 text-gray-400">{u.nickname || '—'}</td>
                    <td className="p-3">{u.email || '—'}</td>
                    <td className="p-3">
                      {u.telegram_id ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={`tg://user?id=${u.telegram_id}`}
                            className="text-sky-400 hover:text-sky-300 underline cursor-pointer"
                            title={`Открыть чат в Telegram (ID: ${u.telegram_id})`}
                          >
                            @{u.telegram_id}
                          </a>
                          <span className="text-gray-700 text-xs">/</span>
                          <button
                            onClick={() => window.open(`tg://user?id=${u.telegram_id}`, '_blank')}
                            className="text-green-400 hover:text-green-300 text-xs"
                            title="Написать в Telegram"
                          >
                            Написать
                          </button>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="p-3">
                      <span className={u.is_active ? 'text-green-400' : 'text-red-400'}>
                        {u.is_active ? '● Активен' : '○ Заблокирован'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`${role.bg} ${role.text} px-2 py-0.5 rounded text-xs`}>
                        {role.label}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{formatDate(u.created_at)}</td>
                    <td className="p-3 flex gap-2 items-center">
                      <button
                        onClick={() => navigate(`/admin/users/${u.id}`)}
                        className="text-green-400 hover:text-green-300 text-xs underline"
                      >
                        Подробнее →
                      </button>
                      {isOwner && u.role !== 'owner' && (
                        u.is_active ? (
                          <button
                            onClick={() => handleBan(u.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            [Бан]
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnban(u.id)}
                            className="text-green-400 hover:text-green-300 text-xs"
                          >
                            [Разбан]
                          </button>
                        )
                      )}
                      {isOwner && u.id !== myId && u.role !== 'owner' && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-red-600 hover:text-red-500 text-xs font-bold"
                          title="Удалить навсегда"
                        >
                          [Удалить]
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-3 text-gray-600">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600 font-mono">
        Всего: {filtered.length} из {users.length}
      </div>

      {/* Модальное окно создания пользователя */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-dark-card border border-dark-border p-6 w-full max-w-md font-mono">
            <h2 className="text-green-400 text-lg mb-4">&gt; Создать пользователя</h2>

            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full bg-black border border-dark-border text-white px-3 py-2 text-sm placeholder-gray-600 focus:border-green-400 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Пароль"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full bg-black border border-dark-border text-white px-3 py-2 text-sm placeholder-gray-600 focus:border-green-400 focus:outline-none"
              />
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full bg-black border border-dark-border text-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
              >
                <option value="user">user — Пользователь</option>
                <option value="support">support — Техподдержка</option>
                <option value="owner">owner — Владелец</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={createForm.activate_subscription}
                  onChange={(e) => setCreateForm({ ...createForm, activate_subscription: e.target.checked })}
                  className="accent-green-400"
                />
                Сразу активировать подписку
              </label>
            </div>

            {createError && <div className="text-red-400 text-sm mt-2">{createError}</div>}

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                className="flex-1 bg-green-900/30 border border-green-800 text-green-400 py-2 hover:bg-green-900/50 transition-colors text-sm"
              >
                Создать
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 border border-dark-border text-gray-400 py-2 hover:text-white transition-colors text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
