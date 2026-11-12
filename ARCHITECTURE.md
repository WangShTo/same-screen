# 同屏 · 技术架构（定版）

> **2026-11-10 定版。** 之后不允许新增技术、不允许新增功能，只允许按 [SPEC.md](./SPEC.md) 第 7 节降级。
> 新想法一律不进本期，最多记进 README 的「以后可能做」。

---

## 1. 选型表

| 层 | 选型 | 为什么是它 | 不选什么，为什么 |
|---|---|---|---|
| 构建 | Vite + React 19 + TS strict | 冷启动快，简历通用 | Next：不需要 SSR/SEO |
| 样式 | Tailwind v4 + `@tailwindcss/vite` | CSS-first，不写 config | shadcn CLI：会塞一堆没用的文件 |
| 路由 | React Router v7（`createBrowserRouter`） | 4 条路由，够用 | TanStack Router：类型好但学习成本换不来收益 |
| UI 态 | Zustand | 50 行，只放 UI 态 | Redux：为共享数据准备的，这里共享数据归 Yjs |
| 代码编辑 | CodeMirror 6 | 体积小、Yjs 绑定官方维护 | Monaco：2MB+，移动端直接跪 |
| 代码同步 | `y-codemirror.next` 的 `yCollab` | 双向绑定，光标也走 awareness | 手写绑定：重复造轮子，坑在选区映射 |
| 画板 | Konva + `react-konva` | 图元模型天然对应 Y.Map | 原生 canvas：要手写命中测试/重绘；tldraw：整包，等于没做 |
| 协同内核 | Yjs | CRDT，离线可合并 | 自研 OT：7 天做不完 |
| 光标 | `y-protocols/awareness` | 官方，不进文档 | 自己传 WebSocket 消息：要手写心跳和过期 |
| 服务端 | `partyserver` + `y-partyserver` | PartyKit 关停后的官方继任者，房间/持久化/自定义消息都给好了 | 自建 Node + ws：多一台服务器、多一份运维 |
| 存储 | Durable Object `ctx.storage`（SQLite） | 跟房间同生命周期，零配置 | 外接 Postgres/Redis：7 天里纯负担 |
| 部署 | `wrangler deploy` 单 Worker（含前端 assets） | 一个账号一条命令、同域免 CORS | Cloudflare Pages + 单独 Worker：两个平台、要处理 CORS |
| 图标 | `lucide-react` | 按需 tree-shake | 图标字体：多一次请求 |

**明确不引入**：测试框架（工期不够，用每日人工闸门替代）、`any`、`tailwind-merge`、`nanoid`（用 `crypto`）、`lodash`。

---

## 2. 分层

```
┌──────────────────────────────────────────────────────┐
│ UI 层  src/pages · src/features/*/components          │
│ 只读 Yjs 数据，改数据只调 lib/ 里的函数                 │
└───────────────────────┬──────────────────────────────┘
                        │ hooks：useYText / useYMap / usePresence / useTimer
┌───────────────────────▼──────────────────────────────┐
│ 领域层  src/lib · src/features/*/logic                 │
│ 纯 TS，**不 import react**，可被回放页复用              │
└───────────────────────┬──────────────────────────────┘
                        │ Y.Doc + Awareness 实例
┌───────────────────────▼──────────────────────────────┐
│ 连接层  lib/yjs.ts                                    │
│ YProvider（自动重连 / 指数退避 / 状态事件）             │
└───────────────────────┬──────────────────────────────┘
                        │ WebSocket（同域 /parties/main/:room）
┌───────────────────────▼──────────────────────────────┐
│ 服务端  worker/  (Cloudflare Worker + Durable Object) │
│ Room extends YServer：doc 生命周期 / 日志 / 快照        │
│ onRequest：回放数据 HTTP 接口                          │
└───────────────────────┬──────────────────────────────┘
                        │ this.ctx.storage
                  DO SQLite（房间一份，互不干扰）
```

**一条铁律**：UI 层永远不直接 `new Y.Doc`。doc 只在 `lib/yjs.ts` 里造，通过 React Context 下发。回放页造第二份（只读），不与之混。

---

## 3. 目录（最终版，不再增减）

```
.
├─ AGENTS.md  SPEC.md  ARCHITECTURE.md  README.md
├─ wrangler.jsonc  vite.config.ts  tsconfig.json  index.html  package.json
├─ docs/
│  ├─ LOG.md              每日三行
│  └─ shots/              day0.png … day7.png
├─ public/og.png
├─ src/
│  ├─ main.tsx
│  ├─ app/{router.tsx, providers.tsx, styles.css}
│  ├─ pages/{Landing, Room, Replay}.tsx
│  ├─ features/
│  │  ├─ room/{CreateJoin, ShareMenu, MemberList, roomCode}.tsx
│  │  ├─ editor/{CodePane.tsx, setup.ts, lang.ts}
│  │  ├─ canvas/{Board.tsx, ShapeNode.tsx, tools.ts, useDrawing.ts, export.ts}
│  │  ├─ presence/{CursorLayer.tsx, status.ts}
│  │  ├─ timer/{Timer.tsx, useTimer.ts}
│  │  ├─ notes/NotesPane.tsx
│  │  └─ replay/{Player.ts, Timeline.tsx}
│  ├─ components/{Button, Avatar, StatusDot, Panel, Tabs, Modal}.tsx
│  ├─ lib/{yjs.ts, identity.ts, presence.ts, replay.ts, time.ts, env.ts}
│  └─ types.ts
└─ worker/{index.ts, Room.ts, log.ts}
```

约 40 个源文件。超过 50 个就是拆错了。

---

## 4. 数据模型

```ts
// Y.Doc（房间唯一真源）
ydoc.getText('code')            // Y.Text   共享代码
ydoc.getText('notes')           // Y.Text   笔记/题目
ydoc.getMap<Shape>('shapes')    // Y.Map    图元，value 为普通对象
ydoc.getMap<MetaValue>('meta')  // Y.Map    **一 key 一值**
```

```ts
type MetaValue = string | number | boolean | null
// title         : string
// lang          : 'java' | 'python' | 'javascript'
// timerDuration : 45 | 60
// timerEndsAt   : number | null   绝对时间戳
// timerRemaining: number          暂停时的剩余 ms
// timerRunning  : boolean
// createdAt     : number
```

```ts
type Shape = {
  id: string
  type: 'pen' | 'rect' | 'arrow' | 'text'
  points?: number[]                  // pen
  x?: number; y?: number; w?: number; h?: number
  text?: string
  color: string
  width: number
  userId: string
  updatedAt: number
}
```

```ts
// DO storage 键
'log:<room>:<seq6>'  → { seq, t, u: ArrayBuffer }   // t = 相对 createdAt 的 ms
'snap:<room>:<seq6>' → Uint8Array                     // 每 50 条或每 30s
'doc:<room>'         → Uint8Array                     // onSave 全量
'seq:<room>'         → number                         // 当前最大序号
```

**不做嵌套 Y 类型**（points 不做 Y.Array）。value 整体 set，LWW。写进已知限制。

---

## 5. 十个关键实现

### 5.1 连接与重连

```ts
// lib/yjs.ts
export function createProvider(doc: Y.Doc, room: string, user: Identity) {
  return new YProvider(workerHost(), room, doc, {
    party: 'main',
    connect: true,
    resyncInterval: -1,          // 靠 CRDT 差量同步，不需要轮询
    maxBackoffTimeout: 5000,     // 断线 5s 内回来，界面上看不出事
    params: () => ({ uid: user.id, name: user.name, color: user.color }),
  })
}
```

- 状态来源：provider 的 `status` 事件（`connected | connecting | disconnected`）→ 映射成三色点（绿/黄/红）
- **断线不丢**不是因为做了缓存，是因为 Yjs 本身就是本地优先：断线期间编辑进本地 doc，重连后自动发状态向量做差量。**不要自己写缓存层**，会重复。
- 组件卸载顺序必须：`provider.destroy()` → `ydoc.destroy()`，反了会留监听。

### 5.2 代码绑定

```ts
// features/editor/setup.ts
export function buildExtensions(ytext: Y.Text, awareness, undoManager) {
  return [
    lineNumbers(), highlightActiveLine(), foldGutter(),
    bracketMatching(), indentOnInput(), syntaxHighlighting(defaultHighlight),
    keymap.of([...defaultKeymap, ...searchKeymap, ...historyKeymap]), // ← 不要 history() 扩展
    oneDark,
    EditorView.lineWrapping,
    yCollab(ytext, awareness, { undoManager }),
    keymap.of(yUndoManagerKeymap),
  ]
}
```

三个必须写死的点：

1. **绝对不用 `basicSetup`** —— 它内部含 `history()`，会和 `Y.UndoManager` 打架，表现是 Ctrl+Z 撤掉别人的输入。手写上面这份列表。
2. **切语言用 `Compartment`**，不重建编辑器：
   ```ts
   const langCompartment = new Compartment()
   view.dispatch({ effects: langCompartment.reconfigure(java()) })
   ```
   重建会丢 yCollab 绑定和光标。语言写进 `meta.lang`，两端同步切换。
3. `undoManager` 的 scope 是 `[code, notes, shapes]`，`trackedOrigins` 只放本地 origin，且每次本地事务都要带这个 origin：
   ```ts
   import { withLocalOrigin } from '@/lib/ydoc'
   withLocalOrigin(ydoc, () => { /* ... */ })   // 内部就是 ydoc.transact(fn, LOCAL_ORIGIN)
   ```
   文档只有 `src/lib/ydoc.ts` 的 `createRoomDoc()` 一个装配点；回放页用 `createReplayDoc()`（空文档，不装 UndoManager）。
   CodeMirror 的输入**不用手动加 origin**：y-codemirror.next 的 `YUndoManagerPlugin` 挂载时自己 `addTrackedOrigin(syncConf)`，卸载时移除（`node_modules/y-codemirror.next/src/y-undomanager.js:98`）。

### 5.3 笔记：也用 CodeMirror

**不用受控 `<textarea>` + Y.Text。** 受控 textarea 每次 setState 会把光标弹到末尾；手动做 diff 又要处理并发插入。直接复用 5.2 的绑定，加个 `readOnly: false` + 隐藏行号 + 小字号即可，代码量 5 行。

### 5.4 画笔（本地实时 → 抬笔提交）

```
pointerdown  → 本地 state 建临时笔迹，记录起点
pointermove  → 追加点，更新本地 <Line>（不碰 Yjs，60fps 无网络压力）
pointerup    → shapes.set(id, {type:'pen', points, color, width, userId})
```

矩形/箭头同构：`pointermove` 只更新本地预览图元，`pointerup` 才 `set`。
**一次绘制 = 一个 `ydoc.transact(fn, localOrigin)`**，undo 才是一笔一撤而不是一点一撤。

### 5.5 橡皮

`stage.getIntersection(stage.getPointerPosition())` → 拿到命中的 Konva 节点 → 读 `node.id()` → `shapes.delete(id)`。
按住拖动时用 `pointermove` 持续命中删除。**不做像素擦除**，不做 mask 层。

### 5.6 光标

```ts
// 进入画板时
awareness.setLocalStateField('board', { x, y })   // AWARENESS_THROTTLE_MS = 50（src/lib/ydoc.ts）
// 离开画板/切到代码 Tab
awareness.setLocalStateField('board', null)        // 必须置 null，否则光标卡在原地
```

渲染层订阅 `awareness.on('change')`，把 `getStates()` 里带 `board` 的项画成小三角 + 名字标签（12px）。**光标不进 Y.Doc。**

### 5.7 计时

```ts
// 开始
meta.set('timerEndsAt', Date.now() + duration * 60_000)
meta.set('timerRunning', true)
// 暂停
meta.set('timerRemaining', endsAt - Date.now())
meta.set('timerRunning', false); meta.set('timerEndsAt', null)
```

本地 `setInterval(200)` 算 `remaining = endsAt - now`，只在归零时提示"时间到"。**绝不把倒计时写进文档**。
已知限制：以设置者本地时钟为准，两人设备差 >5s 时显示不同步。

### 5.8 服务端：日志 + 快照 + 读取接口

```ts
// worker/Room.ts
export class Room extends YServer {
  private seq = 0
  async onStart() {
    await super.onStart()                  // 必须！父类在这里注册 update 广播监听、调 onLoad
    this.document.on('update', (u: Uint8Array, origin: unknown) => {
      if (origin === this) return          // 忽略服务端自己产生的
      this.appendLog(u)
    })
  }
  private async appendLog(u: Uint8Array) {
    const t = Date.now() - this.createdAt
    const seq = ++this.seq
    await this.ctx.storage.put(`log:${this.name}:${pad(seq)}`, { seq, t, u })
    if (seq % 50 === 0) {
      await this.ctx.storage.put(`snap:${this.name}:${pad(seq)}`, Y.encodeStateAsUpdate(this.document))
    }
  }
  async onRequest(req: Request) {
    const u = new URL(req.url)
    if (u.searchParams.has('replay')) return Response.json(await readReplay(this))
    return new Response('Not Found', { status: 404 })
  }
}
```

- `seq` 冷启动从 `ctx.storage.list({prefix:'log:'})` 取最大值恢复
- 回放接口返回 `{ entries: [{seq, t, u: base64}], snapshot: {seq, u: base64} | null }`
- 单 value 上限 128 KiB（DO 限制），Yjs update 通常 < 10 KB，够用

> ⚠️ 唯一未验证点：`this.document` 收到远端 update 时 `origin` 是否为连接对象。Day 0 打钩。
> 若不成立 → 客户端在本地事务后 `provider.sendMessage({type:'log', u})` 上报，服务端落库。多约半天。

### 5.9 回放播放器

```ts
// features/replay/Player.ts
const doc = new Y.Doc()
let cursor = 0
function seek(targetMs: number) {
  doc.transact(() => { /* 清空重建 */ })
  Y.applyUpdate(doc, snapshot)            // 最近的快照
  cursor = snapshotSeq
  while (entries[cursor + 1] && entries[cursor + 1].t <= targetMs) Y.applyUpdate(doc, entries[++cursor].u)
}
```

- rAF 驱动时钟，倍速只改步长（`delta * rate`）
- 时间轴拖动 = `seek()`，重建成本在 200 条以内可忽略
- 渲染层：同一个 `<CodePane readonly>` 和 `<Board readonly>`，把 `ydoc` 换成 replayDoc 即可。**不写第二套渲染**

### 5.10 移动端与布局

- 高度用 `100dvh`（iOS 地址栏），不用 `100vh`
- 画布容器 `touchAction: 'none'`，否则 Konva 拖拽会被浏览器滚动吃掉
- 工具栏 `<div className="flex overflow-x-auto">`，单行可横滑，页面本身 `overflow-x: hidden`
- 断点：`<768px` 为「顶栏精简 + 侧栏抽屉」，`>=768` 为「左栏 + 主区」
- 至少在一台真机 iPhone Safari 上验一次，模拟器不算

---

## 6. 服务端配置

```jsonc
// wrangler.jsonc
{
  "name": "same-screen",
  "main": "worker/index.ts",
  "compatibility_date": "2026-11-01",
  "compatibility_flags": ["nodejs_compat"],
  "durable_objects": {
    "bindings": [{ "name": "Main", "class_name": "Room" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["Room"] }],
  "assets": { "directory": "./dist", "not_found_handling": "single-page-application" }
}
```

```ts
// worker/index.ts
import { routePartykitRequest } from 'partyserver'
export { Room } from './Room'
export default {
  async fetch(req, env) {
    return (await routePartykitRequest(req, env)) ?? env.ASSETS.fetch(req)
  }
} satisfies ExportedHandler<Env>
```

> 路由规则（实测）：`/parties/<绑定名的 kebab-case>/<房间码>`。绑定叫 `Main`，所以客户端连 `/parties/main/a2b3c4`；写成 `/parties/Main/...` 会直接 400 `does not match any server namespace`。

**前端和 Worker 同一个部署单元**：`/parties/*` 走 WebSocket，其余走 assets。同域 → 零 CORS、零环境变量、一个链接。

---

## 7. 命令

```bash
# 安装
pnpm install                      # 若沙箱拦全局 store：pnpm --store-dir ./.pnpm-store install

# 开发（两个终端）
npx wrangler dev --port 8787      # 服务端
pnpm dev                          # 前端 :5173，vite proxy 把 /parties 转到 8787

# 首次授权
npx wrangler login

# 部署
pnpm build && npx wrangler deploy
```

`vite.config.ts` 里：

```ts
server: { proxy: { '/parties': { target: 'http://127.0.0.1:8787', ws: true } } }
```

`lib/env.ts`：`export const workerHost = () => import.meta.env.DEV ? '127.0.0.1:8787' : location.host`

---

## 8. 明确不用（防跑偏）

| 不用 | 原因 |
|---|---|
| `partykit` / `y-partykit` | 托管平台 2026-10-23 关停 |
| tldraw / Excalidraw 整包 | 等于没做 |
| Monaco | 体积，移动端 |
| `basicSetup` | 内含 `history()`，与 `Y.UndoManager` 冲突 |
| 图元选择 / 拖动 / 缩放 | 4 个画布工具已够，拖动会带来多选框、层级、变换的连锁复杂度 |
| 第三方 textarea-Yjs 绑定 | 有坑且少人维护，用 CodeMirror 绕开 |
| 测试框架 | 工期不够，每日人工闸门替代 |
| 数据库 | DO storage 已是你的数据库 |
| CORS 中间件 | 同域部署，不需要 |
| `any` | TS strict |
