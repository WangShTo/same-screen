# 同屏 · same-screen

一个链接，两个人远程讲代码：一起改代码、顺手画图、计时，讲完能导出和回放。

作品集项目，7 天 MVP。当前进度：**Day 0 脚手架**（详见下方「进度」）。

## 现在能做什么

| 能 | 说明 |
| --- | --- |
| 进首页 | 填昵称、换颜色、创建房间跳 `/room/:code` |
| 用房间码加入 | 6 位码校验（去掉了容易看错的 `0/1/i/l/o`） |
| 打开房间壳 | 顶栏、可折叠题目面板、代码/画板 Tab、底部状态栏 |
| 分享 | 复制房间链接，`/r/:code` 短链会跳到房间 |
| 错码兜底 | 房间码不合法时给提示页，不是白屏 |

**还不能**：代码同步、画板同步、真计时器、多人光标、回放。这些是 Day 2–5 的事。

## 技术栈

| 层 | 选择 |
| --- | --- |
| 前端 | React 19 · TypeScript（strict）· Vite 8 · Tailwind v4 |
| 路由 | React Router 8 |
| UI 状态 | Zustand（只放当前工具/颜色/Tab，不放共享数据） |
| 代码编辑 | CodeMirror 6 + `y-codemirror.next` |
| 画板 | Konva + react-konva |
| 共享数据 | Yjs（`code` / `notes` / `shapes` / `meta`） |
| 实时服务 | Cloudflare Workers + Durable Object（`partyserver` + `y-partyserver`） |
| 部署 | 单个 Worker 同时供前端静态资源和 WebSocket（同域，免 CORS） |

> PartyKit 托管平台已于 2026-10-23 关停，本项目用的是它的继任者 PartyServer，部署走 `wrangler`。

## 本地启动

```bash
npm install --legacy-peer-deps   # 前端 + worker 一次装完
npm run dev                      # 前端 http://localhost:5173
npm run worker                   # 另开一个终端：实时服务 http://127.0.0.1:8787
```

`npm run dev` 会把 `/parties` 代理到 8787（含 WebSocket），所以前端只认 5173 一个地址。

其它命令：

```bash
npm run typecheck   # 三个 tsconfig 全过才算过（app / vite 配置 / worker）
npm run build       # typecheck + vite build → dist/
npm run deploy      # wrangler deploy（前端和实时服务一起发）
```

### 为什么用 npm 而不是 pnpm

这台机器的 pnpm 12.5.1 在下载大二进制（workerd / rolldown / typescript 原生包）时稳定崩 `thread 'tokio-rt-worker' has overflowed its stack`，分批装也崩。项目本身没有 monorepo 需求，npm 足够。

### 关于 `scripts/exec-shim.cjs`

只给「被沙箱限制了子进程管道的环境」用，比如本机的 AI agent 会话：Vite 在 Windows 上会 `exec("net use")` 探测网络盘，被拦就抛 `spawn EPERM`。手动使用时：

```bash
NODE_OPTIONS="--require ./scripts/exec-shim.cjs" npx vite --port 5173
```

普通开发机不需要它，`npm run dev` 也不引用它。

## 部署

```bash
npx wrangler login     # 浏览器授权一次
npm run deploy         # 产出 https://same-screen.<你的子域>.workers.dev
```

`wrangler.jsonc` 已经把三件事配好了：Worker 入口、`Main` Durable Object 绑定（`Room` 类）、`dist/` 作为静态资源并开启 SPA 回落。

**未验证**：本机 agent 环境里 workerd 启动时报 `CreateDirectory: #5 拒绝访问; path = miniflare-email-store`，`wrangler dev` 没能跑起来；`wrangler login` 和 `deploy` 也还没试过。需要在普通终端里各跑一次确认。

## 目录

```text
src/
  app/          router、providers、全局样式
  pages/        Landing、Room、Replay
  features/     room / editor / canvas / presence / replay / timer（Day 2 起填）
  lib/          roomCode、identity、env（Yjs 连接在 Day 2 加）
  components/   Button 等基础组件
worker/
  index.ts      入口：/parties 交给 PartyServer，其余交给静态资源
  Room.ts       Durable Object：一个房间一个实例
docs/
  LOG.md        每天做了什么 / 已验证 / 未验证
  shots/        截图
scripts/
  exec-shim.cjs 沙箱环境专用补丁
```

## 架构

```text
浏览器 A ─┐                    ┌─ Y.Doc（服务端权威副本）
          ├─ WebSocket ─ Room ─┤   code / notes / shapes / meta
浏览器 B ─┘   (Durable Object) └─ 更新日志（seq, t, update）→ 回放
                    │
                    └─ 静态资源：dist/ 由同一个 Worker 提供
```

- 共享数据只有一份：Yjs 文档。React 不另外存一份，避免双份状态打架。
- 画板同步的是图元（笔迹点集、矩形、箭头、文字），不同步像素。
- 光标和在线状态走 Awareness，不进文档，也不落盘。
- 计时器只存 `timerEndsAt`，不存倒计时。
- 回放复用房间的只读渲染，不写第二套。

## 已知限制

1. 不能运行代码，只是共享编辑器。
2. 不做视频/语音，讲的时候另开腾讯会议。
3. 不做登录，昵称和颜色存在 localStorage，换浏览器就换身份。
4. 房间不设权限，知道链接就能进。
5. 画板没有选择/拖动/缩放，画错了用橡皮（整块删）。
6. 移动端能画但不好画，画板不是为手指精修设计的。

## 以后可能做

视频、代码运行、房间列表、模板库、导出 PDF、面试官视角的回放评审。

## 进度

| 天 | 内容 | 状态 |
| --- | --- | --- |
| Day 0 | 脚手架、路由、首页创建/加入、房间壳、类型与构建 | 完成（worker 未验证） |
| Day 1 | 前端打磨、错误/空状态、分享与短链 | 未开始 |
| Day 2 | CodeMirror + Y.Text 同步、成员列表、连接状态 | 未开始 |
| Day 3 | Konva 画板（笔/矩形/箭头/文字/橡皮）+ 撤销重做 | 未开始 |
| Day 4 | 多人光标、计时器、响应式 | 未开始 |
| Day 5 | 事件日志 + 快照 + 回放页 | 未开始 |
| Day 6 | 断线重连、快捷键、移动端、部署 | 未开始 |
| Day 7 | 双浏览器验收、性能、README、截图 | 未开始 |

设计文档：[SPEC.md](./SPEC.md)（做什么）· [ARCHITECTURE.md](./ARCHITECTURE.md)（怎么做）· [AGENTS.md](./AGENTS.md)（硬约束）
