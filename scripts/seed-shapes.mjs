// 往房间里批量塞图元，用来做 200 图元性能测试。
// 用法：ROOM=t5st2x node scripts/seed-shapes.mjs 200
// 全部图元在同一个事务里写入，避免一条条同步（那是网络测试，不是渲染测试）。
import * as Y from 'yjs'
import * as syncProtocol from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

const SYNC = 0
const room = process.env.ROOM ?? 'a2b3c4'
const base = `${process.env.ROOM_WS_BASE ?? 'ws://127.0.0.1:8787/parties/main'}/${room}`
const count = Number(process.argv[2] ?? 200)
const COLORS = ['#e8edf7', '#6ea8fe', '#7ee0a8', '#f2b878', '#f07f8a']

const doc = new Y.Doc()
const shapes = doc.getMap('shapes')
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

function makeShape(i) {
  const color = COLORS[i % COLORS.length]
  const id = `perf-${Date.now()}-${i}`
  const kind = i % 3
  if (kind === 0) {
    // 矩形：铺成网格
    return [
      id,
      {
        id,
        type: 'rect',
        x: 40 + (i % 20) * 34,
        y: 40 + Math.floor(i / 20) * 30,
        w: 26,
        h: 22,
        color,
        width: 2,
        userId: 'perf',
      },
    ]
  }
  if (kind === 1) {
    // 箭头
    return [
      id,
      {
        id,
        type: 'arrow',
        points: [40 + (i % 20) * 34, 60 + Math.floor(i / 20) * 30, 70 + (i % 20) * 34, 80 + Math.floor(i / 20) * 30],
        color,
        width: 2,
        userId: 'perf',
      },
    ]
  }
  // 自由笔迹：每条 12 个点
  const points = []
  const ox = 40 + (i % 20) * 34
  const oy = 40 + Math.floor(i / 20) * 30
  for (let p = 0; p < 12; p += 1) points.push(ox + p * 2, oy + Math.sin(p / 2) * 8)
  return [id, { id, type: 'pen', points, color, width: 2, userId: 'perf' }]
}

ws.addEventListener('open', () => {
  setTimeout(() => {
    doc.transact(() => {
      for (let i = 0; i < count; i += 1) {
        const [id, shape] = makeShape(i)
        shapes.set(id, shape)
      }
    })
    setTimeout(() => {
      console.log(JSON.stringify({ inserted: count, totalInDoc: shapes.size, room }))
      process.exit(0)
    }, 1200)
  }, 600)
})

setTimeout(() => {
  console.error('timeout')
  process.exit(1)
}, 20000)
