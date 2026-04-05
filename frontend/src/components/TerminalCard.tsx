/**
 * TerminalCard — реюзабельная карточка в терминальном стиле.
 * Темизация: цвета адаптируются к текущей теме.
 */

import { useTheme } from '../context/ThemeContext'

interface Props {
  command: string
  children: React.ReactNode
  className?: string
}

export default function TerminalCard({ command, children, className }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className={`border font-mono text-sm ${className || ''}`}
      style={{
        backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5',
        borderColor: isDark ? '#222' : '#e0e0e0',
      }}
    >
      <div className="border-b px-4 py-2 flex items-center gap-2"
           style={{ borderColor: isDark ? '#222' : '#e0e0e0' }}>
        <span style={{ color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}>┌──</span>
        <span style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>$</span>
        <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>{command}</span>
      </div>
      <div className="px-4 py-4">
        {children}
      </div>
    </div>
  )
}
