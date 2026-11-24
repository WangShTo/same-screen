import { useCallback, useEffect, useState } from 'react'
import type YProvider from 'y-partyserver/provider'
import type * as Y from 'yjs'
import { createRoomProvider } from '@/lib/provider'
import { createRoomDoc, withLocalOrigin } from '@/lib/ydoc'
import { isLang, type Lang } from '@/features/editor/languages'
import type { Identity } from '@/lib/identity'

export type UndoState = { undo: number; redo: number }

export type RoomSession = {
  doc: Y.Doc
  undoManager: Y.UndoManager
  provider: YProvider | null
  /** 首次与服务端同步完成；没同步完就挂编辑器会出现「文档有内容、编辑器空白」 */
  synced: boolean
  /** 同步过一次之后一直为 true：断线时不能卸载编辑器，否则用户眼前的内容会消失 */
  everSynced: boolean
  lang: Lang
  setLang: (next: Lang) => void
  undoState: UndoState
}

/**
 * 房间会话：一个 Y.Doc、一个 Provider、一个 UndoManager，生命周期跟页面一致。
 * 共享数据只从 Yjs 读，这里不额外存一份 React state。
 */
export function useRoomSession(roomId: string, identity: Identity): RoomSession {
  const [bundle] = useState(createRoomDoc)
  const [provider, setProvider] = useState<YProvider | null>(null)
  const [lang, setLangState] = useState<Lang>('java')
  const [undoState, setUndoState] = useState<UndoState>({ undo: 0, redo: 0 })
  const [synced, setSynced] = useState(false)
  const [everSynced, setEverSynced] = useState(false)

  // 连接：必须等 effect 里建，避免 React 渲染期出现副作用
  useEffect(() => {
    const next = createRoomProvider(bundle.doc, roomId)
    next.awareness.setLocalStateField('user', {
      name: identity.name || '访客',
      color: identity.color,
    })
    const onSynced = (state: boolean) => {
      setSynced(state)
      if (state) setEverSynced(true)
    }
    next.on('synced', onSynced)
    setSynced(next.synced)
    if (next.synced) setEverSynced(true)
    setProvider(next)
    return () => {
      next.off('synced', onSynced)
      setProvider(null)
      setSynced(false)
      next.destroy()
    }
  }, [bundle.doc, roomId, identity.name, identity.color])

  // 语言跟随 meta.lang（所有人看到同一个语言）
  useEffect(() => {
    const meta = bundle.doc.getMap<unknown>('meta')
    const sync = () => {
      const value = meta.get('lang')
      if (isLang(value)) setLangState(value)
    }
    meta.observe(sync)
    sync()
    return () => meta.unobserve(sync)
  }, [bundle.doc])

  // 撤销/重做按钮的可用状态
  useEffect(() => {
    const manager = bundle.undoManager
    const sync = () => setUndoState({ undo: manager.undoStack.length, redo: manager.redoStack.length })
    manager.on('stack-item-added', sync)
    manager.on('stack-item-popped', sync)
    manager.on('stack-cleared', sync)
    sync()
    return () => {
      manager.off('stack-item-added', sync)
      manager.off('stack-item-popped', sync)
      manager.off('stack-cleared', sync)
    }
  }, [bundle.undoManager])

  const setLang = useCallback(
    (next: Lang) => {
      withLocalOrigin(bundle.doc, () => {
        bundle.doc.getMap<unknown>('meta').set('lang', next)
      })
    },
    [bundle.doc],
  )

  return {
    doc: bundle.doc,
    undoManager: bundle.undoManager,
    provider,
    synced,
    everSynced,
    lang,
    setLang,
    undoState,
  }
}
