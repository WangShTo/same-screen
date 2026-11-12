import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  Code2,
  Copy,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
  Redo2,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/Button'
import { isValidRoomCode } from '@/lib/roomCode'
import { loadIdentity } from '@/lib/identity'
import { copyText, shareUrl } from '@/lib/env'
import { LANGS, langLabel, type Lang } from '@/features/editor/languages'
import { CodeEditor } from '@/features/editor/CodeEditor'
import { usePresence, type ConnStatus } from '@/features/presence/usePresence'
import { useRoomSession } from '@/features/room/useRoomSession'
import { Whiteboard } from '@/features/canvas/Whiteboard'
import { ExportMenu } from '@/features/export/ExportMenu'
import type { Peer } from '@/features/presence/usePresence'

type Tab = 'code' | 'board'

const STATUS_TEXT: Record<ConnStatus, string> = {
  connected: '已连接',
  connecting: '连接中',
  disconnected: '已断开',
}

const STATUS_COLOR: Record<ConnStatus, string> = {
  connected: '#7ee2a8',
  connecting: '#6ea8fe',
  disconnected: '#5b6472',
}

function InvalidRoom() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm text-center">
        <p className="font-mono text-sm text-fg-faint">room</p>
        <h1 className="mt-2 text-lg font-medium">房间码不对</h1>
        <p className="mt-2 text-sm text-fg-dim">房间码是 6 位字母数字，检查一下链接。</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg border border-line px-4 py-2 text-sm text-fg-dim hover:text-fg"
        >
          回首页
        </Link>
      </div>
    </main>
  )
}

function StatusDot({ status }: { status: ConnStatus }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs text-fg-dim" title={STATUS_TEXT[status]}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
      <span className="hidden sm:inline">{STATUS_TEXT[status]}</span>
    </div>
  )
}

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

function RoomWorkspace({ roomId }: { roomId: string }) {
  const [identity] = useState(loadIdentity)
  const [tab, setTab] = useState<Tab>('code')
  const [notesOpen, setNotesOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [cursor, setCursor] = useState({ line: 1, column: 1 })

  const session = useRoomSession(roomId, identity)
  const { status, peers } = usePresence(session.provider)

  const code = useMemo(() => session.doc.getText('code'), [session.doc])
  const notes = useMemo(() => session.doc.getText('notes'), [session.doc])
  const awareness = session.provider?.awareness ?? null

  async function handleShare() {
    const ok = await copyText(shareUrl(roomId))
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const visiblePeers = peers.slice(0, 3)
  const morePeers = peers.length - visiblePeers.length

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-ink">
      {/* 顶栏 */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3 sm:gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2" title="回首页">
          <div className="relative h-5 w-5">
            <span className="absolute left-0 top-0 h-3.5 w-3.5 rounded-[4px] border border-accent/70 bg-accent/15" />
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-[4px] border border-fg-faint/60 bg-panel" />
          </div>
          <span className="hidden text-sm font-medium sm:inline">同屏</span>
        </Link>

        <span className="hidden h-4 w-px bg-line sm:block" />

        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden truncate text-sm text-fg-dim sm:inline">未命名房间</span>
          <span className="shrink-0 rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-fg-faint">
            {roomId}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <StatusDot status={status} />

          <div className="flex items-center -space-x-1.5">
            {visiblePeers.map((peer) => (
              <Avatar key={peer.clientId} peer={peer} />
            ))}
            {morePeers > 0 && (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-panel-2 text-[10px] text-fg-dim ring-1 ring-ink">
                +{morePeers}
              </span>
            )}
          </div>

          <ExportMenu doc={session.doc} roomId={roomId} lang={session.lang} />

          <Button variant="outline" onClick={handleShare} className="h-8 px-2.5 py-1">
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{copied ? '已复制' : '分享'}</span>
          </Button>

          <Button variant="ghost" className="h-8 px-2 py-1" title="离开房间" onClick={() => window.location.assign('/')}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* 主体 */}
      <div className="flex min-h-0 flex-1">
        {/* 左侧笔记 */}
        <aside
          className={`hidden shrink-0 flex-col border-r border-line md:flex ${
            notesOpen ? 'md:w-60' : 'md:w-0 md:overflow-hidden md:border-r-0'
          }`}
        >
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
            <span className="text-xs font-medium text-fg-dim">题目 / 笔记</span>
          </div>
          <div className="min-h-0 flex-1">
            {awareness ? (
              <CodeEditor
                ytext={notes}
                awareness={awareness}
                undoManager={session.undoManager}
                language="javascript"
                compact
                placeholderText="粘贴题目"
              />
            ) : (
              <p className="p-3 text-xs text-fg-faint">连接中…</p>
            )}
          </div>
        </aside>

        {/* 中区 */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
            <button
              type="button"
              onClick={() => setNotesOpen((v) => !v)}
              className="mr-1 hidden h-7 w-7 place-items-center rounded-md text-fg-faint hover:bg-panel-2 hover:text-fg md:grid"
              title={notesOpen ? '收起笔记' : '展开笔记'}
            >
              {notesOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>

            {(
              [
                { key: 'code', label: '代码', icon: Code2 },
                { key: 'board', label: '画板', icon: PenTool },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ${
                  tab === key ? 'bg-panel-2 text-fg' : 'text-fg-faint hover:text-fg-dim'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="relative min-h-0 flex-1">
            {/* 代码：常驻，切 Tab 只隐藏，避免重建编辑器丢光标 */}
            <div className={`absolute inset-0 ${tab === 'code' ? '' : 'hidden'}`}>
              {awareness ? (
                <CodeEditor
                  ytext={code}
                  awareness={awareness}
                  undoManager={session.undoManager}
                  language={session.lang}
                  placeholderText="开始写代码，对面能实时看到"
                  onCursor={(line, column) => setCursor({ line, column })}
                />
              ) : (
                <div className="grid h-full place-items-center text-xs text-fg-faint">连接房间中…</div>
              )}
            </div>

            {tab === 'board' && (
              <div className="absolute inset-0">
                <Whiteboard ydoc={session.doc} userId={identity.id} undoManager={session.undoManager} />
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 底部状态栏 */}
      <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-line px-3 text-[11px] text-fg-faint">
        <select
          value={session.lang}
          onChange={(event) => {
            const next = LANGS.find((item) => item.id === event.target.value)
            if (next) session.setLang(next.id as Lang)
          }}
          className="-ml-1 appearance-none rounded border border-transparent bg-transparent py-0.5 pl-1 pr-4 font-mono text-[11px] text-fg-dim hover:border-line hover:bg-panel focus:outline-none"
          title="切换语言（两端同步）"
        >
          {LANGS.map((item) => (
            <option key={item.id} value={item.id} className="bg-panel text-fg">
              {langLabel(item.id)}
            </option>
          ))}
        </select>
        <span className="font-mono tabular-nums">
          行 {cursor.line}, 列 {cursor.column}
        </span>

        <span className="ml-auto flex items-center gap-1.5" title="Yjs 同步状态">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
          {status === 'connected' ? '已同步' : STATUS_TEXT[status]}
        </span>

        <span className="flex items-center gap-1">
          <button
            type="button"
            disabled={session.undoState.undo === 0}
            onClick={() => session.undoManager.undo()}
            className="grid h-5 w-5 place-items-center rounded text-fg-faint enabled:hover:bg-panel-2 enabled:hover:text-fg disabled:text-fg-faint/40"
            title={`撤销（${session.undoState.undo}）`}
          >
            <Undo2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            disabled={session.undoState.redo === 0}
            onClick={() => session.undoManager.redo()}
            className="grid h-5 w-5 place-items-center rounded text-fg-faint enabled:hover:bg-panel-2 enabled:hover:text-fg disabled:text-fg-faint/40"
            title={`重做（${session.undoState.redo}）`}
          >
            <Redo2 className="h-3 w-3" />
          </button>
        </span>
      </footer>
    </main>
  )
}

export default function Room() {
  const { id = '' } = useParams()
  if (!isValidRoomCode(id)) return <InvalidRoom />
  return <RoomWorkspace roomId={id} />
}
