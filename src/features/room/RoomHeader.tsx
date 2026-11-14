import { Link } from 'react-router'
import { Copy, LogOut } from 'lucide-react'
import { Button } from '@/components/Button'
import { ExportMenu } from '@/features/export/ExportMenu'
import { TimerControl } from '@/features/timer/TimerControl'
import { useTimer } from '@/features/timer/useTimer'
import { StatusDot } from '@/features/room/StatusDot'
import type { ConnStatus, Peer } from '@/features/presence/usePresence'
import type * as Y from 'yjs'
import type { Lang } from '@/features/editor/languages'

function Avatar({ peer }: { peer: Peer }) {
  return (
    <span
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-medium ring-1 ring-ink"
      style={{ background: `${peer.color}26`, color: peer.color }}
      title={peer.self ? `${peer.name}（你）` : peer.name}
    >
      {peer.name.slice(0, 1).toUpperCase()}
    </span>
  )
}

type Props = {
  roomId: string
  doc: Y.Doc
  lang: Lang
  status: ConnStatus
  peers: Peer[]
  copied: boolean
  onShare: () => void
}

/** 顶栏：房间码、计时、连接、成员、导出、分享、离开。 */
export function RoomHeader({ roomId, doc, lang, status, peers, copied, onShare }: Props) {
  const timer = useTimer(doc)
  const visible = peers.slice(0, 3)
  const more = peers.length - visible.length

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3 sm:gap-3">
      <Link to="/" className="flex shrink-0 items-center gap-2" title="回首页">
        <div className="relative h-5 w-5">
          <span className="absolute left-0 top-0 h-3.5 w-3.5 rounded-[4px] border border-accent/70 bg-accent/15" />
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-[4px] border border-fg-faint/60 bg-panel" />
        </div>
        <span className="hidden text-sm font-medium sm:inline">同屏</span>
      </Link>

      <span className="hidden h-4 w-px bg-line sm:block" />

      <span className="shrink-0 rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-fg-faint">
        {roomId}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <TimerControl timer={timer} />
        <StatusDot status={status} />

        <div className="flex items-center -space-x-1.5">
          {visible.map((peer) => (
            <Avatar key={peer.clientId} peer={peer} />
          ))}
          {more > 0 && (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-panel-2 text-[10px] text-fg-dim ring-1 ring-ink">
              +{more}
            </span>
          )}
        </div>

        <ExportMenu doc={doc} roomId={roomId} lang={lang} />

        <Button variant="outline" onClick={onShare} className="h-8 px-2.5 py-1">
          <Copy className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{copied ? '已复制' : '分享'}</span>
        </Button>

        <Button variant="ghost" className="h-8 px-2 py-1" title="离开房间" onClick={() => window.location.assign('/')}>
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  )
}
