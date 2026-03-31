/**
 * Страница регистрации — терминальный стиль ч/б.
 * Форма слева, вращающаяся ASCII-Земля справа (desktop).
 * Кнопка "← Назад" в левом верхнем углу.
 * Фон: чёрный + звёзды (CSS).
 */

import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/client'
import AsciiEarth from '../components/AsciiEarth'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await register(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stars flex relative overflow-hidden">
      {/* Кнопка "← Назад" — левый верхний угол */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 text-sm text-gray-500 hover:text-white transition-colors font-mono"
      >
        ← Назад
      </Link>

      {/* Форма — слева, центр по вертикали */}
      <div className="flex-1 flex items-center justify-center px-4 z-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link to="/" className="text-2xl font-bold font-mono tracking-wider">ANDIGO</Link>
            <h1 className="text-xl mt-4">Регистрация</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-dark-card border border-dark-border px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white font-mono text-sm"
            />

            <input
              type="password"
              placeholder="Пароль (минимум 6 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-dark-card border border-dark-border px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white font-mono text-sm"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50 py-3 font-semibold transition-colors text-sm tracking-wide uppercase"
            >
              {loading ? 'Создание...' : 'Создать аккаунт'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-white hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </div>

      {/* ASCII-Земля — только десктоп (>= 1024px) */}
      <div className="hidden lg:flex items-center justify-start flex-shrink-0 pr-8 overflow-hidden">
        <AsciiEarth className="opacity-80" />
      </div>
    </div>
  )
}
