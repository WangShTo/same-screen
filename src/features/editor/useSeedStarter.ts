import { useEffect, useRef } from 'react'
import type * as Y from 'yjs'
import type { ConnStatus } from '@/features/presence/usePresence'
import { STARTER } from './starter'

type Options = {
  ydoc: Y.Doc
  status: ConnStatus
  /** 只有点击「创建房间」进来的那个客户端才种骨架 */
  isCreator: boolean
}

/**
 * 创建房间时种一份当前语言的骨架。
 *
 * 时机很重要：必须等 provider 第一次同步完成（status 变成 connected），
 * 否则本地写入会先于服务端状态落地，重连时又可能被覆盖。
 * 用 ref 保证一次会话只尝试一次，不再重复插入。
 */
export function useSeedStarter({ ydoc, status, isCreator }: Options) {
  const seeded = useRef(false)

  useEffect(() => {
    if (!isCreator || seeded.current || status === 'connecting') return
    const code = ydoc.getText('code')
    const meta = ydoc.getMap('meta')
    if (code.length > 0 || meta.get('seeded') === true) {
      seeded.current = true
      return
    }
    seeded.current = true
    ydoc.transact(() => {
      meta.set('lang', 'java')
      meta.set('seeded', true)
      if (code.length === 0) code.insert(0, STARTER.java)
    })
  }, [ydoc, status, isCreator])
}
