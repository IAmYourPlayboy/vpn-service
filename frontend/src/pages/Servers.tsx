/**
 * Страница серверов — список локаций с пингами (WebSocket).
 */

import { useEffect, useRef, useState } from 'react'
import { getServers } from '../api/client'

interface Server {
  id: number
  name: string
  country: string
  country_code: string
  is_active: boolean
  current_load: number
  last_ping_ms: number | null
  ping_status: string
}

// Флаги стран (emoji)
const FLAGS: Record<string, string> = {
  NL: '🇳🇱', DE: '🇩🇪', US: '🇺🇸', GB: '🇬🇧', FR: '🇫🇷',
  FI: '🇫🇮', SE: '🇸🇪', JP: '🇯🇵', SG: '🇸🇬', CA: '🇨🇦',
}

function pingColor(ms: number | null): string {
  if (ms === null) return 'text-red-400'
  if (ms <= 50) return 'text-green-400'
  if (ms <= 150) return 'text-yellow-400'
  return 'text-red-400'
}

function statusDot(status: string): string {
  if (status === 'online') return '🟢'
  if (status === 'slow') return '🟡'
  return '🔴'
}

export default function Servers() {
  const [servers, setServers] = useState<Server[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  // Загружаем список серверов
  useEffect(() => {
    getServers().then(setServers).catch(() => {})
  }, [])

  // WebSocket для реалтайм-пингов
  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${location.host}/ws/servers`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const pings: Record<string, { ping_ms: number | null; status: string }> = JSON.parse(event.data)

      setServers((prev) =>
        prev.map((server) => {
          const ping = pings[String(server.id)]
          if (ping) {
            return {
              ...server,
              last_ping_ms: ping.ping_ms,
              ping_status: ping.status,
            }
          }
          return server
        })
      )
    }

    return () => {
      ws.close()
    }
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Серверы</h1>

      {servers.length === 0 ? (
        <div className="text-gray-500">Нет доступных серверов</div>
      ) : (
        <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
          {/* Заголовок таблицы — десктоп */}
          <div className="hidden md:flex px-4 py-3 text-xs text-gray-500 border-b border-dark-border">
            <span className="flex-[2]">Сервер</span>
            <span className="flex-1">Пинг</span>
            <span className="flex-1">Нагрузка</span>
            <span className="flex-1">Статус</span>
          </div>

          {/* Строки */}
          {servers.map((server) => (
            <div
              key={server.id}
              className="flex items-center px-4 py-3 border-b border-dark-border/50 last:border-0 hover:bg-white/5 transition-colors"
            >
              {/* Мобилка: компактная карточка */}
              <div className="flex-[2] flex items-center gap-3">
                <span className="text-xl">
                  {FLAGS[server.country_code] || '🌐'}
                </span>
                <div>
                  <div className="font-medium text-sm">{server.name}</div>
                  <div className="text-xs text-gray-500 md:hidden">
                    {server.last_ping_ms !== null
                      ? `${server.last_ping_ms} мс`
                      : 'N/A'}{' '}
                    · {server.current_load}% · {statusDot(server.ping_status)}
                  </div>
                </div>
              </div>

              {/* Десктоп: отдельные колонки */}
              <span className={`flex-1 text-sm hidden md:block ${pingColor(server.last_ping_ms)}`}>
                {server.last_ping_ms !== null ? `${server.last_ping_ms} мс` : 'N/A'}
              </span>
              <span className="flex-1 text-sm text-gray-400 hidden md:block">
                {server.current_load}%
              </span>
              <span className="flex-1 hidden md:block">
                {statusDot(server.ping_status)}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 mt-4">
        Пинги обновляются каждые 5 секунд
      </p>
    </div>
  )
}
