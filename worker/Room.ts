import { YServer } from 'y-partyserver'

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
 */
export class Room extends YServer {
  async onStart() {
    await super.onStart()
    console.log(`[room] ${this.name} started (code=${this.document.getText('code').length})`)
  }
}
