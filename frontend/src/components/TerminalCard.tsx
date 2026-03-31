/**
 * TerminalCard — реюзабельная карточка в терминальном стиле.
 * Заголовок: $ command с box-drawing символами.
 * Используется в Dashboard для всех виджетов.
 */

interface Props {
  command: string       // например "status", "vpn", "servers"
  children: React.ReactNode
  className?: string
}

export default function TerminalCard({ command, children, className }: Props) {
  return (
    <div className={`border border-dark-border bg-dark-card font-mono text-sm ${className || ''}`}>
      {/* Заголовок-команда */}
      <div className="border-b border-dark-border px-4 py-2 flex items-center gap-2">
        <span className="text-white/20">┌──</span>
        <span className="text-white/40">$</span>
        <span className="text-white/60">{command}</span>
      </div>

      {/* Контент */}
      <div className="px-4 py-4">
        {children}
      </div>
    </div>
  )
}
