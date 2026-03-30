/**
 * Дашборд — главная страница личного кабинета.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMe, getVPNConfig } from '../api/client'

interface User {
  id: number
  email: string | null
  telegram_id: number | null
  is_active: boolean
  is_admin: boolean
}

interface VPNConfig {
  subscription_link: string
  qr_code_base64: string | null
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [vpnConfig, setVpnConfig] = useState<VPNConfig | null>(null)
  const [noSub, setNoSub] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getMe().then(setUser).catch(() => {})
    getVPNConfig()
      .then(setVpnConfig)
      .catch((err) => {
        if (err.response?.status === 402) setNoSub(true)
      })
  }, [])

  function copyConfig() {
    if (vpnConfig?.subscription_link) {
      navigator.clipboard.writeText(vpnConfig.subscription_link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {user ? `Привет, ${user.email || 'пользователь'}!` : 'Дашборд'}
      </h1>

      {/* Статус подписки */}
      {noSub ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Нет активной подписки</h2>
          <p className="text-gray-400 text-sm mb-4">
            Оформите подписку для доступа к VPN-серверам.
          </p>
          <Link
            to="/subscription"
            className="inline-block bg-accent hover:bg-accent/80 px-6 py-2 rounded-lg text-sm font-semibold"
          >
            Купить подписку
          </Link>
        </div>
      ) : vpnConfig ? (
        <>
          {/* Карточка подписки */}
          <div className="bg-gradient-to-br from-accent to-dark-card rounded-xl p-6 mb-6">
            <div className="text-sm opacity-70">Подписка</div>
            <div className="text-lg font-bold mt-1">Активна</div>
          </div>

          {/* Быстрое подключение */}
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Быстрое подключение</h2>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* QR-код */}
              {vpnConfig.qr_code_base64 && (
                <div className="flex-shrink-0">
                  <img
                    src={`data:image/png;base64,${vpnConfig.qr_code_base64}`}
                    alt="QR-код VPN"
                    className="w-40 h-40 rounded-lg"
                  />
                </div>
              )}

              {/* Конфиг */}
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-3">
                  Отсканируйте QR-код или скопируйте ссылку подписки:
                </p>
                <div className="bg-dark rounded-lg p-3 text-xs text-gray-300 break-all mb-3">
                  {vpnConfig.subscription_link}
                </div>
                <button
                  onClick={copyConfig}
                  className="bg-primary hover:bg-primary/80 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  {copied ? '✅ Скопировано!' : '📋 Скопировать'}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-gray-500">Загрузка...</div>
      )}
    </div>
  )
}
