import type { Lang } from '@/features/editor/languages'

export type ReplayUpdate = { seq: number; t: number; u: string }
export type ReplaySnapshot = { seq: number; t: number; s: string }

export type ReplayLog = {
  room: string
  startedAt: number
  duration: number
  snaps: ReplaySnapshot[]
  log: ReplayUpdate[]
}

/** 服务端把日志挂在同一个 DO 上：GET /parties/main/:room/replay */
export async function fetchReplayLog(room: string): Promise<ReplayLog> {
  const res = await fetch(`/parties/main/${room}/replay`)
  if (!res.ok) throw new Error(`读取回放失败（${res.status}）`)
  return (await res.json()) as ReplayLog
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 语言只在 meta 里出现过，回放时也读它。 */
export function langFrom(value: unknown): Lang {
  return value === 'python' || value === 'javascript' || value === 'java' ? value : 'java'
}
