import { useEffect, useMemo, useRef, useState } from 'react'
import type * as Y from 'yjs'
import { withLocalOrigin } from '@/lib/ydoc'

/** 预设时长（分钟）。 */
export const TIMER_PRESETS = [45, 60] as const

const KEY_DURATION = 'timerDurationMs'
const KEY_ENDS_AT = 'timerEndsAt'
const KEY_REMAINING = 'timerRemainingMs'

const DEFAULT_DURATION = 45 * 60 * 1000

type Snapshot = {
  durationMs: number
  endsAt: number | null
  remainingMs: number
}

function read(meta: Y.Map<unknown>): Snapshot {
  const duration = meta.get(KEY_DURATION)
  const endsAt = meta.get(KEY_ENDS_AT)
  const remaining = meta.get(KEY_REMAINING)
  return {
    durationMs: typeof duration === 'number' ? duration : DEFAULT_DURATION,
    endsAt: typeof endsAt === 'number' ? endsAt : null,
    remainingMs: typeof remaining === 'number' ? remaining : DEFAULT_DURATION,
  }
}

export type RoomTimer = {
  running: boolean
  remainingMs: number
  durationMs: number
  start: () => void
  pause: () => void
  reset: () => void
  setDuration: (minutes: number) => void
}

/**
 * 同步计时器。
 * 共享的只有三个数：总时长、结束时间戳、暂停时的剩余量。
 * **不存倒计时本身**——否则两端各减各的，一定会漂。
 */
export function useTimer(ydoc: Y.Doc): RoomTimer {
  const meta = useMemo(() => ydoc.getMap('meta'), [ydoc])
  const [snapshot, setSnapshot] = useState<Snapshot>(() => read(meta))
  const [now, setNow] = useState(() => Date.now())
  const tickRef = useRef<number | null>(null)

  useEffect(() => {
    const sync = () => setSnapshot(read(meta))
    meta.observe(sync)
    sync()
    return () => meta.unobserve(sync)
  }, [meta])

  // 本地只负责刷新「现在几点」，不往文档里写
  useEffect(() => {
    if (snapshot.endsAt === null) {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current)
        tickRef.current = null
      }
      return
    }
    setNow(Date.now())
    tickRef.current = window.setInterval(() => setNow(Date.now()), 200)
    return () => {
      if (tickRef.current !== null) {
        window.clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [snapshot.endsAt])

  const running = snapshot.endsAt !== null
  const remainingMs = running ? Math.max(0, (snapshot.endsAt ?? 0) - now) : snapshot.remainingMs

  function start() {
    if (snapshot.endsAt !== null) return
    const base = Math.min(Math.max(snapshot.remainingMs, 1000), snapshot.durationMs)
    withLocalOrigin(ydoc, () => {
      meta.set(KEY_REMAINING, base)
      meta.set(KEY_ENDS_AT, Date.now() + base)
    })
  }

  function pause() {
    if (snapshot.endsAt === null) return
    const left = Math.max(0, snapshot.endsAt - Date.now())
    withLocalOrigin(ydoc, () => {
      meta.set(KEY_REMAINING, left)
      meta.set(KEY_ENDS_AT, null)
    })
  }

  function reset() {
    withLocalOrigin(ydoc, () => {
      meta.set(KEY_REMAINING, snapshot.durationMs)
      meta.set(KEY_ENDS_AT, null)
    })
  }

  function setDuration(minutes: number) {
    const next = Math.round(minutes * 60 * 1000)
    withLocalOrigin(ydoc, () => {
      meta.set(KEY_DURATION, next)
      meta.set(KEY_REMAINING, next)
      meta.set(KEY_ENDS_AT, null)
    })
  }

  return {
    running,
    remainingMs,
    durationMs: snapshot.durationMs,
    start,
    pause,
    reset,
    setDuration,
  }
}

export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
