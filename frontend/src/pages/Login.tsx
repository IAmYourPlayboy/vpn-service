/**
 * Страница входа — полноэкранная вращающаяся Земля.
 * Форма в центре, Земля на заднем плане.
 */

import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/client'
import FullscreenEarth from '../components/FullscreenEarth'
import ThemeToggle from '../components/ThemeToggle'

const legalLinks = [
  { to: '/offer', label: 'Оферта' },
  { to: '/privacy', label: 'Конфиденциальность' },
  { to: '/terms', label: 'Соглашение' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Полноэкранная Земля на заднем плане */}
      <FullscreenEarth />

      {/* Контент поверх Земли */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Верхняя панель: назад + тема */}
        <div className="flex items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-white transition-colors font-mono"
          >
            ← Назад
          </Link>
          <ThemeToggle />
        </div>

        {/* Форма — по центру */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <Link to="/" className="text-2xl font-bold font-mono tracking-wider">ANDIGO</Link>
              <h1 className="text-xl mt-4">Вход</h1>
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
                className="w-full bg-black/60 backdrop-blur border border-dark-border px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white font-mono text-sm"
              />

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-black/60 backdrop-blur border border-dark-border px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-white font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors font-mono text-xs"
                  tabIndex={-1}
                >
                  {showPassword ? '[○]' : '[●]'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50 py-3 font-semibold transition-colors text-sm tracking-wide uppercase"
              >
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-white hover:underline">
                Зарегистрироваться
              </Link>
            </p>

            {/* Юридические ссылки */}
            <div className="flex justify-center gap-4 mt-4">
              {legalLinks.map((l) => (
                <Link key={l.to} to={l.to} className="text-xs text-gray-700 hover:text-gray-400 transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
            <p className="text-center text-xs text-gray-800 mt-2 font-mono">© 2026 Andigo · Самозанятый</p>
          </div>
        </div>
      </div>
    </div>
  )
}
