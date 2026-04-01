/**
 * Страница подписки — покупка, продление, история.
 */

import { useEffect, useState } from 'react'
import { createPayment, getPaymentHistory } from '../api/client'

interface Payment {
  id: number
  amount: number
  currency: string
  status: string
  created_at: string
}

export default function Subscription() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getPaymentHistory().then(setPayments).catch(() => {})
  }, [])

  async function handleBuy() {
    setLoading(true)
    try {
      const data = await createPayment(1) // plan_id = 1
      if (data.confirmation_url) {
        window.location.href = data.confirmation_url
      }
    } catch {
      alert('Ошибка создания платежа')
    } finally {
      setLoading(false)
    }
  }

  function statusLabel(status: string) {
    if (status === 'succeeded') return '✅ Оплачен'
    if (status === 'pending') return '⏳ Ожидание'
    return '❌ Отменён'
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Подписка</h1>

      {/* Кнопка покупки */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Тариф «Стандарт»</h2>
        <p className="text-gray-400 text-sm mb-4">
          Полный доступ ко всем серверам · Безлимитный трафик · 30 дней
        </p>
        <button
          onClick={handleBuy}
          disabled={loading}
          className="bg-accent hover:bg-accent/80 disabled:opacity-50 px-6 py-3 rounded-lg font-semibold transition-colors text-black"
        >
          {loading ? 'Создание платежа...' : '💳 Купить / Продлить'}
        </button>
      </div>

      {/* История платежей */}
      <h2 className="text-lg font-semibold mb-4">История платежей</h2>
      {payments.length === 0 ? (
        <p className="text-gray-500 text-sm">Платежей пока нет</p>
      ) : (
        <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-3 border-b border-dark-border/50 last:border-0"
            >
              <div>
                <div className="text-sm font-medium">{p.amount} {p.currency}</div>
                <div className="text-xs text-gray-500">
                  {new Date(p.created_at).toLocaleDateString('ru')}
                </div>
              </div>
              <div className="text-sm">{statusLabel(p.status)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
