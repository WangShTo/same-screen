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
