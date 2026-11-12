# 同屏 · 同类项目与可借鉴架构

> 调研日期 2026-11-12。只看公开 GitHub 仓库与官方文档，未 clone、未运行任何第三方代码。
> 判断标准只有一条：**能不能改我们自己的实现，而不是改我们的范围。**

## 结论先行

1. **没有找到现成的「按时间轴回放代码 + 画板」开源实现。** 官方最接近的是 Yjs 的 `prosemirror-versions`（版本快照，不是回放）。回放是我们真正的差异点。
2. 直接竞品有，但都比我们**多**（视频/编译/聊天），没人做回放和时间盒。见第 4 节。
3. 社区里同名同栈的项目（React + Yjs + Konva）大多是作业级质量（0–6 star），**只抄结构，不抄代码**。
4. 真正值得吸收的只有 4 条，其中 2 条今天就该改（第 3 节 A、B）。

## 1. 同栈参考（React + Yjs + Konva）

| 项目 | 栈差异 | 和我们重合 | 能抄什么 | 别抄什么 |
| --- | --- | --- | --- | --- |
| [Aliyev-dev/FlowBoard](https://github.com/Aliyev-dev/FlowBoard) ★1 | y-webrtc P2P，无后端；y-indexeddb | 三层状态、Konva 画板、awareness 光标、Y.UndoManager、PNG 导出 | **三层状态分层**（shared doc / awareness / UI）；`TextEditor.tsx` 用 HTML overlay 编辑画布文字；`CursorsLayer` 独立一层；`useHistory` 包 UndoManager | 无后端（面试要两个人在不同网络）；无回放；多选/变换/图层（我们明确砍了） |
| [adam0white/CollabCanvas](https://github.com/adam0white/CollabCanvas) ★6 | Workers + DO + **y-durableobjects** + React + Konva | 和我们现在几乎一样（DO + Yjs + Konva） | **持久化参数**：空闲 500ms 落盘、最长 2s 强制落盘；**awareness 50ms 节流**；一份可抄的离线重连验收清单；DO 里按消息类型拦截（我们不做权限，但结构可读） | Clerk 登录、角色权限、AI 指令、多选/对齐/分布（全在我们「不做」里） |
| [donth77/komuboard](https://github.com/donth77/komuboard) ★1 | party-server + DO + Konva + Yjs，甚至带 VR | 后端选型几乎一致 | 证明 party-server + DO + Konva 这条组合有人跑通过；它的 room 命名与路由组织可以对照 | VR / WebXR 无关 |

## 2. 官方与库级参考（这部分才靠谱）

| 来源 | 关键机制 | 对我们的用处 |
| --- | --- | --- |
| [yjs/yjs-demos `prosemirror-versions`](https://github.com/yjs/yjs-demos/tree/main/prosemirror-versions) | 版本存在 `doc.getArray('versions')`，每项 `{date, snapshot: Y.encodeSnapshot(Y.snapshot(doc)), clientID}`；**必须 `ydoc.gc = false`**，否则删掉的内容被回收，老快照还原不出来 | 回放的**关键帧**思路：seek 到 20 分钟时，先取最近快照再 apply 之后的 update，比从 0 开始 apply 快得多 |
| [napolab/y-durableobjects](https://github.com/napolab/y-durableobjects) ★257 | DO 上跑 Yjs；`getYDoc()` / `updateYDoc()` 暴露成 RPC；客户端走 `y-durableobjects/provider` | 回放页可以直接要一份「整份文档状态」而不是自己拼 WebSocket；**但整体不换**（要求 Hono peer 依赖，我们 y-partyserver 已冒烟通过） |
| [y-partyserver README](https://github.com/cloudflare/partykit/blob/main/packages/y-partyserver/README.md) | `YServer` + `this.document` + `onLoad/onSave` + `callbackOptions` | 我们已在用；`onSave` 的 `debounceWait: 2000 / maxWait: 10000` 默认值偏慢，见第 3 节 B |
| [yjs/y-codemirror.next](https://github.com/yjs/y-codemirror.next) | `yCollab(ytext, awareness, {undoManager})` + `yUndoManagerKeymap` | Day 2 直接用；注意 yCollab 传入 UndoManager 后，CodeMirror 自带的 `history()` 必须移除（和 AGENTS 第 4 条一致） |

## 3. 落地建议（按性价比排序）

### A. 现在就改：`Y.Doc` 装配集中到一个文件

我们现在没有 `src/lib/ydoc.ts`，Day 2 一接 CodeMirror 就会出现「Room 里建 doc、Replay 里又建 doc、测试里再建一个」的三份装配。

借鉴 FlowBoard 的 `collab/doc.ts`：

```ts
// src/lib/ydoc.ts
export function createRoomDoc() {
  const doc = new Y.Doc()
  const undoManager = new Y.UndoManager([], {
    trackedOrigins: new Set([LOCAL_ORIGIN]), // 只撤销自己的操作
  })
  return { doc, undoManager }
}
```

代价：半小时。收益：undo 作用域只有一个地方定义，回放页复用同一个工厂函数但**不装 UndoManager**。

### B. 现在就改：持久化与节流参数对齐实测值

| 参数 | 我们 ARCHITECTURE 写的 | CollabCanvas 实践值 | 建议 |
| --- | --- | --- | --- |
| awareness 节流 | 40ms | 50ms（20 msg/s 上限） | **50ms**，统一一个数，别写两个 |
| DO 落盘空闲阈值 | y-partyserver 默认 2000ms | 500ms | Day 5 做回放日志时一起调，现在不动 |
| DO 落盘最长等待 | 默认 10000ms | 2000ms | 同上 |

理由：40 和 50 没有实质差别，但代码里出现两个魔法数就会有人问「为什么是 40」。

### C. 留到 Day 5：回放加「快照关键帧」

纯 update 回放（我们现在的方案）在 45 分钟房间上意味着几千条 update 从头 apply；改成「每 30 秒一条快照 + 段内 update」，seek 时只 apply 最近的快照 + 之后的增量。

注意：**用快照就必须 `gc = false`**，内存占用上去，且快照要自己编码存储。我们现在的 `{seq, t, update}` 方案在 45 分钟内完全够用，所以这条**不是现在做**，是 Day 5 如果 seek 卡了再上。

### D. 不进本期（记进 README「以后可能做」）

- FlowBoard 的 HTML overlay 文字编辑：我们的 text 工具先用 Konva 原生 `Text` + prompt 输入，够用。
- y-durableobjects 的 RPC 取文档：换库代价大于收益。
- 多选 / 变换 / 图层 / 弹性框选：SPEC 已砍。

## 4. 直接竞品（写 README 时用）

| 项目 | 有什么 | 没有什么 |
| --- | --- | --- |
| [X-ImLucky-X/DevSync](https://github.com/X-ImLucky-X/DevSync) ★1，主打「pair programming & interviews」 | 临时房间 + 分享链接、Monaco + Yjs、多人光标、白板、**7 种语言在线编译**、房间密码、聊天、WebRTC 视频 | **没有回放、没有计时、没有题目面板** |
| [01tushar26/DevHive](https://github.com/01tushar26/DevHive) ★2 | 协同编辑器 + 视频 + 白板，面向 mock interview | 同上，且栈是 Socket.io + Monaco |

差异化一句话（可以进 README 和简历）：

> 别人做「边写边看」，我做「讲完能复盘」——同一份 Yjs 文档，直播时同步，结束后按时间轴回放。

## 5. 裁决：两个被这些项目动摇过的设计

**① 图元要不要嵌套 `Y.Map`？**
FlowBoard 用「每个 shape 一个嵌套 Y.Map」，好处是字段级合并（A 拖位置、B 改颜色都保留）。我们定版用普通对象（LWW），理由是：本期没有拖拽/选择/缩放，图元创建后基本不动，LWW 足够，而且回放时普通对象只有一条路径。
**维持原判**：普通对象。等哪天加拖拽了再改，那时回放也要一起改。

**② 要不要 `gc = false`？**
不需要。update 回放不依赖被删内容的 tombstone；只有「按快照还原历史版本」才需要。维持默认 `gc = true`。

## 未验证

- 以上项目的代码**没有运行过**，只读了 README 与官方源码；参数（500ms/2s、50ms）来自其文档自述，未实测。
- 「没有现成的 Yjs 回放实现」是基于 GitHub 搜索（关键词 yjs + replay/playback/timeline/versions）得出的，不排除有私有项目或非英文命名。
- FlowBoard 的 `useHistory` 是否真按 origin 隔离撤销，未读源码确认。
