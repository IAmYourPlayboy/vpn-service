/**
 * Админка — Платежи. История всех платежей (только чтение).
 */

import { useEffect, useState, useCallback } from 'react'
import { getAdminPayments, deletePayment, getMe } from '../../api/client'

const STATUS_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'succeeded', label: 'Успешные' },
  { value: 'pending', label: 'Ожидание' },
  { value: 'cancelled', label: 'Отменённые' },
]

export default function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [isOwner, setIsOwner] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminPayments(statusFilter || undefined)
      setPayments(data)
      const me = await getMe()
      setIsOwner(me.role === 'owner')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { loadData() }, [loadData])

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот платёж?')) return
    try {
      await deletePayment(id)
      loadData()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Ошибка удаления')
    }
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU')

  const statusColor = (s: string) => {
    if (s === 'succeeded') return 'text-green-400'
    if (s === 'pending') return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-green-400">&gt; admin/payments</h1>
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
                <th className="text-left p-3">Сумма</th>
                <th className="text-left p-3">Валюта</th>
                <th className="text-left p-3">Статус</th>
                <th className="text-left p-3">ЮКасса ID</th>
                <th className="text-left p-3">Дата</th>
                <th className="text-left p-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b border-dark-border/50 text-gray-300">
                  <td className="p-3">{p.id}</td>
                  <td className="p-3">{p.user_email || `TG:${p.user_telegram_id}` || '—'}</td>
                  <td className="p-3">{p.amount}</td>
                  <td className="p-3">{p.currency}</td>
                  <td className="p-3">
                    <span className={statusColor(p.status)}>{p.status}</span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">{p.yokassa_payment_id || '—'}</td>
                  <td className="p-3">{formatDate(p.created_at)}</td>
                  <td className="p-3">
                    {isOwner && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-600 hover:text-red-500 text-xs font-bold"
                      >
                        [Удалить]
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={8} className="p-3 text-gray-600">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600 font-mono">
        Показано: {payments.length}
      </div>
    </div>
  )
}
