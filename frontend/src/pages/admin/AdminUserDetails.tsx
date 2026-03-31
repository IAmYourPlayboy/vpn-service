/**
 * Админка — Подробнее о пользователе.
 * Вкладки: VPN, Подписка, Платежи, Действия.
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getUserDetails, toggleVpn, reissueKey, resetPassword,
  banUser, unbanUser, changeRole, getMe,
} from '../../api/client'

const TABS = ['VPN', 'Подписка', 'Платежи', 'Действия'] as const
type Tab = typeof TABS[number]

// Форматирование трафика
function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '0 Б'
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`
}

export default function AdminUserDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('VPN')
  const [myRole, setMyRole] = useState<string>('user')
  const [actionResult, setActionResult] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [data, me] = await Promise.all([getUserDetails(Number(id)), getMe()])
      setUser(data)
      setMyRole(me.role)
    } catch (e: any) {
      console.error(e)
      if (e.response?.status === 404) navigate('/admin/users')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { loadData() }, [loadData])

  const showAction = (msg: string) => {
    setActionResult(msg)
    setTimeout(() => setActionResult(''), 5000)
  }

  const handleToggleVpn = async () => {
    try {
      const res = await toggleVpn(Number(id))
      showAction(res.detail)
      loadData()
    } catch (e: any) {
      showAction(`Ошибка: ${e.response?.data?.detail || e.message}`)
    }
  }

  const handleReissueKey = async () => {
    if (!confirm('Перевыпустить ключ? Старый ключ перестанет работать.')) return
    try {
      const res = await reissueKey(Number(id))
      showAction(res.detail)
      loadData()
    } catch (e: any) {
      showAction(`Ошибка: ${e.response?.data?.detail || e.message}`)
    }
  }

  const handleResetPassword = async () => {
    if (!confirm('Сбросить пароль? Будет сгенерирован новый случайный пароль.')) return
    try {
      const res = await resetPassword(Number(id))
      setNewPassword(res.new_password)
      showAction('Пароль сброшен')
    } catch (e: any) {
      showAction(`Ошибка: ${e.response?.data?.detail || e.message}`)
    }
  }

  const handleBan = async () => {
    if (!confirm('Заблокировать пользователя?')) return
    try {
      await banUser(Number(id))
      showAction('Пользователь заблокирован')
      loadData()
    } catch (e: any) {
      showAction(`Ошибка: ${e.response?.data?.detail || e.message}`)
    }
  }

  const handleUnban = async () => {
    try {
      await unbanUser(Number(id))
      showAction('Пользователь разблокирован')
      loadData()
    } catch (e: any) {
      showAction(`Ошибка: ${e.response?.data?.detail || e.message}`)
    }
  }

  const handleChangeRole = async (newRole: string) => {
    if (!confirm(`Изменить роль на "${newRole}"?`)) return
    try {
      const res = await changeRole(Number(id), newRole)
      showAction(res.detail)
      loadData()
    } catch (e: any) {
      showAction(`Ошибка: ${e.response?.data?.detail || e.message}`)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('ru-RU')
  }

  const isOwner = myRole === 'owner'

  if (loading) return <div className="text-gray-500 font-mono">Загрузка...</div>
  if (!user) return <div className="text-red-400 font-mono">Пользователь не найден</div>

  const roleStyles: Record<string, string> = {
    owner: 'bg-purple-900/40 text-purple-400',
    support: 'bg-sky-900/40 text-sky-400',
    user: 'bg-gray-800/40 text-gray-500',
  }

  return (
    <div>
      {/* Шапка */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate('/admin/users')}
            className="text-gray-500 hover:text-green-400 font-mono text-sm mb-2 block"
          >
            ← Назад к списку
          </button>
          <h1 className="text-xl font-mono text-white">
            {user.email || `Telegram: ${user.telegram_id}`}
          </h1>
          <div className="text-gray-500 font-mono text-xs mt-1">
            ID: {user.id}
            {user.telegram_id && (
              <> &nbsp;|&nbsp; TG: <a href={`tg://user?id=${user.telegram_id}`} className="text-sky-400 underline">@{user.telegram_id}</a></>
            )}
            &nbsp;|&nbsp; Регистрация: {formatDate(user.created_at)}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <span className={user.is_active ? 'text-green-400' : 'text-red-400'}>
            {user.is_active ? '● Активен' : '○ Заблокирован'}
          </span>
          <span className={`${roleStyles[user.role] || roleStyles.user} px-2 py-0.5 rounded text-xs font-mono`}>
            {user.role}
          </span>
        </div>
      </div>

      {/* Уведомление о действии */}
      {actionResult && (
        <div className="bg-green-900/20 border border-green-800 text-green-400 px-4 py-2 mb-4 font-mono text-sm">
          {actionResult}
        </div>
      )}

      {/* Новый пароль (показывается один раз) */}
      {newPassword && (
        <div className="bg-yellow-900/20 border border-yellow-800 text-yellow-400 px-4 py-2 mb-4 font-mono text-sm">
          Новый пароль: <code className="bg-black px-2 py-0.5 text-white select-all">{newPassword}</code>
          <button onClick={() => setNewPassword('')} className="ml-4 text-gray-500 hover:text-white">[✕ Закрыть]</button>
        </div>
      )}

      {/* Вкладки */}
      <div className="flex border-b border-dark-border mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-sm transition-colors ${
              tab === t
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      <div className="bg-dark-card border border-dark-border p-4">
        {tab === 'VPN' && <TabVPN user={user} />}
        {tab === 'Подписка' && <TabSubscription user={user} />}
        {tab === 'Платежи' && <TabPayments user={user} />}
        {tab === 'Действия' && (
          <TabActions
            user={user}
            isOwner={isOwner}
            onToggleVpn={handleToggleVpn}
            onReissueKey={handleReissueKey}
            onResetPassword={handleResetPassword}
            onBan={handleBan}
            onUnban={handleUnban}
            onChangeRole={handleChangeRole}
          />
        )}
      </div>
    </div>
  )
}


// ============================================================
//  Вкладка VPN
// ============================================================

function TabVPN({ user }: { user: any }) {
  const hasVpn = !!user.vpn_username

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Статус */}
        <div className="bg-black border border-dark-border rounded p-4">
          <div className="text-gray-500 text-xs uppercase mb-2 font-mono">Статус VPN</div>
          {hasVpn ? (
            <>
              <div className={`font-mono ${user.vpn_status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                {user.vpn_status === 'active' ? '● Подключён' : user.vpn_status === 'disabled' ? '○ Приостановлен' : `● ${user.vpn_status || 'Неизвестно'}`}
              </div>
              <div className="text-gray-600 text-xs mt-1 font-mono">Marzban: {user.vpn_username}</div>
            </>
          ) : (
            <div className="text-gray-600 font-mono">Нет активной подписки</div>
          )}
        </div>

        {/* Трафик */}
        <div className="bg-black border border-dark-border rounded p-4">
          <div className="text-gray-500 text-xs uppercase mb-2 font-mono">Трафик</div>
          <div className="text-white font-mono">
            {formatBytes(user.used_traffic_bytes)}
            <span className="text-gray-600"> / {user.data_limit_bytes ? formatBytes(user.data_limit_bytes) : 'безлимит'}</span>
          </div>
          <div className="text-gray-600 text-xs mt-1 font-mono">Протокол: VLESS + Reality</div>
        </div>
      </div>

      {/* Subscription link */}
      {user.subscription_url && (
        <div className="bg-black border border-dark-border rounded p-4">
          <div className="text-gray-500 text-xs uppercase mb-2 font-mono">Ключ подписки</div>
          <div className="flex gap-2 items-center">
            <code className="bg-gray-900 border border-gray-800 px-3 py-1.5 rounded flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-cyan-300 text-xs font-mono">
              {user.subscription_url}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(user.subscription_url)}
              className="bg-gray-800 border border-gray-700 text-white px-3 py-1.5 rounded text-xs font-mono hover:bg-gray-700"
            >
              Копировать
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


// ============================================================
//  Вкладка Подписка
// ============================================================

function TabSubscription({ user }: { user: any }) {
  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('ru-RU')
  }

  if (!user.subscriptions || user.subscriptions.length === 0) {
    return <div className="text-gray-600 font-mono">Нет подписок</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="text-gray-500 border-b border-dark-border">
            <th className="text-left p-2">ID</th>
            <th className="text-left p-2">Тариф</th>
            <th className="text-left p-2">Статус</th>
            <th className="text-left p-2">Начало</th>
            <th className="text-left p-2">Окончание</th>
            <th className="text-left p-2">Авто-продление</th>
          </tr>
        </thead>
        <tbody>
          {user.subscriptions.map((s: any) => (
            <tr key={s.id} className="border-b border-dark-border/50 text-gray-300">
              <td className="p-2 text-gray-600">{s.id}</td>
              <td className="p-2">{s.plan_name || '—'}</td>
              <td className="p-2">
                <span className={
                  s.status === 'active' ? 'text-green-400' :
                  s.status === 'expired' ? 'text-yellow-400' : 'text-red-400'
                }>
                  {s.status}
                </span>
              </td>
              <td className="p-2 text-gray-500">{formatDate(s.started_at)}</td>
              <td className="p-2 text-gray-500">{formatDate(s.expires_at)}</td>
              <td className="p-2">{s.auto_renew ? '✓ Да' : '✕ Нет'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


// ============================================================
//  Вкладка Платежи
// ============================================================

function TabPayments({ user }: { user: any }) {
  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('ru-RU')
  }

  if (!user.payments || user.payments.length === 0) {
    return <div className="text-gray-600 font-mono">Нет платежей</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono">
        <thead>
          <tr className="text-gray-500 border-b border-dark-border">
            <th className="text-left p-2">Дата</th>
            <th className="text-left p-2">Сумма</th>
            <th className="text-left p-2">Статус</th>
          </tr>
        </thead>
        <tbody>
          {user.payments.map((p: any) => (
            <tr key={p.id} className="border-b border-dark-border/50 text-gray-300">
              <td className="p-2 text-gray-400">{formatDate(p.created_at)}</td>
              <td className="p-2 text-white">{p.amount} {p.currency}</td>
              <td className="p-2">
                <span className={
                  p.status === 'succeeded' ? 'text-green-400' :
                  p.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                }>
                  {p.status === 'succeeded' ? '✓ Успешно' :
                   p.status === 'pending' ? '◐ Ожидание' : '✕ Отменён'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


// ============================================================
//  Вкладка Действия
// ============================================================

interface ActionsProps {
  user: any
  isOwner: boolean
  onToggleVpn: () => void
  onReissueKey: () => void
  onResetPassword: () => void
  onBan: () => void
  onUnban: () => void
  onChangeRole: (role: string) => void
}

function TabActions({ user, isOwner, onToggleVpn, onReissueKey, onResetPassword, onBan, onUnban, onChangeRole }: ActionsProps) {
  const hasVpn = !!user.vpn_username

  return (
    <div className="space-y-4">
      {/* VPN-управление (staff) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={onToggleVpn}
          disabled={!hasVpn}
          className="bg-green-900/20 border border-green-800 text-green-400 p-3 rounded text-left font-mono hover:bg-green-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <div className="text-sm">{user.vpn_status === 'active' ? '⏸ Приостановить VPN' : '▶ Включить VPN'}</div>
          <div className="text-gray-600 text-xs mt-1">Временно отключить/включить доступ</div>
        </button>

        <button
          onClick={onReissueKey}
          disabled={!hasVpn}
          className="bg-red-900/20 border border-red-800 text-red-400 p-3 rounded text-left font-mono hover:bg-red-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <div className="text-sm">🔑 Перевыпустить ключ</div>
          <div className="text-gray-600 text-xs mt-1">Новый ключ, старый — мёртв</div>
        </button>

        <button
          onClick={onResetPassword}
          className="bg-indigo-900/20 border border-indigo-800 text-indigo-400 p-3 rounded text-left font-mono hover:bg-indigo-900/30 transition-colors"
        >
          <div className="text-sm">🔒 Сбросить пароль</div>
          <div className="text-gray-600 text-xs mt-1">Новый случайный пароль</div>
        </button>

        {/* Изменить роль (только owner) */}
        {isOwner && user.role !== 'owner' && (
          <div className="bg-gray-900/20 border border-gray-700 p-3 rounded font-mono">
            <div className="text-sm text-gray-400 mb-2">👤 Изменить роль</div>
            <div className="flex gap-2">
              {['user', 'support', 'owner'].filter(r => r !== user.role).map((r) => (
                <button
                  key={r}
                  onClick={() => onChangeRole(r)}
                  className="px-3 py-1 text-xs border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors rounded"
                >
                  → {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Бан/разбан (только owner) */}
      {isOwner && user.role !== 'owner' && (
        <div className="pt-3 border-t border-dark-border">
          {user.is_active ? (
            <button
              onClick={onBan}
              className="w-full bg-red-900/30 border border-red-800 text-red-400 p-3 rounded font-mono hover:bg-red-900/50 transition-colors"
            >
              ⛔ Заблокировать пользователя
            </button>
          ) : (
            <button
              onClick={onUnban}
              className="w-full bg-green-900/30 border border-green-800 text-green-400 p-3 rounded font-mono hover:bg-green-900/50 transition-colors"
            >
              ✓ Разблокировать пользователя
            </button>
          )}
        </div>
      )}
    </div>
  )
}
