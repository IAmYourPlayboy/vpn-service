/**
 * Админка — Подписки. Все подписки с фильтрами.
 */

import { useEffect, useState, useCallback } from 'react'
import { getAdminSubscriptions } from '../../api/client'

const STATUS_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'expired', label: 'Истёкшие' },
  { value: 'cancelled', label: 'Отменённые' },
]

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminSubscriptions(statusFilter || undefined)
      setSubs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { loadData() }, [loadData])

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU')

  const statusColor = (s: string) => {
    if (s === 'active') return 'text-green-400'
    if (s === 'expired') return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-green-400">&gt; admin/subscriptions</h1>
        <button
          onClick={loadData}
          className="px-3 py-1 text-sm font-mono border border-dark-border text-gray-400 hover:text-white hover:border-green-400 transition-colors"
        >
          [↻ Обновить]
        </button>
      </div>

      {/* Фильтр по статусу */}
      <div className="flex gap-2 mb-4">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1 text-xs font-mono border transition-colors ${
              statusFilter === opt.value
                ? 'border-green-400 text-green-400'
                : 'border-dark-border text-gray-500 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 font-mono">Загрузка...</div>
      ) : (
        <div className="bg-dark-card border border-dark-border overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-dark-border">
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Пользователь</th>
                <th className="text-left p-3">Тариф</th>
                <th className="text-left p-3">Marzban</th>
                <th className="text-left p-3">Статус</th>
                <th className="text-left p-3">Начало</th>
                <th className="text-left p-3">Истекает</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s: any) => (
                <tr key={s.id} className="border-b border-dark-border/50 text-gray-300">
                  <td className="p-3">{s.id}</td>
                  <td className="p-3">{s.user_email || `TG:${s.user_telegram_id}` || '—'}</td>
                  <td className="p-3">{s.plan_name}</td>
                  <td className="p-3 text-xs text-gray-500">{s.marzban_username}</td>
                  <td className="p-3">
                    <span className={statusColor(s.status)}>{s.status}</span>
                  </td>
                  <td className="p-3">{formatDate(s.started_at)}</td>
                  <td className="p-3">{formatDate(s.expires_at)}</td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr><td colSpan={7} className="p-3 text-gray-600">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600 font-mono">
        Показано: {subs.length}
      </div>
    </div>
  )
}
