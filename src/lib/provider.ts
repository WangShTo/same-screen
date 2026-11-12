import YProvider from 'y-partyserver/provider'
import type * as Y from 'yjs'

/** PartyServer 的 party 段：必须和 worker 绑定名 `Main` 的 kebab-case 一致 */
export const PARTY = 'main'

/**
 * 一个房间一条 WebSocket。走同域（dev 时由 Vite 代理 /parties 到 8787），
 * 生产环境由同一个 Worker 同时提供静态资源和 WebSocket。
 */
export function createRoomProvider(doc: Y.Doc, room: string): YProvider {
  return new YProvider(window.location.host, room, doc, { party: PARTY })
}
