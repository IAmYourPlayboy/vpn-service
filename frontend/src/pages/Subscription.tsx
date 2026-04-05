/**
 * Страница подписки — покупка, продление, история.
 * С выбором способа оплаты: крипто или карта/СБП.
 */

import { useEffect, useState } from 'react'
import { createPayment, getPaymentHistory } from '../api/client'

interface Payment {
  id: number
  amount: number
  currency: string
  provider: string
  status: string
  created_at: string
}

type Provider = 'cryptomus' | 'robokassa'

export default function Subscription() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<Provider>('cryptomus')

  useEffect(() => {
    getPaymentHistory().then(setPayments).catch(() => {})
  }, [])

  async function handleBuy() {
    setLoading(true)
    try {
      const data = await createPayment(1, selectedProvider)
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
    if (status === 'succeeded') return '[OK] Оплачен'
    if (status === 'pending') return '[..] Ожидание'
    return '[XX] Отменён'
  }

  function providerLabel(provider: string) {
    return provider === 'cryptomus' ? '[Крипто]' : provider === 'yookassa' ? '[ЮКасса]' : '[Карта]'
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

        {/* Выбор способа оплаты — ASCII radio-кнопки терминала */}
        <div className="mb-4 space-y-2">
          <label className="text-sm text-gray-400">Способ оплаты:</label>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setSelectedProvider('cryptomus')}
              className={`px-4 py-2 rounded-lg text-left font-mono text-sm border transition-colors ${
                selectedProvider === 'cryptomus'
                  ? 'border-green-400 text-green-400 bg-green-400/5'
                  : 'border-dark-border text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              {selectedProvider === 'cryptomus' ? '[x]' : '[ ]'} Криптовалюта (USDT, BTC, ETH)
            </button>
            <button
              onClick={() => setSelectedProvider('robokassa')}
              className={`px-4 py-2 rounded-lg text-left font-mono text-sm border transition-colors ${
                selectedProvider === 'robokassa'
                  ? 'border-green-400 text-green-400 bg-green-400/5'
                  : 'border-dark-border text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              {selectedProvider === 'robokassa' ? '[x]' : '[ ]'} Банковская карта / СБП
            </button>
          </div>
        </div>

        <button
          onClick={handleBuy}
          disabled={loading}
          className="bg-accent hover:bg-accent/80 disabled:opacity-50 px-6 py-3 rounded-lg font-semibold transition-colors text-black"
        >
          {loading ? 'Создание платежа...' : 'Оплатить 249 ₽ [→]'}
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
                  {' '}· {providerLabel(p.provider)}
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
