# 同屏 same-screen · 项目约定

> 产品范围见 [SPEC.md](./SPEC.md)（定版），技术方案见 [ARCHITECTURE.md](./ARCHITECTURE.md)（定版）。本文件只放硬约束，给每次会话开头看。

## 一句话

一个链接，两个人远程讲代码：一起写代码、顺手画图、计时，讲完能导出和回放。作品集项目，7 天 MVP。

## 栈（锁死，别换）

React 19 + TS strict + Vite · Tailwind v4（`@tailwindcss/vite`，CSS-first，不要写 v3 的 config）· React Router 8 · Zustand（只放 UI 态）
CodeMirror 6 + `y-codemirror.next`（`yCollab`）· Yjs · Konva + `react-konva` · `y-protocols/awareness`
服务端：Cloudflare Workers + Durable Object，`partyserver` + `y-partyserver`，`wrangler dev/deploy`
部署：单 Worker 同时供前端 assets 和 WebSocket（同域）｜ 包管理：npm（pnpm 12 在这台机器下载大二进制必崩，已弃用）
环境补丁：本机沙箱里 Vite 会 `spawn EPERM`，需要 `NODE_OPTIONS="--require ./scripts/exec-shim.cjs"`；普通终端不需要。

## 硬约束

1. **PartyKit 已死**：托管平台 2026-10-23 关停。禁止 `partykit` / `y-partykit` 依赖，禁止 `npx partykit deploy`，只用 PartyServer。
2. 共享数据只认 Yjs（`code`/`notes`/`shapes`/`meta`），不另存 React state；只有 UI 态进 Zustand。
3. `meta` 一 key 一值，禁止 `set('state', {...})` 整对象覆盖。
4. 代码和笔记都用 CodeMirror 6 + `yCollab`（笔记不要用受控 textarea）。**手写扩展列表，绝不用 `basicSetup`**，它内含 `history()`。
5. 撤销走 `Y.UndoManager` + `trackedOrigins`（只本地 origin），配 `yUndoManagerKeymap`。一次绘制/一次编辑 = 一个 `ydoc.transact(fn, localOrigin)`。
6. 画笔本地实时画，**抬笔**才写 `Y.Map`；矩形箭头预览在本地，松手才提交。
7. 计时不存倒计时：存 `timerEndsAt` / `timerRemaining`，本地 200ms 刷新。
8. 橡皮 = 删除整个图元，不做像素擦除。
9. 回放复用房间的渲染组件（readonly），不写第二套。
10. TypeScript strict，不用 `any` 绕类型。
11. 不做：视频语音、代码运行、登录、房间列表、聊天、评论、权限、AI 面试官、**图元选择/拖动/缩放**、**题库**、**测试框架**。

## 定版（2026-11-10）

从定版到上线，只允许做 SPEC 第 3 节列出的东西，只允许按第 7 节降级。**新想法记进 README「以后可能做」，不进本期。** 换技术前先说清"现有方案在哪一步必然失败"。

## 每日闸门

```bash
npm run typecheck && npm run build   # 0 error
# 两个浏览器进同一房间肉眼过一遍
```

截图 → `docs/shots/dayN.png`；`docs/LOG.md` 追加「做了什么 / 已验证 / 未验证」。

## 说话方式

没验证就写「未验证：…」，禁止用「做好了」结句。构建通过、接口 200、截到图都不算完成，**两个浏览器里跑通才算**。
