import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Code2, PanelLeftClose, PanelLeftOpen, PenTool } from 'lucide-react'
import { isValidRoomCode } from '@/lib/roomCode'
import { loadIdentity } from '@/lib/identity'
import { copyText, shareUrl } from '@/lib/env'
import { CodeEditor } from '@/features/editor/CodeEditor'
import { usePresence } from '@/features/presence/usePresence'
import { useRoomSession } from '@/features/room/useRoomSession'
import { useSeedStarter } from '@/features/editor/useSeedStarter'
import { RoomHeader } from '@/features/room/RoomHeader'
import { RoomFooter } from '@/features/room/RoomFooter'
import { NotesPanel } from '@/features/room/NotesPanel'
import { Whiteboard } from '@/features/canvas/Whiteboard'

type Tab = 'code' | 'board'

const TABS = [
  { key: 'code', label: '代码', icon: Code2 },
  { key: 'board', label: '画板', icon: PenTool },
] as const

function InvalidRoom() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <p className="font-mono text-sm text-fg-faint">room</p>
        <h1 className="mt-2 text-lg font-medium">房间码不对</h1>
        <Link to="/" className="mt-6 inline-block rounded-lg border border-line px-4 py-2 text-sm text-fg-dim hover:text-fg">
          回首页
        </Link>
      </div>
    </main>
  )
}

function RoomWorkspace({ roomId, isCreator }: { roomId: string; isCreator: boolean }) {
  const [identity] = useState(loadIdentity)
  const [tab, setTab] = useState<Tab>('code')
  const [notesOpen, setNotesOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [cursor, setCursor] = useState({ line: 1, column: 1 })

  const session = useRoomSession(roomId, identity)
  const { status, peers } = usePresence(session.provider)
  useSeedStarter({ ydoc: session.doc, status, isCreator })

  const code = useMemo(() => session.doc.getText('code'), [session.doc])
  const notes = useMemo(() => session.doc.getText('notes'), [session.doc])
  const awareness = session.provider?.awareness ?? null

  async function handleShare() {
    const ok = await copyText(shareUrl(roomId))
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 1600)
  }

  // 调试用：只在 dev 下挂，方便脚本/控制台看真实同步状态
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __ssRoom?: unknown }).__ssRoom = { doc: session.doc, awareness }
  }, [session.doc, awareness])

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-ink">
      <RoomHeader
        roomId={roomId}
        doc={session.doc}
        lang={session.lang}
        status={status}
        peers={peers}
        copied={copied}
        onShare={handleShare}
      />

      <div className="flex min-h-0 flex-1">
        <NotesPanel
          ytext={notes}
          awareness={awareness}
          undoManager={session.undoManager}
          synced={session.everSynced}
          open={notesOpen}
        />

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

            {TABS.map(({ key, label, icon: Icon }) => (
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
            {/* 代码常驻，切 Tab 只隐藏，避免重建编辑器丢光标 */}
            <div className={`absolute inset-0 ${tab === 'code' ? '' : 'hidden'}`}>
              {awareness && session.everSynced ? (
                <CodeEditor
                  ytext={code}
                  awareness={awareness}
                  undoManager={session.undoManager}
                  language={session.lang}
                  placeholderText="开始写代码"
                  onCursor={(line, column) => setCursor({ line, column })}
                />
              ) : (
                <div className="grid h-full place-items-center text-xs text-fg-faint">连接中…</div>
              )}
            </div>

            {tab === 'board' && (
              <div className="absolute inset-0">
                <Whiteboard
                  ydoc={session.doc}
                  userId={identity.id}
                  undoManager={session.undoManager}
                  awareness={awareness}
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <RoomFooter
        lang={session.lang}
        setLang={session.setLang}
        cursor={cursor}
        status={status}
        undoManager={session.undoManager}
        undoState={session.undoState}
      />
    </main>
  )
}

export default function Room() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  if (!isValidRoomCode(id)) return <InvalidRoom />
  return <RoomWorkspace roomId={id} isCreator={params.get('new') === '1'} />
}
