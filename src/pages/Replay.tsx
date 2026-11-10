import { Link, useParams } from 'react-router'
import { ArrowLeft, Pause, Play } from 'lucide-react'
import { isValidRoomCode } from '@/lib/roomCode'

const SPEEDS = [1, 2, 4] as const

export default function Replay() {
  const { id = '' } = useParams()

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-ink">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-3">
        <Link
          to={`/room/${id}`}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-fg-dim hover:bg-panel-2 hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          回到房间
        </Link>
        <span className="h-4 w-px bg-line" />
        <span className="text-sm text-fg-dim">回放</span>
        <span className="rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-fg-faint">
          {id}
        </span>
      </header>

      <div className="grid min-h-0 flex-1 place-items-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-dashed border-line p-8 text-center">
          <p className="text-sm text-fg-dim">
            {isValidRoomCode(id) ? '回放画面' : '房间码不对'}
          </p>
          <p className="mt-1.5 text-xs text-fg-faint">
            {isValidRoomCode(id) ? '按 Yjs update 时间轴重演 · Day 5' : '检查一下链接'}
          </p>
        </div>
      </div>

      <footer className="shrink-0 border-t border-line px-3 py-2.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled
            className="grid h-8 w-8 place-items-center rounded-lg bg-panel-2 text-fg-dim disabled:opacity-50"
          >
            <Play className="h-4 w-4 translate-x-px" />
            <span className="sr-only">播放</span>
          </button>
          <div className="relative h-1 flex-1 rounded-full bg-line">
            <span className="absolute inset-y-0 left-0 w-0 rounded-full bg-accent" />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-fg-faint">00:00 / 00:00</span>
          <div className="flex items-center gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                disabled
                className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${
                  s === 1 ? 'bg-panel-2 text-fg-dim' : 'text-fg-faint'
                } disabled:opacity-60`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-fg-faint">
          <Pause className="h-3 w-3" />
          播放器未接入数据
        </p>
      </footer>
    </main>
  )
}
