import * as Y from 'yjs'

/**
 * 本机操作的 origin。
 *
 * 画板/笔记里所有本地写入都必须走 `withLocalOrigin`，UndoManager 才认。
 * CodeMirror 侧不用手动加：y-codemirror.next 的 YUndoManagerPlugin 挂载时会
 * 自己 `addTrackedOrigin(syncConf)`、卸载时移除
 * （见 node_modules/y-codemirror.next/src/y-undomanager.js:98 与 :114）。
 */
export const LOCAL_ORIGIN = Symbol('same-screen/local')

/** awareness 节流：50ms ≈ 20 msg/s。全项目只在这一个地方定义，别写第二个数。 */
export const AWARENESS_THROTTLE_MS = 50

export type RoomDocBundle = {
  doc: Y.Doc
  undoManager: Y.UndoManager
}

/**
 * 房间文档的唯一装配点。
 *
 * - 只有一个 UndoManager，scope = [code, notes, shapes]：撤销一次代码或一笔画都用同一个栈。
 * - 回放页不要用它，用 `createReplayDoc`：回放是只读的，挂 UndoManager 只会让人误以为能改。
 */
export function createRoomDoc(): RoomDocBundle {
  const doc = new Y.Doc()
  const undoManager = new Y.UndoManager(
    [doc.getText('code'), doc.getText('notes'), doc.getMap('shapes')],
    { trackedOrigins: new Set([LOCAL_ORIGIN]) },
  )
  return { doc, undoManager }
}

/** 回放：空文档 + 按时间顺序 applyUpdate。不装 UndoManager。 */
export function createReplayDoc(): Y.Doc {
  return new Y.Doc()
}

/** 本地共享数据写入的唯一入口：保证 origin 一致，否则这一笔撤销不了。 */
export function withLocalOrigin<T>(doc: Y.Doc, fn: () => T): T {
  return doc.transact(fn, LOCAL_ORIGIN)
}
