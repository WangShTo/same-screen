import { Doc, applyUpdate } from 'yjs'
import { isShape, type Shape } from '@/features/canvas/types'
import type { Lang } from '@/features/editor/languages'
import { langFrom, type ReplayLog } from './api'

export type Frame = {
  code: string
  notes: string
  shapes: Shape[]
  lang: Lang
  /** 这一帧用到了多少条 update，用来在时间轴上标进度 */
  applied: number
}

const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0))

/**
 * 还原某一时刻的画面：从最近的关键帧开始，按 seq 顺序把之后的 update 叠上去。
 * 每次 seek 都新建一个空 Y.Doc —— 回放是只读的，不需要跟真实房间共存。
 */
export function frameAt(log: ReplayLog, atMs: number): Frame {
  const doc = new Doc()
  const snap = [...log.snaps].reverse().find((item) => item.t <= atMs)
  let applied = 0
  let fromSeq = -1

  if (snap) {
    applyUpdate(doc, fromBase64(snap.s))
    fromSeq = snap.seq
  }

  for (const entry of log.log) {
    if (entry.seq <= fromSeq || entry.t > atMs) continue
    applyUpdate(doc, fromBase64(entry.u))
    applied += 1
  }

  const shapes: Shape[] = []
  doc.getMap<Shape>('shapes').forEach((shape) => {
    if (isShape(shape)) shapes.push(shape)
  })

  return {
    code: doc.getText('code').toString(),
    notes: doc.getText('notes').toString(),
    shapes,
    lang: langFrom(doc.getMap('meta').get('lang')),
    applied,
  }
}
