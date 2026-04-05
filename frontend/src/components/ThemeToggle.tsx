/**
 * ThemeToggle — кнопка переключения светлой/тёмной темы.
 * ASCII-стиль: [☀]/[☾] или [D]/[L].
 */

import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="text-xs text-gray-500 hover:text-white transition-colors font-mono border border-dark-border px-2 py-1 hover:border-gray-500"
      title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
    >
      {theme === 'dark' ? '[L]' : '[D]'}
    </button>
  )
}
