import { useState } from 'react'
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

type Tab = 'code' | 'board'

function StatusDot() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs text-fg-dim" title="未连接">
      <span className="h-1.5 w-1.5 rounded-full bg-fg-faint" />
      <span className="hidden sm:inline">未连接</span>
    </div>
  )
}

export default function Room() {
  const { id = '' } = useParams()
  const [identity] = useState(loadIdentity)
  const [tab, setTab] = useState<Tab>('code')
  const [notesOpen, setNotesOpen] = useState(true)
  const [copied, setCopied] = useState(false)

  if (!isValidRoomCode(id)) {
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

  async function handleShare() {
    const ok = await copyText(shareUrl(id))
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 1600)
  }

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
            {id}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div
            className="hidden items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 sm:flex"
            title="计时器在 Day 4 接入同步"
          >
            <span className="font-mono text-sm tabular-nums text-fg-dim">45:00</span>
          </div>

          <StatusDot />

          <div className="flex items-center">
            <span
              className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-medium"
              style={{ background: `${identity.color}22`, color: identity.color }}
              title={identity.name || '你'}
            >
              {(identity.name || '你').slice(0, 1)}
            </span>
          </div>

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
          className={`hidden shrink-0 border-r border-line md:block ${
            notesOpen ? 'md:w-60' : 'md:w-0 md:overflow-hidden md:border-r-0'
          }`}
        >
          <div className="flex h-10 items-center justify-between border-b border-line px-3">
            <span className="text-xs font-medium text-fg-dim">题目 / 笔记</span>
          </div>
          <div className="p-3">
            <div className="rounded-lg border border-dashed border-line p-3 text-xs leading-relaxed text-fg-faint">
              共享笔记位
              <br />
              <span className="text-fg-faint/70">Day 2 接入 Y.Text</span>
            </div>
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
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="w-full max-w-sm rounded-xl border border-dashed border-line/80 p-8 text-center">
                <p className="text-sm text-fg-dim">
                  {tab === 'code' ? '共享编辑器' : '共享画板'}
                </p>
                <p className="mt-1.5 text-xs text-fg-faint">
                  {tab === 'code' ? 'CodeMirror + Yjs · Day 2' : 'Konva + Y.Map · Day 3'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 底部状态栏 */}
      <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-line px-3 text-[11px] text-fg-faint">
        <span className="font-mono">Java</span>
        <span className="hidden sm:inline">行 1, 列 1</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-fg-faint" />
          同步未接入
        </span>
        <span className="flex items-center gap-1">
          <button type="button" disabled className="grid h-5 w-5 place-items-center rounded text-fg-faint/50">
            <Undo2 className="h-3 w-3" />
          </button>
          <button type="button" disabled className="grid h-5 w-5 place-items-center rounded text-fg-faint/50">
            <Redo2 className="h-3 w-3" />
          </button>
        </span>
      </footer>
    </main>
  )
}
