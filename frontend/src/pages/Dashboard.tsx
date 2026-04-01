/**
 * Дашборд — терминальный стиль с виджетами.
 * Grid: 2 колонки на desktop, 1 на mobile.
 * Виджеты: статус подписки, быстрое подключение, серверы, уведомления.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMe, getVPNConfig, getServers } from '../api/client'
import TerminalCard from '../components/TerminalCard'

interface User {
  id: number
  email: string | null
  telegram_id: number | null
  nickname: string | null
  is_active: boolean
  role: string
}

interface VPNConfig {
  subscription_link: string
  qr_code_base64: string | null
}

interface Server {
  id: number
  name: string
  country: string
  country_code: string
  last_ping_ms: number | null
  ping_status: string
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [vpnConfig, setVpnConfig] = useState<VPNConfig | null>(null)
  const [servers, setServers] = useState<Server[]>([])
  const [noSub, setNoSub] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getMe().then(setUser).catch(() => {})
    getVPNConfig()
      .then(setVpnConfig)
      .catch((err) => {
        if (err.response?.status === 402) setNoSub(true)
      })
    getServers()
      .then((data) => setServers(data.slice(0, 3)))
      .catch(() => {})
  }, [])

  function copyConfig() {
    if (vpnConfig?.subscription_link) {
      navigator.clipboard.writeText(vpnConfig.subscription_link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Цвет пинга
  function pingColor(ms: number | null): string {
    if (ms === null) return 'text-red-400'
    if (ms <= 50) return 'text-green-400'
    if (ms <= 150) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Статус-индикатор
  function statusDot(status: string): string {
    if (status === 'online') return '●'
    if (status === 'checking') return '◌'
    return '○'
  }

  function statusColor(status: string): string {
    if (status === 'online') return 'text-green-400'
    if (status === 'checking') return 'text-yellow-400'
    return 'text-red-400'
  }

  const userName = user?.nickname || user?.email || 'пользователь'

  return (
    <div>
      {/* Приветствие в терминальном стиле */}
      <div className="mb-6 font-mono">
        <span className="text-white/40">$</span>{' '}
        <span className="text-white/70">whoami</span>
        <div className="text-white mt-1">
          {user ? userName : '...'}
        </div>
      </div>

      {/* Уведомление: нет подписки */}
      {noSub && (
        <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 mb-6 font-mono text-sm">
          <span className="text-red-400">⚠ Нет активной подписки.</span>{' '}
          <Link to="/subscription" className="text-white underline hover:no-underline">
            Оформить →
          </Link>
        </div>
      )}

      {/* Grid виджетов */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Виджет 1: Статус подписки */}
        <TerminalCard command="status">
          {noSub ? (
            <div className="text-gray-500">
              <div>Подписка: <span className="text-red-400">неактивна</span></div>
              <div className="mt-3">
                <Link
                  to="/subscription"
                  className="btn-terminal inline-block px-4 py-2 text-xs tracking-wide uppercase"
                >
                  Купить подписку
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-gray-300">
              <div>Подписка: <span className="text-green-400">активна</span></div>
              <div className="mt-2 text-gray-500 text-xs">
                {/* Прогресс-бар из блочных символов */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-white/40">
                    ▓▓▓▓▓▓▓▓▓▓▒▒▒░░
                  </span>
                  <span className="text-gray-500">67%</span>
                </div>
              </div>
            </div>
          )}
        </TerminalCard>

        {/* Виджет 2: Быстрое подключение */}
        <TerminalCard command="vpn --config">
          {vpnConfig ? (
            <div>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* QR-код */}
                {vpnConfig.qr_code_base64 && (
                  <div className="flex-shrink-0">
                    <img
                      src={`data:image/png;base64,${vpnConfig.qr_code_base64}`}
                      alt="QR-код VPN"
                      className="w-28 h-28"
                    />
                  </div>
                )}

                {/* Ссылка */}
                <div className="flex-1 min-w-0">
                  <div className="text-gray-500 text-xs mb-2">Ссылка подписки:</div>
                  <div className="bg-black border border-dark-border px-3 py-2 text-[11px] text-gray-400 break-all mb-3 max-h-16 overflow-auto">
                    {vpnConfig.subscription_link}
                  </div>
                  <button
                    onClick={copyConfig}
                    className="btn-terminal px-3 py-1.5 text-xs tracking-wide uppercase"
                  >
                    {copied ? '✓ скопировано' : 'копировать'}
                  </button>
                </div>
              </div>
            </div>
          ) : noSub ? (
            <div className="text-gray-600 text-xs">
              Недоступно без подписки
            </div>
          ) : (
            <div className="text-gray-600 text-xs">Загрузка...</div>
          )}
        </TerminalCard>

        {/* Виджет 3: Мини-статус серверов */}
        <TerminalCard command="ping --servers">
          {servers.length > 0 ? (
            <div className="space-y-2">
              {servers.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={statusColor(s.ping_status)}>
                      {statusDot(s.ping_status)}
                    </span>
                    <span className="text-gray-300">{s.name}</span>
                    <span className="text-gray-600">{s.country_code}</span>
                  </div>
                  <span className={pingColor(s.last_ping_ms)}>
                    {s.last_ping_ms !== null ? `${s.last_ping_ms}ms` : '—'}
                  </span>
                </div>
              ))}
              <div className="pt-1">
                <Link to="/servers" className="text-gray-500 text-xs hover:text-white transition-colors">
                  все серверы →
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-gray-600 text-xs">Загрузка...</div>
          )}
        </TerminalCard>

        {/* Виджет 4: Быстрая навигация */}
        <TerminalCard command="help">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-white/30">&gt;</span>
              <Link to="/servers" className="text-gray-400 hover:text-white transition-colors">
                Все серверы и пинги
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/30">&gt;</span>
              <Link to="/subscription" className="text-gray-400 hover:text-white transition-colors">
                Подписка и оплата
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/30">&gt;</span>
              <Link to="/settings" className="text-gray-400 hover:text-white transition-colors">
                Настройки профиля
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/30">&gt;</span>
              <a
                href="https://t.me/andigo_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Telegram-бот
              </a>
            </div>
          </div>
        </TerminalCard>
      </div>
    </div>
  )
}
