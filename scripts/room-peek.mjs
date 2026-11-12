// 看一眼房间里的真实内容（不依赖浏览器）。
// 用法：
//   node scripts/room-peek.mjs                 打印 code / notes / meta
//   node scripts/room-peek.mjs "// 追加一行"    打印后再往 code 末尾追加一行
// 环境变量：ROOM=房间码（默认 a2b3c4）、ROOM_WS_BASE（默认 ws://127.0.0.1:8787/parties/main）
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const SYNC = 0
const room = process.env.ROOM ?? 'a2b3c4'
const base = `${process.env.ROOM_WS_BASE ?? 'ws://127.0.0.1:8787/parties/main'}/${room}`
const append = process.argv[2]

const doc = new Y.Doc()
const ws = new WebSocket(base)
ws.binaryType = 'arraybuffer'

ws.addEventListener('open', () => {
  const enc = encoding.createEncoder()
  encoding.writeVarUint(enc, SYNC)
  syncProtocol.writeSyncStep1(enc, doc)
  ws.send(encoding.toUint8Array(enc))
})

ws.addEventListener('message', (ev) => {
  const dec = decoding.createDecoder(new Uint8Array(ev.data))
  if (decoding.readVarUint(dec) !== SYNC) return
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(1500)

const code = doc.getText('code').toString()
const notes = doc.getText('notes').toString()
const meta = Object.fromEntries(doc.getMap('meta').entries())
console.log(JSON.stringify({ room, codeLen: code.length, code, notes, meta }, null, 2))

if (append) {
  doc.getText('code').insert(code.length, `\n${append}`)
  await sleep(900)
  console.log('APPENDED')
}

ws.close()
await sleep(200)
process.exit(0)
