/**
 * Админка — Обзор. Статистика сервиса.
 */

import { useEffect, useState, useCallback } from 'react'
import { getAdminStats, getAdminUsers, getAdminPayments } from '../../api/client'

interface Stats {
  total_users: number
  active_subscriptions: number
  total_revenue: number
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, u, p] = await Promise.all([
        getAdminStats(),
        getAdminUsers(0, 5),
        getAdminPayments(undefined, 0, 5),
      ])
      setStats(s)
      setRecentUsers(u)
      setRecentPayments(p)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-green-400">&gt; admin/overview</h1>
        <button
          onClick={loadData}
          className="px-3 py-1 text-sm font-mono border border-dark-border text-gray-400 hover:text-white hover:border-green-400 transition-colors"
        >
          [↻ Обновить]
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 font-mono">Загрузка...</div>
      ) : (
        <>
          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-dark-card border border-dark-border p-4">
              <div className="text-gray-500 text-xs font-mono mb-1">Пользователей</div>
              <div className="text-2xl font-mono text-white">{stats?.total_users || 0}</div>
            </div>
            <div className="bg-dark-card border border-dark-border p-4">
              <div className="text-gray-500 text-xs font-mono mb-1">Активных подписок</div>
              <div className="text-2xl font-mono text-green-400">{stats?.active_subscriptions || 0}</div>
            </div>
            <div className="bg-dark-card border border-dark-border p-4">
              <div className="text-gray-500 text-xs font-mono mb-1">Выручка (₽)</div>
              <div className="text-2xl font-mono text-white">{stats?.total_revenue?.toFixed(2) || '0.00'}</div>
            </div>
          </div>

          {/* Последние пользователи */}
          <div className="mb-8">
            <h2 className="text-sm font-mono text-gray-400 mb-3">Последние регистрации</h2>
            <div className="bg-dark-card border border-dark-border overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="text-gray-500 border-b border-dark-border">
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Telegram</th>
                    <th className="text-left p-3">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u: any) => (
                    <tr key={u.id} className="border-b border-dark-border/50 text-gray-300">
                      <td className="p-3">{u.id}</td>
                      <td className="p-3">{u.email || '—'}</td>
                      <td className="p-3">{u.telegram_id || '—'}</td>
                      <td className="p-3">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                  {recentUsers.length === 0 && (
                    <tr><td colSpan={4} className="p-3 text-gray-600">Нет данных</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Последние платежи */}
          <div>
            <h2 className="text-sm font-mono text-gray-400 mb-3">Последние платежи</h2>
            <div className="bg-dark-card border border-dark-border overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="text-gray-500 border-b border-dark-border">
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Пользователь</th>
                    <th className="text-left p-3">Сумма</th>
                    <th className="text-left p-3">Статус</th>
                    <th className="text-left p-3">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p: any) => (
                    <tr key={p.id} className="border-b border-dark-border/50 text-gray-300">
                      <td className="p-3">{p.id}</td>
                      <td className="p-3">{p.user_email || `TG:${p.user_telegram_id}` || '—'}</td>
                      <td className="p-3">{p.amount} {p.currency}</td>
                      <td className="p-3">
                        <span className={
                          p.status === 'succeeded' ? 'text-green-400' :
                          p.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                        }>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3">{formatDate(p.created_at)}</td>
                    </tr>
                  ))}
                  {recentPayments.length === 0 && (
                    <tr><td colSpan={5} className="p-3 text-gray-600">Нет данных</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
