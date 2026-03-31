/**
 * Админка — Тарифы. Управление тарифами (цена, срок, вкл/выкл).
 */

import { useEffect, useState, useCallback } from 'react'
import { getAdminPlans, createAdminPlan, updateAdminPlan, toggleAdminPlan } from '../../api/client'

export default function AdminPlans() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', price: '', duration_days: '30' })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminPlans()
      setPlans(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreate = async () => {
    if (!form.name || !form.price) return
    try {
      await createAdminPlan({
        name: form.name,
        price: parseFloat(form.price),
        duration_days: parseInt(form.duration_days) || 30,
      })
      setForm({ name: '', price: '', duration_days: '30' })
      setShowAdd(false)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const startEdit = (plan: any) => {
    setEditId(plan.id)
    setForm({
      name: plan.name,
      price: String(plan.price),
      duration_days: String(plan.duration_days),
    })
  }

  const handleUpdate = async () => {
    if (!editId) return
    try {
      await updateAdminPlan(editId, {
        name: form.name,
        price: parseFloat(form.price),
        duration_days: parseInt(form.duration_days),
      })
      setEditId(null)
      setForm({ name: '', price: '', duration_days: '30' })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggle = async (id: number) => {
    await toggleAdminPlan(id)
    loadData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono text-green-400">&gt; admin/plans</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowAdd(!showAdd); setEditId(null) }}
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

      {/* Форма создания / редактирования */}
      {(showAdd || editId) && (
        <div className="bg-dark-card border border-green-400/30 p-4 mb-4">
          <div className="text-sm font-mono text-green-400 mb-3">
            {editId ? 'Редактировать тариф' : 'Новый тариф'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text" placeholder="Название" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-dark border border-dark-border text-white px-3 py-2 text-sm font-mono placeholder-gray-600 focus:border-green-400 focus:outline-none"
            />
            <input
              type="number" placeholder="Цена (руб)" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="bg-dark border border-dark-border text-white px-3 py-2 text-sm font-mono placeholder-gray-600 focus:border-green-400 focus:outline-none"
            />
            <input
              type="number" placeholder="Дней" value={form.duration_days}
              onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
              className="bg-dark border border-dark-border text-white px-3 py-2 text-sm font-mono placeholder-gray-600 focus:border-green-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={editId ? handleUpdate : handleCreate}
              className="px-4 py-1 text-sm font-mono bg-green-400/10 border border-green-400 text-green-400 hover:bg-green-400/20 transition-colors"
            >
              {editId ? 'Сохранить' : 'Создать'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setEditId(null); setForm({ name: '', price: '', duration_days: '30' }) }}
              className="px-4 py-1 text-sm font-mono border border-dark-border text-gray-500 hover:text-white transition-colors"
            >
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
                <th className="text-left p-3">Цена</th>
                <th className="text-left p-3">Дней</th>
                <th className="text-left p-3">Статус</th>
                <th className="text-left p-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p: any) => (
                <tr key={p.id} className="border-b border-dark-border/50 text-gray-300">
                  <td className="p-3">{p.id}</td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.price} ₽</td>
                  <td className="p-3">{p.duration_days}</td>
                  <td className="p-3">
                    <span className={p.is_active ? 'text-green-400' : 'text-gray-600'}>
                      {p.is_active ? '● вкл' : '○ выкл'}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => startEdit(p)}
                      className="text-yellow-400 hover:text-yellow-300 text-xs"
                    >
                      [Ред.]
                    </button>
                    <button
                      onClick={() => handleToggle(p.id)}
                      className={`text-xs ${p.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                    >
                      {p.is_active ? '[Выкл]' : '[Вкл]'}
                    </button>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr><td colSpan={6} className="p-3 text-gray-600">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
