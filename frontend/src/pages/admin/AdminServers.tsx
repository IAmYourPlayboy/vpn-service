/**
 * Админка — Серверы. Список серверов, добавить/удалить.
 */

import { useEffect, useState, useCallback } from 'react'
import { getServers } from '../../api/client'
import api from '../../api/client'

export default function AdminServers() {
  const [servers, setServers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', country: '', country_code: '', host: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getServers()
      setServers(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleAdd = async () => {
    if (!form.name || !form.country || !form.country_code || !form.host) return
    try {
      await api.post('/servers', form)
      setForm({ name: '', country: '', country_code: '', host: '' })
      setShowAdd(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить сервер?')) return
    try {
      await api.delete(`/servers/${id}`)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const pingColor = (ms: number | null) => {
    if (ms === null) return 'text-gray-600'
    if (ms < 50) return 'text-green-400'
    if (ms < 150) return 'text-yellow-400'
    return 'text-red-400'
  }

  const statusDot = (s: string) => {
    if (s === 'online') return '●'
    if (s === 'slow') return '◐'
    return '○'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-green-400">&gt; admin/servers</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-3 py-1 text-sm font-mono border border-dark-border text-gray-400 hover:text-green-400 hover:border-green-400 transition-colors"
          >
            [+ Добавить]
          </button>
          <button
            onClick={loadData}
            className="px-3 py-1 text-sm font-mono border border-dark-border text-gray-400 hover:text-white hover:border-green-400 transition-colors"
          >
            [↻ Обновить]
          </button>
        </div>
      </div>

      {/* Форма добавления */}
      {showAdd && (
        <div className="bg-dark-card border border-green-400/30 p-4 mb-4">
          <div className="text-sm font-mono text-green-400 mb-3">Новый сервер</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text" placeholder="Название (Нидерланды #1)" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-dark border border-dark-border text-white px-3 py-2 text-sm font-mono placeholder-gray-600 focus:border-green-400 focus:outline-none"
            />
            <input
              type="text" placeholder="Страна (Netherlands)" value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="bg-dark border border-dark-border text-white px-3 py-2 text-sm font-mono placeholder-gray-600 focus:border-green-400 focus:outline-none"
            />
            <input
              type="text" placeholder="Код страны (NL)" value={form.country_code} maxLength={2}
              onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })}
              className="bg-dark border border-dark-border text-white px-3 py-2 text-sm font-mono placeholder-gray-600 focus:border-green-400 focus:outline-none"
            />
            <input
              type="text" placeholder="Host (IP или домен)" value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              className="bg-dark border border-dark-border text-white px-3 py-2 text-sm font-mono placeholder-gray-600 focus:border-green-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAdd} className="px-4 py-1 text-sm font-mono bg-green-400/10 border border-green-400 text-green-400 hover:bg-green-400/20 transition-colors">
              Создать
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-1 text-sm font-mono border border-dark-border text-gray-500 hover:text-white transition-colors">
              Отмена
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 font-mono">Загрузка...</div>
      ) : (
        <div className="bg-dark-card border border-dark-border overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-dark-border">
                <th className="text-left p-3">ID</th>
                <th className="text-left p-3">Название</th>
                <th className="text-left p-3">Страна</th>
                <th className="text-left p-3">Host</th>
                <th className="text-left p-3">Пинг</th>
                <th className="text-left p-3">Статус</th>
                <th className="text-left p-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((s: any) => (
                <tr key={s.id} className="border-b border-dark-border/50 text-gray-300">
                  <td className="p-3">{s.id}</td>
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.country_code} {s.country}</td>
                  <td className="p-3 text-xs text-gray-500">{s.host}</td>
                  <td className={`p-3 ${pingColor(s.last_ping_ms)}`}>
                    {s.last_ping_ms !== null ? `${s.last_ping_ms}ms` : '—'}
                  </td>
                  <td className="p-3">
                    <span className={s.ping_status === 'online' ? 'text-green-400' : s.ping_status === 'slow' ? 'text-yellow-400' : 'text-red-400'}>
                      {statusDot(s.ping_status)} {s.ping_status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      [Удалить]
                    </button>
                  </td>
                </tr>
              ))}
              {servers.length === 0 && (
                <tr><td colSpan={7} className="p-3 text-gray-600">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
