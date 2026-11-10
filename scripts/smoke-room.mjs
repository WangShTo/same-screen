// 冒烟测试：验证房间真的能同步。
// 用法：npm run worker 先起来（沙箱环境需把 TEMP/TMP 指到工作区内），然后 node scripts/smoke-room.mjs
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const base = process.env.ROOM_WS ?? 'ws://127.0.0.1:8787/parties/main/smoke01'
const SYNC = 0
const verbose = process.env.VERBOSE === '1'

function connect(doc, label) {
  const ws = new WebSocket(base)
  ws.binaryType = 'arraybuffer'

  ws.addEventListener('open', () => {
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, SYNC)
    syncProtocol.writeSyncStep1(enc, doc)
    ws.send(encoding.toUint8Array(enc))
    console.log(`[${label}] open`)
  })

  ws.addEventListener('close', (ev) => console.log(`[${label}] close`, ev.code, ev.reason || ''))
  ws.addEventListener('error', (e) => console.log(`[${label}] error`, e?.message ?? String(e)))

  ws.addEventListener('message', (ev) => {
    const data = new Uint8Array(ev.data)
    if (verbose) console.log(`[${label}] recv ${data.length}B`)
    const dec = decoding.createDecoder(data)
    const type = decoding.readVarUint(dec)
    if (type !== SYNC) {
      if (verbose) console.log(`[${label}] 非 sync 消息 type=${type}`)
      return
    }
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, SYNC)
    syncProtocol.readSyncMessage(dec, enc, doc, ws)
    if (encoding.length(enc) > 1 && ws.readyState === WebSocket.OPEN) ws.send(encoding.toUint8Array(enc))
  })

  doc.on('update', (update, origin) => {
    if (origin === ws || ws.readyState !== WebSocket.OPEN) return
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, SYNC)
    syncProtocol.writeUpdate(enc, update)
    ws.send(encoding.toUint8Array(enc))
  })

  return ws
}

const docA = new Y.Doc()
const docB = new Y.Doc()
const a = connect(docA, 'A')
const b = connect(docB, 'B')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fail = (msg) => {
  console.log('FAIL ' + msg)
  process.exit(1)
}

await sleep(800)
docA.getText('code').insert(0, 'public class Main {}')
await sleep(600)
const gotB = docB.getText('code').toString()
console.log('B 收到 A 的代码:', JSON.stringify(gotB))
if (gotB !== 'public class Main {}') fail('A → B 没有同步')

docB.getText('code').insert(15, ' // hi')
await sleep(600)
const gotA = docA.getText('code').toString()
console.log('A 收到 B 的追加:', JSON.stringify(gotA))
if (!gotA.includes('// hi')) fail('B → A 没有同步')

// 新客户端进来能不能拿到历史（持久化）
const docC = new Y.Doc()
const c = connect(docC, 'C')
await sleep(1200)
const gotC = docC.getText('code').toString()
console.log('C 后进拿到的历史:', JSON.stringify(gotC))
if (!gotC.includes('public class Ma')) fail('新客户端没拿到已有内容')

console.log('PASS 房间同步正常')

// 断线重连：断开一个客户端，期间另一个继续改，重连后要能补齐
b.close()
await sleep(300)
docA.getText('code').insert(0, '/* 断线期间 */')
const docB2 = new Y.Doc()
const b2 = connect(docB2, 'B2')
await sleep(1500)
const gotReconnect = docB2.getText('code').toString()
console.log('重连后补齐的内容:', JSON.stringify(gotReconnect))
if (!gotReconnect.includes('断线期间')) fail('重连后没有补齐断线期间的内容')
console.log('PASS 断线重连正常')

a.close()
c.close()
b2.close()
await sleep(200)
process.exit(0)
