// 往房间里塞一个图元，用来验证「撤销只撤自己的」。
// 用法：node scripts/add-shape.mjs [颜色]
// 会打印它插入的 shape id；随后在浏览器里按撤销，再用 room-peek 检查这个 id 还在不在。
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const SYNC = 0
const room = process.env.ROOM ?? 'a2b3c4'
const base = `${process.env.ROOM_WS_BASE ?? 'ws://127.0.0.1:8787/parties/main'}/${room}`
const color = process.argv[2] ?? '#f07f8a'
const id = `ext-${Date.now()}`

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
await sleep(1200)

const shapes = doc.getMap('shapes')
shapes.set(id, {
  id,
  type: 'rect',
  x: 120,
  y: 430,
  w: 180,
  h: 90,
  color,
  width: 2,
  userId: 'external-client',
})
await sleep(1200)
console.log(JSON.stringify({ room, inserted: id, total: shapes.size }))
ws.close()
await sleep(200)
process.exit(0)
