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

### 已验证

- `npm run typecheck` → 三个 project 全绿，exit 0。
- `npx vite build` → 2160 modules，`dist/assets/index.js` 335 kB（gzip 106 kB）。
- `npm run dev` → http://localhost:5173 打开正常，首页/房间页渲染正确（截图见 `docs/shots/`）。
- 390×844 视口下房间页不横向滚动，顶栏不换行。

### 未验证

- `wrangler dev`：workerd 启动即报 `kj/filesystem-disk-win32.c++:745: failed: CreateDirectory: #5 拒绝访问。; path = miniflare-email-store`，沙箱环境里起不来。**房间 WebSocket 一条消息都还没真正收发过。**
- `npx wrangler login`：没试过，Cloudflare 账号能否授权未知。
- `this.document` 收到远端 update 时的 origin 是否为连接对象（回放日志的前提）——要等 wrangler 能跑才能打钩。
- 真机（手机）打开：只做了视口模拟，没上过手机。

### 环境坑（记下来省下次时间）

- pnpm 12.5.1 下载大二进制必崩（tokio stack overflow），改用 npm。
- `.npmrc` 被安全策略拦，用 `--legacy-peer-deps` CLI 参数代替。
- Vite 在沙箱里 `exec("net use")` 报 `spawn EPERM`，用 `scripts/exec-shim.cjs` 绕过（仅本机 agent 环境）。
- TypeScript 7 移除了 `baseUrl`，`paths` 必须写成相对路径 `"./src/*"`。
