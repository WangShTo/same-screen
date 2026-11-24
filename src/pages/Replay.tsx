import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Pause, Play } from 'lucide-react'
import { isValidRoomCode } from '@/lib/roomCode'
import { fetchReplayLog, formatClock, type ReplayLog } from '@/features/replay/api'
import { frameAt } from '@/features/replay/frameAt'
import { ReplayCanvas } from '@/features/replay/ReplayCanvas'
import { ReplayCode } from '@/features/replay/ReplayCode'

const SPEEDS = [1, 2, 4] as const
/** 时间轴按 100ms 量化：回放时没必要每条 update 都重算一遍文档 */
const TICK = 100

export default function Replay() {
  const { id = '' } = useParams()
  const valid = isValidRoomCode(id)

  const [log, setLog] = useState<ReplayLog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [tab, setTab] = useState<'code' | 'board'>('code')

  useEffect(() => {
    if (!valid) return
    let alive = true
    fetchReplayLog(id)
      .then((data) => {
        if (!alive) return
        setLog(data)
        setAt(data.duration)
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '读取回放失败')
      })
    return () => {
      alive = false
    }
  }, [id, valid])

  const duration = log?.duration ?? 0
  // 时间轴按 100ms 量化，避免播放时每帧都重算文档；
  // 停在末尾时要多给 1ms，否则最后一条 update（t === duration）会被丢在时间点外
  const quantized = Math.round(at / TICK) * TICK
  const appliedAt = at >= duration - 1 ? duration + 1 : quantized

  // 播放：rAF 累加真实时间 × 倍速
  const raf = useRef<number | null>(null)
  const last = useRef(0)

  useEffect(() => {
    if (!playing) return
    last.current = performance.now()
    const step = (now: number) => {
      const delta = (now - last.current) * speed
      last.current = now
      setAt((prev) => {
        const next = prev + delta
        if (next >= duration) {
          setPlaying(false)
          return duration
        }
        return next
      })
      raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      raf.current = null
    }
  }, [playing, speed, duration])

  const frame = useMemo(() => (log ? frameAt(log, appliedAt) : null), [log, appliedAt])

  const toggle = useCallback(() => {
    if (!log || duration === 0) return
    setAt((prev) => (prev >= duration ? 0 : prev))
    setPlaying((prev) => !prev)
  }, [log, duration])

  const empty = !valid || error !== null || (log !== null && log.log.length === 0)

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
        <span className="shrink-0 rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-fg-faint">
          {id}
        </span>

        {!empty && (
          <div className="ml-auto flex items-center gap-1">
            {(['code', 'board'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  tab === key ? 'bg-panel-2 text-fg' : 'text-fg-dim hover:text-fg'
                }`}
              >
                {key === 'code' ? '代码' : '画板'}
              </button>
            ))}
          </div>
        )}
      </header>

      {empty ? (
        <div className="grid min-h-0 flex-1 place-items-center">
          <span className="font-mono text-xs text-fg-faint">
            {!valid ? '房间码不对' : (error ?? '暂无记录')}
          </span>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === 'code'
            ? frame && <ReplayCode text={frame.code} lang={frame.lang} />
            : frame && <ReplayCanvas shapes={frame.shapes} />}
        </div>
      )}

      <footer className="shrink-0 border-t border-line px-3 py-2.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            disabled={empty || duration === 0}
            className="grid h-8 w-8 place-items-center rounded-lg bg-panel-2 text-fg-dim hover:text-fg disabled:opacity-50"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
            <span className="sr-only">{playing ? '暂停' : '播放'}</span>
          </button>

          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={TICK}
            value={Math.min(at, duration)}
            disabled={empty || duration === 0}
            onChange={(event) => {
              setPlaying(false)
              setAt(Number(event.target.value))
            }}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-(--color-accent) disabled:opacity-50"
            aria-label="时间轴"
          />

          <span className="font-mono text-[11px] tabular-nums text-fg-faint">
            {formatClock(at)} / {formatClock(duration)}
          </span>

          <div className="flex items-center gap-1">
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSpeed(value)}
                disabled={empty}
                className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${
                  value === speed ? 'bg-panel-2 text-fg-dim' : 'text-fg-faint hover:text-fg'
                } disabled:opacity-60`}
              >
                {value}x
              </button>
            ))}
          </div>
        </div>
      </footer>
    </main>
  )
}
