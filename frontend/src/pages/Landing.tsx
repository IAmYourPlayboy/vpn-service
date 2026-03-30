/**
 * Лендинг — публичная страница.
 */

import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-dark text-white">
      {/* Хедер */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
        <div className="text-xl font-bold">🛡️ VPN</div>
        <div className="flex gap-3">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white px-4 py-2">
            Войти
          </Link>
          <Link
            to="/register"
            className="text-sm bg-primary hover:bg-primary/80 px-4 py-2 rounded-lg"
          >
            Начать
          </Link>
        </div>
      </header>

      {/* Герой */}
      <section className="text-center py-20 px-6">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Быстрый и безопасный <span className="text-accent">VPN</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8">
          Защитите своё интернет-соединение. Серверы в нескольких странах,
          высокая скорость, простое подключение.
        </p>
        <Link
          to="/register"
          className="inline-block bg-accent hover:bg-accent/80 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
        >
          Подключиться
        </Link>
      </section>

      {/* Преимущества */}
      <section className="grid md:grid-cols-3 gap-8 px-6 py-16 max-w-5xl mx-auto">
        <div className="bg-dark-card p-6 rounded-xl">
          <div className="text-3xl mb-4">⚡</div>
          <h3 className="text-lg font-semibold mb-2">Высокая скорость</h3>
          <p className="text-gray-400 text-sm">
            Современные протоколы VLESS/WireGuard обеспечивают максимальную скорость соединения.
          </p>
        </div>
        <div className="bg-dark-card p-6 rounded-xl">
          <div className="text-3xl mb-4">🌍</div>
          <h3 className="text-lg font-semibold mb-2">Серверы по миру</h3>
          <p className="text-gray-400 text-sm">
            Выбирайте из нескольких локаций. Подключайтесь к ближайшему серверу для минимальной задержки.
          </p>
        </div>
        <div className="bg-dark-card p-6 rounded-xl">
          <div className="text-3xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">Безопасность</h3>
          <p className="text-gray-400 text-sm">
            Шифрование трафика надёжно защищает ваши данные от перехвата.
          </p>
        </div>
      </section>

      {/* Цена */}
      <section className="text-center py-16 px-6">
        <h2 className="text-2xl font-bold mb-8">Простой тариф</h2>
        <div className="bg-dark-card border border-dark-border rounded-2xl p-8 max-w-sm mx-auto">
          <div className="text-4xl font-bold mb-2">
            ??? <span className="text-lg text-gray-400">₽/мес</span>
          </div>
          <p className="text-gray-400 mb-6">Полный доступ ко всем серверам</p>
          <ul className="text-left text-sm text-gray-300 space-y-2 mb-8">
            <li>✅ Все серверы и локации</li>
            <li>✅ Безлимитный трафик</li>
            <li>✅ До 3 устройств</li>
            <li>✅ Поддержка 24/7</li>
          </ul>
          <Link
            to="/register"
            className="block bg-accent hover:bg-accent/80 py-3 rounded-lg font-semibold transition-colors"
          >
            Подключиться
          </Link>
        </div>
      </section>

      {/* Футер */}
      <footer className="text-center py-8 text-sm text-gray-500 border-t border-dark-border">
        © 2026 VPN Service
      </footer>
    </div>
  )
}
