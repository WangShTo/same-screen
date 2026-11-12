/**
 * 画板截图的取数口子：导出菜单不直接依赖 Konva Stage 实例，
 * 由 Whiteboard 挂载时注册、卸载时注销。
 */
type SnapshotFn = () => string | null

let current: SnapshotFn | null = null

export function registerCanvasSnapshot(fn: SnapshotFn): () => void {
  current = fn
  return () => {
    if (current === fn) current = null
  }
}

export function canvasPngDataUrl(): string | null {
  return current?.() ?? null
}

export function hasCanvasSnapshot(): boolean {
  return current !== null
}
