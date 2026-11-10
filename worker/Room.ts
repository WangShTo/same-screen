import { YServer } from 'y-partyserver'

/**
 * 一个房间 = 一个 Durable Object。
 * YServer 负责 Yjs 协议握手、update 广播，以及 doc 的加载/保存。
 */
export class Room extends YServer {
  async onStart() {
    console.log(`[room] ${this.name} started`)
  }
}
