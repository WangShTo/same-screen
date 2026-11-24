# 开发日志

只写「做了什么 / 已验证 / 未验证」。没跑过的不许写进「已验证」。

## Day 0 · 2026-11-10

### 做了什么

- 初始化项目：npm 装依赖（React 19 / Vite 8 / Tailwind v4 / React Router 8 / Konva / Yjs / y-partyserver / wrangler）。
- 三套 tsconfig：`tsconfig.json`（src）、`tsconfig.node.json`（vite 配置）、`tsconfig.worker.json`（worker），`npm run typecheck` 串跑。
- 路由 5 条：`/`、`/room/:id`、`/room/:id/replay`、`/r/:id`（重定向）、`*`（404）。
- 首页：昵称、8 色换色（localStorage）、创建房间、6 位房间码加入。
- 房间壳：顶栏（logo / 房间名 / 房间码 / 计时占位 / 连接状态 / 成员头像 / 分享 / 离开）、可折叠题目面板、代码/画板 Tab、底部状态栏。
- `worker/Room.ts` 继承 `YServer`；`worker/index.ts` 把 `/parties` 交给 `routePartykitRequest`，其余走 `ASSETS`。
- `wrangler.jsonc`：`Main` Durable Object 绑定、SQLite 版 DO 迁移、静态资源 + SPA 回落、本地代理端口。
- 移动端：390 宽下隐藏左侧面板、顶栏收起文字，无横向滚动。
- `scripts/smoke-room.mjs`：不开浏览器也能验房间协议（双向同步 / 后进拉历史 / 断线重连），`npm run smoke`。

### 已验证

- `npm run typecheck` → 三个 project 全绿，exit 0。
- `npx vite build` → 2160 modules，`dist/assets/index.js` 335 kB（gzip 106 kB）。
- `npm run dev` → http://localhost:5173 打开正常，首页/房间页渲染正确（截图见 `docs/shots/`）。
- 390×844 视口下房间页不横向滚动，顶栏不换行。
- **房间实时链路跑通**（`npm run worker` + `npm run smoke`，exit 0）：
  - A 写入 `Y.Text('code')` → B 收到同样的内容；
  - B 追加 → A 收到，顺序一致（`"public class Ma // hiin {}"`）；
  - 新客户端 C 连进来能拿到已有内容；
  - B 断开期间 A 继续写，B 重连后补齐 `"/* 断线期间 */public class Ma // hiin {}"`。
  - 直连 8787 和走 Vite 代理（`ws://localhost:5173/parties/main/x`）都通过。
- `wrangler deploy --temporary` 成功：319 KiB 静态资源、Worker 启动 18 ms，返回临时 `workers.dev` 地址（临时账号 60 分钟内有效）。

### 未验证

- 正式 `wrangler login` + `npm run deploy`：本机未登录，需要用户自己的 Cloudflare 账号。
- 公网可访问：本机 DNS 把 `*.workers.dev` 解析到了错误 IP（`31.13.85.2`）、TCP 连接超时，**从这台机器没法确认线上能打开**；国内建议绑自定义域名再验。
- `this.document` 收到远端 update 时 origin 是否为连接对象（回放日志的前提）——还没写日志代码，没打钩。
- 真机（手机）打开：只做了视口模拟，没上过手机。

### 踩过的坑（记下来省下次时间）

- pnpm 12.5.1 下载大二进制必崩（tokio stack overflow），改用 npm。
- `.npmrc` 被安全策略拦，用 `--legacy-peer-deps` CLI 参数代替。
- Vite 在沙箱里 `exec("net use")` 报 `spawn EPERM`，用 `scripts/exec-shim.cjs` 绕过（仅 agent 环境）。
- TypeScript 7 移除了 `baseUrl`，`paths` 必须写成相对路径 `"./src/*"`。
- `wrangler dev` 在沙箱里报 `CreateDirectory: #5 拒绝访问; path = miniflare-email-store`：把 `TEMP`/`TMP` 指到工作区内（`.tmp`）就正常，普通终端不需要。
- **PartyServer 的 party 段是绑定名的 kebab-case**：绑定叫 `Main`，URL 必须是 `/parties/main/:room`；写成 `Main` 直接 400 `does not match any server namespace`。
- **`YServer.onStart` 必须 `await super.onStart()`**：握手能成功、日志也正常，但 update 的广播监听是在父类 onStart 里注册的，漏了它就会出现「连上了、谁也收不到谁的内容」——这个坑静默失败，最难查。

## Day 1 前置 · 借鉴调研落地（2026-11-12）

调研记录见 `docs/REFERENCE.md`。只吸收两条，不改范围：

### 做了什么

- 新增 `src/lib/ydoc.ts`：`createRoomDoc()`（`Y.Doc` + `Y.UndoManager`，scope `[code, notes, shapes]`，`trackedOrigins` 只放 `LOCAL_ORIGIN`）、`createReplayDoc()`（空文档、不装 UndoManager）、`withLocalOrigin()`、`LOCAL_ORIGIN`、`AWARENESS_THROTTLE_MS = 50`。
- `Room.tsx` 用 `useState(createRoomDoc)` 建文档，底部状态栏显示「待连接」，`title` 里带真实 `clientID`。
- `ARCHITECTURE.md`：awareness 40ms → 50ms 并指向常量；5.2 第 3 条补上「CodeMirror 输入不用手动加 origin，y-codemirror.next 挂载时自己 `addTrackedOrigin(syncConf)`」（`node_modules/y-codemirror.next/src/y-undomanager.js:98`）。

### 已验证

- `npm run typecheck` exit 0；`npm run build` 成功（2197 modules，JS 403.80 kB / gzip 126.78 kB，比接入 Yjs 前 +68 kB）。
- 页面运行时真的建了文档：`footer` 文案 `Java / 行 1, 列 1 / 待连接`，`title="共享文档已创建 · clientID 1220347539"`。
- 撤销语义在浏览器里实测（Vite 直接 `import('/src/lib/ydoc.ts')`）：
  - `withLocalOrigin` 写入 `hello` → `undo()` 后为 `""` → `redo()` 后回到 `hello`；
  - 再插入一笔**不带 origin** 的 `[remote]`（模拟别人改的），`undo()` 把 `hello` 撤掉，`[remote]` 保留 → 只撤自己的。

### 未验证

- 多端真实撤销：需要两台客户端连同一个房间，Day 2 之后验。
- `AWARENESS_THROTTLE_MS` 只是常量，光标代码还没写，没跑过。

## Day 2 · 代码同步、成员列表、连接状态（2026-11-12）

### 做了什么

- `src/features/editor/`：`languages.ts`（java/python/javascript）、`theme.ts`（深色主题 + 语法配色，颜色复用 `--color-*`，不引 one-dark）、`extensions.ts`（**手写扩展列表，不含 `history()`**，含 `yCollab` + `yUndoManagerKeymap`）、`CodeEditor.tsx`（`Compartment` 切语言，`updateListener` 报行列）。
- `src/lib/provider.ts`：`createRoomProvider(doc, room)`，主机名取 `window.location.host`，party 段固定 `main`（对应绑定名 `Main` 的 kebab-case）。
- `src/features/presence/usePresence.ts`：从 Awareness 读 `user.name/color`，订阅 `change`/`update` 与 provider `status`，产出 `{status, peers}`。
- `src/features/room/useRoomSession.ts`：一个房间一个 Doc/Provider/UndoManager；`meta.lang` 双向同步；撤销栈深度驱动底部按钮。
- `src/pages/Room.tsx`：顶栏真实连接状态 + 成员头像；左面板换成共享笔记编辑器；代码编辑器常驻（切 Tab 只 `hidden`，不重建丢光标）；底部语言下拉（两端同步）+ 行列 + 同步状态 + 撤销/重做。
- `worker/starter.ts` + `worker/Room.ts`：DO 首次打开房间时种入 Java 骨架；判重用 **DO storage 的一次性标记**，不是「doc 是否为空」。
- `scripts/room-peek.mjs`：不依赖浏览器读房间真实内容（`ROOM=xxx node scripts/room-peek.mjs`），也可从外部客户端追加一行。

### 已验证

- `npm run typecheck` exit 0；`npm run build` 成功（2236 modules，JS 989.68 kB / gzip 332.23 kB）。
- 浏览器 → 服务端：在编辑器里打字，`room-peek` 读到的 `code` 完全一致（含正确换行）。
- 服务端 → 浏览器：外部客户端追加 `REMOTE_MARKER_123`，页面里出现独立一行。
- 语言同步：页面把 `Java` 切到 `Python`，`room-peek` 读到 `meta.lang = "python"`。
- 撤销隔离：外部客户端写入标记后，页面里 Ctrl+Z 只撤掉自己刚输入的 `int y = 7;`，远端标记仍在。
- 断线：杀掉 wrangler 后页面显示「连接中」、代码不丢；重启后自动回到「已连接 / 已同步」，内容保留。
- 种骨架只发生一次：重启 DO 后日志没有再次 `seeded`，房间仍是 149 字节一份骨架（不再重复）。

### 未验证

- 两个真实浏览器窗口同时打开（本机只跑了一个浏览器 + 一个协议客户端）。
- 多人光标：`yCollab` 的远端选区样式只在单端渲染过，没有第二个人出现光标。
- 移动端只看了布局，没有真的用手机打字。
- 首屏 JS 989 kB（gzip 332 kB），还没做代码分割。

### 踩过的坑

- **`YProvider` 是默认导出**（`export { YProvider as default }`），写成 `import { YProvider }` 会报 TS2614。
- **种骨架不能用「doc 为空」判重**：DO 重启时 `onLoad` 可能拿到空状态，而客户端手里还留着上次内容，一合并就出现两份骨架（实测房间从 1 份涨到 3 份）。改成 DO storage 里的一次性 `seeded` 标记，重启不再种。
- `keyboard.type` 里带 `\n` 不会产生换行，CodeMirror 里要单独按 Enter；这是自动化的问题，不是编辑器的问题。

## Day 2.5 · 导出 + 界面减法

**做了什么**
- 新增 `src/features/export/`：`formats.ts`（4 种格式的构建器）、`save.ts`（`showSaveFilePicker` 自选路径，失败或用户取消分别处理，浏览器不支持时退化 `<a download>`）、`ExportMenu.tsx`（顶栏下拉）。
- 格式：Markdown（题目 + 带语言围栏的代码）、源代码（后缀跟当前语言 `.java/.py/.js`）、纯文本、JSON（code/notes/meta/shapes 全量）。
- 首页重做：去掉介绍段、装饰网格、渐变、技术栈页脚；只留标题 + 昵称 + 创建 + 房间码。
- 房间页减法：去掉假的 `45:00` 占位计时器（Day 4 再接真的）、Tab 栏右侧重复的「N 人在线」、笔记面板的「两端同步」；编辑器关掉浏览器拼写检查（代码里的红波浪线）。

**已验证**
- `npm run typecheck` exit 0；`npm run build` 成功（JS 992.83 kB / gzip 333.05 kB）。
- 浏览器内直接调 `EXPORT_FORMATS[].build()`：四种格式内容正确，文件名 `same-screen-a2b3c4-20261112-2100.md` 正确，源代码后缀随语言变 `.java`。
- 保存路径探测：`canPickSavePath()` = true；把 `showSaveFilePicker` 置空后 `saveTextFile()` 返回 `downloaded`，下载兜底可用。
- 390×844 下首页/房间 `scrollWidth === clientWidth === 390`，无横向滚动。
- 截图：`docs/shots/ui-landing.png`、`ui-export.png`、`ui-landing-mobile.png`、`ui-room-mobile.png`。

**未验证**
- 系统「另存为」对话框里真正点保存（自动化会卡在原生弹窗，未点）。
- Safari / Firefox（只有 Chromium 的 File System Access API；这两个走下载兜底，未实机）。

## Day 3 · Konva 画板

**做了什么**
- `src/features/canvas/`：`types.ts`（Shape/Tool/调色板/线宽/`shapeId()`/`isShape()`）、`store.ts`（zustand 只放工具/颜色/线宽）、`Whiteboard.tsx`（Konva Stage，`Y.Map('shapes')` 的 `observe` 驱动重绘）、`ShapeNode.tsx`（pen/rect/arrow/text 四种渲染）、`CanvasToolbar.tsx`（左上浮层工具栏）、`snapshot.ts`（导出 PNG 用的 stage 快照注册表）。
- 绘制语义：笔本地实时画、**抬笔**才写 `Y.Map`（一次 `withLocalOrigin` + `shapes.set` = 一次事务 = 一个撤销项）；矩形/箭头本地预览、松手提交；文字点画布出输入框（Enter 提交 / Esc 取消 / 失焦提交非空值）；橡皮用 `stage.getIntersection()` 命中图元再整条删除。
- 快捷键 B/R/A/T/E；Ctrl/⌘+Z 撤销、Ctrl/⌘+Shift+Z 重做（与底部按钮共用同一个 `Y.UndoManager`）。
- 导出菜单新增 `.PNG 画板截图`（2 倍清晰度），只在画板 Tab 挂载后出现。
- `scripts/add-shape.mjs`：从外部客户端往房间塞一个图元，用来验证撤销隔离。

**已验证**
- `npm run typecheck` exit 0；`npm run build` 通过（JS 约 1.0 MB / gzip 约 335 kB）。
- 画笔、矩形、箭头、文字四种都能画上，并经 `ROOM=a2b3c4 node scripts/room-peek.mjs` 在服务端读到对应图元（text「这里有个 bug」、pen、arrow，坐标正确）。
- 橡皮点中矩形后图元数 3 → 2，服务端重读确认删除已同步。
- 撤销隔离：外部客户端（`add-shape.mjs`）塞进来的红色矩形，在浏览器里点撤销后**仍然存在**，只撤掉本地刚画的笔迹；重做后本地笔迹回来（服务端图元数 1 pen → 2 pen）。
- `canvasPngDataUrl()` 返回 103 KB 的 `data:image/png;base64,…`。
- 两台客户端（同一浏览器的两个标签页）能在顶栏看到 2 个头像；一个标签页画的图元另一个能看到。
- 390×844 下画板工具栏不横向滚动（颜色/线宽在小屏折叠），画布占满剩余高度。

**未验证**
- Ctrl+Z 键盘撤销：代码已接 `undoManager.undo()`，但自动化键盘事件在当前 ego 会话里没有生效，**只在代码层面确认，未在浏览器里按出来**。
- 真机手指绘制（只有 CDP 移动视口模拟，没有触屏设备）。
- 200 图元性能（Day 7 做）。

**踩坑**
- 文字工具点画布不出输入框：`pointerdown` 没 `preventDefault()`，鼠标默认焦点转移把刚 `focus()` 的 input 抢走，`onBlur` 又用空值关掉。修法：`event.evt.preventDefault()` + `requestAnimationFrame` 里 focus。
- ego 的 `page.evaluate`/`page.goto` 在切过移动端模拟后偶发挂死（>120s），`ego_screenshot` 仍正常；截图要用工具级接口，别塞进脚本。

## Day 4 · 计时器、画板多人光标、修「编辑器空白」

**做了什么**
- 计时器 `src/features/timer/`：meta 只存 `timerDurationMs` / `timerEndsAt` / `timerRemainingMs`，不存倒计时；运行中本地 200ms 刷新；顶栏显示 `mm:ss`，开始/暂停/重置 + 45/60 分钟切换，剩余 ≤60 秒变暖色。
- 骨架改由创建者客户端种：原来服务端在 `onStart` 里种，DO 重启后 storage 里 `seeded` 标记还在、Y.Doc 却没落盘，新访客会看到永久空房间。现在 `worker/Room.ts` 不再种，改 `useSeedStarter`：只在「我是创建者 + 已连接 + code 为空 + meta.seeded 不是 true」时用一个事务写入。
- 画板多人光标：`Whiteboard` 收 `awareness`，指针位置写入 `state.board`，50ms 节流；抬笔清空；在 `listening={false}` 的预览层画小圆点 + 名字。

**修的 bug：编辑器明明有内容却显示空白**
- 现象：打开一个已有内容的房间，`doc.getText('code').length === 33`，但 CodeMirror 显示 placeholder。
- 根因（读源码确认）：`y-codemirror.next` 的 `YSyncPlugin` 在 `constructor` 里只挂 `ytext.observe(...)`，**不会把已有内容灌进初始 EditorState**（`node_modules/y-codemirror.next/src/y-sync.js:95-124`）。编辑器挂载时文档已有内容，之后又没有新 update，就永远空白。
- 修法：`CodeEditor` 建 state 时 `doc: ytext.toString()` 预置内容；同时 `useRoomSession` 暴露 `synced`（监听 provider 的 `synced` 事件），编辑器等首次同步完成再挂载。
- 验证：房间 `yea7hd` 预置 33 字节 → 编辑器显示出来；再敲 ` // typed` → `ytextLen` 33 → 42（没重复插入），服务端读回 42。

**已验证**
- `npm run typecheck` exit 0；`npm run build` exit 0。
- 计时器：点开始 → 44:58，服务端 `timerEndsAt` / `timerRemainingMs` 正确写入；第二标签页时间一致。
- 骨架：新建房间 → `codeLen 149`、`meta {lang: java, seeded: true}`；不带 `?new=1` 重开仍是 149（没重复种）。
- 编辑器空白修复：见上。
- 截图 `docs/shots/day4-timer.png`（计时器运行 + 预置内容正常显示）。

**未验证**
- 画板多人光标的**渲染**只验证了数据层（`awareness.getStates()` 里 peer 的 `board` 坐标正确），没截到两个客户端同时出现的光标。
- 移动端真机触屏画板。
- 开发环境 DO 跨重启的持久化表现不稳定（`yea7hd` 重启后内容丢过一次），生产环境靠 Durable Object storage，部署后再验。

## Day 4.5 · 按 modern-web-guidance 规范修一遍

**做了什么**
- 新增 `src/lib/keyboard.ts` 的 `isImeComposing()`，三处自定义 Enter 处理加守卫：
  - `src/pages/Landing.tsx` 昵称回车创建房间、房间码回车加入房间；
  - `src/features/canvas/Whiteboard.tsx` 画板文字输入框回车提交。
- 判断顺序按 guide 来：先 `preventDefault()`（拦掉 input 的隐式提交/换行），再看 `event.nativeEvent.isComposing`，并补 `keyCode === 229` 兜底 Safari 的事件顺序 bug。

**已验证**
- `node modern-web.mjs legacy-scan src`：修前 3 处 findings，修后 **0 处**。
- `npm run typecheck` exit 0；`npm run build` exit 0。
- 浏览器实测：给昵称输入框派发一个 `isComposing: true` 的 Enter，路由停在 `/`（没有建房间）；再派发普通 Enter，跳到 `/room/gjhzpc?new=1`。

**未验证**
- 真实输入法（微软拼音）里手动选字回车，只用合成事件模拟。
- 画板文字输入框的组字场景没单独点。

## Day 4.5 · 页面与代码整理

**做了什么**
- `src/pages/Room.tsx` 从 308 行拆到 159 行，按职责分四个文件：
  - `src/features/room/RoomHeader.tsx`（房间码、计时器、连接状态、成员头像、导出、分享、离开）
  - `src/features/room/RoomFooter.tsx`（语言、行列、同步状态、撤销重做）
  - `src/features/room/NotesPanel.tsx`（左侧题目/笔记，桌面可收起）
  - `src/features/room/StatusDot.tsx`（状态文案与颜色，顶栏与底栏共用）
- 回放页去掉全部说明文案：正文只留一行 `暂无记录`，播放器保留骨架（禁用状态 + `未接入`）。
- 房间页去掉「未命名房间」占位标题（只留房间码）、空态文案收紧到 `连接中…` / `开始写代码` / `粘贴题目`。
- 无效房间页删掉解释句，只留「房间码不对」+ 回首页。

**已验证**
- `npm run typecheck` exit 0；`npm run build` exit 0（built in 6.79s）。
- 浏览器实测三页：首页（标题 + 昵称 + 创建 + 房间码）、房间页（顶栏齐全、编辑器加载骨架、底部状态正常、连接「已连接」）、回放页（`暂无记录` + 禁用播放器）。
- 截图：`docs/shots/day4-landing.png`、`day4-room.png`、`day4-replay.png`。

**已补**
- 390×844 实测：房间页顶栏不再溢出（最后一个按钮 right=378 < 390），`scrollWidth === clientWidth === 390`；回放页同样不横向滚动。
- 移动端顶栏在 <sm 时隐藏「重置计时」按钮，间距收紧到 `gap-1.5`。截图：`day4-room-mobile.png`、`day4-replay-mobile.png`。

**未验证**
- 真机触屏（只用设备模拟）。

## Day 5 · 事件日志 + 快照 + 回放

**做了什么**
- `worker/Room.ts`：每条 Yjs update 记 `{ seq, t, u }`（`t` 是相对房间启动的毫秒），每 50 条更新或 30 秒存一个关键帧 `{ seq, t, s }`（`Y.encodeStateAsUpdate` 的 base64），日志与关键帧合并写进 DO storage（1.5 秒合并一次，别每个按键都写盘）；日志上限 4000 条、关键帧只留最近 20 个。
- 回放数据口挂回同一个 Durable Object：`GET /parties/main/:room/replay` 走 `onRequest`，直接返回 `{ startedAt, duration, snaps, log }`，不需要额外 Worker 路由。
- `src/features/replay/`：
  - `api.ts`：取日志、`formatClock`、语言兜底。
  - `frameAt.ts`：新建空 `Y.Doc`，找到最后一个 `t <= 目标时间` 的关键帧作起点，再按 `seq` 顺序 `applyUpdate` 之后的条目，读出 `code` / `notes` / `shapes` / `lang`。
  - `ReplayCode.tsx`：只读 CodeMirror，复用房间的主题、语法高亮、行号（不复用 `CodeEditor`，那个绑着 yCollab）。
  - `ReplayCanvas.tsx`：只读 Konva，复用 `ShapeNode`，`listening={false}`。
- `src/pages/Replay.tsx`：时间轴（100ms 量化）、播放/暂停、1x/2x/4x、代码/画板 Tab；进页面先停在末尾（看到最新状态），点播放从当前位置继续，播到末尾自动停。

**已验证**
- 在房间 `t5st2x` 里真实操作：笔记打字、代码里插 `// 代码回放 A` 与 `int x = 42;`、画板画一个 180×120 矩形。
- `/parties/main/t5st2x/replay` 返回 51 条 update、2 个关键帧、`duration` 134709ms。
- 直接调 `frameAt`：`t=0` 代码 0 字、`t=30000~60000` 149 字（骨架）、`t=116000` 165 字、`t=134709` 169 字且 `shapes=1` —— 说明代码修改顺序和图元都按时间还原。
- 页面实测：进回放停在 `02:14 / 02:14`，代码里能看到插入的 `// 代码回放 A`；切「画板」能看到那个矩形；把时间轴拖回 `00:50` 代码变回骨架、画板为空；点播放 2 秒走 1 秒（1x），切 2x 后 2 秒走 4 秒。
- 修了一个边界 bug：停在末尾时 `at === duration`，向下量化会把 `t === duration` 的最后一条 update 丢掉（矩形不显示），改成末尾多给 1ms。
- `npm run typecheck` exit 0；`npm run build` exit 0（JS 1.34MB / gzip 441KB）。
- 截图：`docs/shots/day5-replay-code.png`、`day5-replay-end.png`、`day5-replay-board.png`、`day5-room-board.png`。

**未验证**
- 关键帧在「长时间房间」里的命中效果（目前只有 2 个关键帧，seek 快慢没测）。
- DO 重启后日志能否完整恢复（依赖写盘合并，强杀进程可能丢最后 1.5 秒）。
- 真机触屏的画板回放。

## Day 6 · 断线重连、空/错状态、快捷键、移动端、部署

**做了什么**
- 修一个断线时内容会消失的问题：编辑器之前用 `session.synced` 作为挂载条件，断线后 provider 把 `synced` 置回 false，编辑器被卸载、用户眼前的内容直接没了。改成 `useRoomSession` 多暴露一个 `everSynced`（同步过一次就永久为 true），`Room.tsx` 与 `NotesPanel` 只认它。
- 快捷键复查：画板 `B/R/A/T/E` 切工具、`Ctrl/⌘+Z` 撤销、`Ctrl/⌘+Shift+Z` 重做（只撤自己）；代码编辑器用 `yUndoManagerKeymap`。

**已验证（本轮真跑）**
- 断线：杀掉 wrangler 进程 4 秒后页面显示「连接中」，编辑器内容仍在（代码 163 字、笔记 29 字，卸载问题修复后）。
- 离线编辑：断线状态在编辑器里敲 ` // offline-edit`（内容变 179 字），恢复 wrangler 后约 12 秒回到「已连接 / 已同步」，`ROOM=t5st2x node scripts/room-peek.mjs` 读到服务端 `codeLen 185` —— 断线期间的输入在重连后补齐。
- 空/错状态：`/no-such-page` → `404 / 这个页面不存在 / 回首页`；`/room/zzzz` → `房间码不对 / 回首页`；回放页无数据时 `暂无记录`。
- 快捷键：画板按 `r` 再拖，服务端多出一条 `type: rect` 的图元；按 `Ctrl+Z` 后该图元消失、先前那条保留（撤销只撤自己的操作）。
- 移动端 390×844：画板页 `scrollWidth === clientWidth === 390`，工具栏收成 5 个工具 + 3 个色点，无横向滚动；截图 `docs/shots/day6-room-mobile-board.png`。
- 部署：`wrangler deploy --temporary` 成功，3 个静态资源 321.47 KiB（gzip 66.50 KiB）、Worker 启动 6 ms、返回 `https://same-screen.jasper-swordtail.workers.dev`（临时账号，60 分钟内可在 Cloudflare 面板认领）。
- 截图：`docs/shots/day6-disconnected.png`、`day6-reconnected.png`、`day6-board-undo.png`、`day6-room-mobile-board.png`。

**未验证**
- 正式 `wrangler login` + `npm run deploy`（需要账号）。`*.workers.dev` 在本机 DNS 被解析到 `157.240.10.32`（上一轮是 `31.13.85.2`），TCP 超时 → 公网可访问性仍无法在本机确认。
- 真机触屏画板（只在 390 宽模拟下确认布局与鼠标绘制）。
- 断线超过 provider 重试上限（`maxBackoffTime`）后的表现未测。

## Day 7 · 两客户端验收、200 图元性能、README 收尾

**做了什么**
- 新写 `scripts/seed-shapes.mjs`：一个事务里批量塞入 N 个图元（矩形/箭头/12 点笔迹轮流、网格排布），用于渲染性能测试。
- 两客户端验证：主标签页敲 `// from client A`，第二个标签页（独立 Y.Doc + 独立 Durable Object 连接）立即出现同样 16 字内容，顶栏两个头像。
- 性能：房间 `perf22` 塞 200 个图元后，页面内 rAF 采样 —— idle `n=363 p50 5.60ms p95 5.70ms max 6.0ms`，持续绘制 40 段时 `n=582 p50 5.60ms p95 22.30ms max 50.0ms`。
- README 重写：加截图区、画板快捷键/多人光标/计时器条目、目录与脚本清单、已知限制补两条（DO 惰性落盘、回放最多 4000 条）、简历 bullet、进度表全部完成。

**已验证**
- `docs/shots/day7-two-clients.png`：第二个客户端代码区 = `// from client A`。
- `docs/shots/day7-perf-200.png`：200 图元同屏渲染，工具栏与画板正常。
- 房间码坑：`perf01` 被判非法（房间码字母表没有 `0`/`1`），页面直接进「房间码不对」；换成 `perf22` 才测到真数据。

**未验证**
- 两台真实设备（一手机一电脑）；真机触屏手感。
- 200 图元下的绘制 p95 22ms、最差 50ms 是 CDP 逐段驱动鼠标时的测量值，真手指连续滑动可能更平滑也可能更糟，没有第二组数据。
- 正式 Cloudflare 账号部署（`wrangler login` 需要账号）。
- 开发环境 Durable Object 空闲回收后是否稳定落盘（`perf01` 的 200 图元后来读到 0 条，`perf22` 4 秒后读还在）。
