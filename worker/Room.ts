import { YServer } from 'y-partyserver'
import { encodeStateAsUpdate } from 'yjs'

/**
 * 一条回放日志：Yjs update 的 base64 + 相对房间启动的毫秒数。
 * 回放页把这些 update 按顺序 apply 到一个空 Y.Doc 上，就能还原任意时刻的画面。
 */
type UpdateEntry = { seq: number; t: number; u: string }

/** 关键帧：某一时刻的完整文档状态，用于 seek 时跳过前面的 update。 */
type SnapshotEntry = { seq: number; t: number; s: string }

type ReplayStore = {
  startedAt: number
  log: UpdateEntry[]
  snaps: SnapshotEntry[]
}

const SNAPSHOT_EVERY_MS = 30_000
const SNAPSHOT_EVERY_UPDATES = 50
/** 一次答疑撑死几小时，4000 条足够；超了丢最旧的（关键帧还在）。 */
const MAX_ENTRIES = 4000

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * 一个房间 = 一个 Durable Object。
 * YServer 负责 Yjs 协议握手、update 广播，以及 doc 的加载/保存。
 *
 * 注意：YServer.onStart 里才注册 doc update 的广播监听、才调 onLoad，
 * 所以子类重写 onStart 必须调 super.onStart()，否则握手能成功但内容永远同步不过去。
 *
 * 骨架（每种语言的默认代码）不在这里种：DO 重启后文档可能是空的，
 * 而客户端手里还留着旧内容，服务端这时插一段会和旧内容合并成两份。
 * 改由「创建房间」的那个客户端种一次，见 `src/features/editor/useSeedStarter.ts`。
 *
 * 回放：每次 update 记一条，每 30 秒或每 50 条更新存一个关键帧；
 * GET /parties/main/:room/replay 把这个房间的日志整份交出去。
 */
export class Room extends YServer {
  #startedAt = Date.now()
  #log: UpdateEntry[] = []
  #snaps: SnapshotEntry[] = []
  #seq = 0
  #sinceSnap = 0
  #lastSnapAt = Date.now()
  #flushTimer: ReturnType<typeof setTimeout> | null = null

  async onStart() {
    await super.onStart()

    const saved = await this.ctx.storage.get<ReplayStore>('replay')
    if (saved) {
      this.#startedAt = saved.startedAt
      this.#log = saved.log ?? []
      this.#snaps = saved.snaps ?? []
      this.#seq = this.#log.length ? this.#log[this.#log.length - 1]!.seq + 1 : 0
    }

    this.document.on('update', (update: Uint8Array) => this.#record(update))

    console.log(
      `[room] ${this.name} started (code=${this.document.getText('code').length}, log=${this.#log.length})`,
    )
  }

  #record(update: Uint8Array) {
    const t = Date.now() - this.#startedAt
    this.#log.push({ seq: this.#seq++, t, u: bytesToBase64(update) })
    if (this.#log.length > MAX_ENTRIES) this.#log.splice(0, this.#log.length - MAX_ENTRIES)

    this.#sinceSnap += 1
    const due =
      this.#sinceSnap >= SNAPSHOT_EVERY_UPDATES ||
      Date.now() - this.#lastSnapAt >= SNAPSHOT_EVERY_MS
    if (due) {
      this.#snapshot(t)
      this.#sinceSnap = 0
      this.#lastSnapAt = Date.now()
    }

    this.#scheduleFlush()
  }

  #snapshot(t: number) {
    this.#snaps.push({ seq: this.#seq - 1, t, s: bytesToBase64(encodeStateAsUpdate(this.document)) })
    // 关键帧只留最近 20 个：seek 时取最后一个 <= 目标时间的就行
    if (this.#snaps.length > 20) this.#snaps.splice(0, this.#snaps.length - 20)
  }

  /** 合并写盘，别每次按键都写 DO storage。 */
  #scheduleFlush() {
    if (this.#flushTimer) return
    this.#flushTimer = setTimeout(() => {
      this.#flushTimer = null
      const store: ReplayStore = { startedAt: this.#startedAt, log: this.#log, snaps: this.#snaps }
      this.ctx.storage.put('replay', store).catch((err: unknown) => {
        console.error('[room] 回放日志写盘失败', err)
      })
    }, 1500)
  }

  /** 回放页取数据：GET /parties/main/:room/replay */
  onRequest(request: Request): Response {
    const url = new URL(request.url)
    if (!url.pathname.endsWith('/replay')) return new Response('not found', { status: 404 })
    return Response.json({
      room: this.name,
      startedAt: this.#startedAt,
      duration: this.#log.length ? this.#log[this.#log.length - 1]!.t : 0,
      snaps: this.#snaps,
      log: this.#log,
    })
  }
}
