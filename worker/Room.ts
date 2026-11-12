import { YServer } from 'y-partyserver'
import { STARTER } from './starter'

/**
 * 一个房间 = 一个 Durable Object。
 * YServer 负责 Yjs 协议握手、update 广播，以及 doc 的加载/保存。
 *
 * 注意：YServer.onStart 里才注册 doc update 的广播监听、才调 onLoad，
 * 所以子类重写 onStart 必须调 super.onStart()，否则握手能成功但内容永远同步不过去。
 */
export class Room extends YServer {
  async onStart() {
    await super.onStart()
    await this.seed()
    console.log(`[room] ${this.name} started`)
  }

  /**
   * 首次打开房间时种入默认骨架。
   *
   * 判重不能只看 doc 里有没有内容：DO 重启时 `onLoad` 拿到的可能是空状态，
   * 而客户端手里还留着上一次的内容，双方一合并就会出现两份骨架。
   * 所以用 Durable Object 自己的 storage 打一次性标记 —— 它和 CRDT 文档分开存，
   * 只会有一次 true，重启后也不会再种。
   */
  private async seed() {
    const storage = this.ctx.storage
    if (await storage.get<boolean>('seeded')) return

    const doc = this.document
    const meta = doc.getMap<unknown>('meta')
    const code = doc.getText('code')

    doc.transact(() => {
      meta.set('seeded', true)
      meta.set('lang', 'java')
      if (code.length === 0) code.insert(0, STARTER.java)
    })
    await storage.put('seeded', true)
    console.log(`[room] ${this.name} seeded (code=${code.length})`)
  }
}
