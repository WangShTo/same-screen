import type { ConnStatus } from '@/features/presence/usePresence'

export const STATUS_TEXT: Record<ConnStatus, string> = {
  connected: '已连接',
  connecting: '连接中',
  disconnected: '已断开',
}

export const STATUS_COLOR: Record<ConnStatus, string> = {
  connected: '#7ee2a8',
  connecting: '#6ea8fe',
  disconnected: '#5b6472',
}

export function StatusDot({ status }: { status: ConnStatus }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs text-fg-dim" title={STATUS_TEXT[status]}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
      <span className="hidden sm:inline">{STATUS_TEXT[status]}</span>
    </div>
  )
}
