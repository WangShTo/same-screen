import { useEffect, useMemo, useRef, useState } from 'react'
import { Layer, Stage } from 'react-konva'
import type Konva from 'konva'
import type * as Y from 'yjs'
import { withLocalOrigin } from '@/lib/ydoc'
import { CanvasToolbar } from './CanvasToolbar'
import { ShapeNode } from './ShapeNode'
import { registerCanvasSnapshot } from './snapshot'
import { useCanvasUi } from './store'
import { isShape, shapeId, type Shape } from './types'

type Props = {
  ydoc: Y.Doc
  userId: string
  undoManager: Y.UndoManager
}

const CURSOR: Record<string, string> = {
  pen: 'crosshair',
  rect: 'crosshair',
  arrow: 'crosshair',
  text: 'text',
  eraser: 'cell',
}

function readShapes(map: Y.Map<Shape>): Shape[] {
  return [...map.values()].filter(isShape)
}

export function Whiteboard({ ydoc, userId, undoManager }: Props) {
  const map = useMemo(() => ydoc.getMap<Shape>('shapes'), [ydoc])
  const tool = useCanvasUi((state) => state.tool)
  const color = useCanvasUi((state) => state.color)
  const strokeWidth = useCanvasUi((state) => state.strokeWidth)
  const setTool = useCanvasUi((state) => state.setTool)

  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const pointsRef = useRef<number[]>([])
  const textInputRef = useRef<HTMLInputElement>(null)

  const [size, setSize] = useState({ w: 0, h: 0 })
  const [shapes, setShapes] = useState<Shape[]>(() => readShapes(map))
  const [draft, setDraft] = useState<Shape | null>(null)
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string } | null>(null)

  // 共享图元跟着 Y.Map 走，不另存一份
  useEffect(() => {
    const sync = () => setShapes(readShapes(map))
    map.observe(sync)
    sync()
    return () => map.unobserve(sync)
  }, [map])

  // 画布尺寸跟容器走
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) setSize({ w: Math.round(rect.width), h: Math.round(rect.height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 快捷键：B/R/A/T/E；Ctrl/⌘+Z 撤销、Ctrl/⌘+Shift+Z 重做（只撤自己的）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && !event.altKey && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) undoManager.redo()
        else undoManager.undo()
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const found = ({ b: 'pen', r: 'rect', a: 'arrow', t: 'text', e: 'eraser' } as const)[key as 'b']
      if (found) {
        setTool(found)
        event.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setTool, undoManager])

  // 导出 PNG 用
  useEffect(() => {
    return registerCanvasSnapshot(() => {
      const stage = stageRef.current
      if (!stage || size.w === 0) return null
      return stage.toDataURL({ pixelRatio: 2 })
    })
  }, [size.w])

  useEffect(() => {
    if (!textDraft) return
    const id = window.requestAnimationFrame(() => textInputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [textDraft])

  function pointer(): { x: number; y: number } | null {
    return stageRef.current?.getPointerPosition() ?? null
  }

  function commit(shape: Shape) {
    withLocalOrigin(ydoc, () => {
      map.set(shape.id, shape)
    })
  }

  function eraseAt(pos: { x: number; y: number }) {
    const node = stageRef.current?.getIntersection(pos)
    const id = node?.id()
    if (!id || !map.has(id)) return
    withLocalOrigin(ydoc, () => {
      map.delete(id)
    })
  }

  function handlePointerDown(event: Konva.KonvaEventObject<PointerEvent>) {
    if (event.evt.button !== 0) return
    const pos = pointer()
    if (!pos) return

    if (tool === 'eraser') {
      eraseAt(pos)
      return
    }

    if (tool === 'text') {
      event.evt.preventDefault()
      setTextDraft({ x: pos.x, y: pos.y, value: '' })
      return
    }

    startRef.current = pos
    if (tool === 'pen') {
      pointsRef.current = [pos.x, pos.y]
      setDraft({ id: shapeId(), type: 'pen', points: [pos.x, pos.y], color, width: strokeWidth, userId })
    } else if (tool === 'rect') {
      setDraft({ id: shapeId(), type: 'rect', x: pos.x, y: pos.y, w: 0, h: 0, color, width: strokeWidth, userId })
    } else {
      setDraft({
        id: shapeId(),
        type: 'arrow',
        points: [pos.x, pos.y, pos.x, pos.y],
        color,
        width: strokeWidth,
        userId,
      })
    }
  }

  function handlePointerMove(event: Konva.KonvaEventObject<PointerEvent>) {
    const pos = pointer()
    if (!pos) return

    if (tool === 'eraser') {
      if (event.evt.buttons === 1 || event.evt.pointerType === 'touch') eraseAt(pos)
      return
    }

    const start = startRef.current
    if (!start || !draft) return

    if (draft.type === 'pen') {
      const points = pointsRef.current
      const lastX = points[points.length - 2] ?? start.x
      const lastY = points[points.length - 1] ?? start.y
      if (Math.hypot(pos.x - lastX, pos.y - lastY) < 1.5) return
      pointsRef.current = [...points, pos.x, pos.y]
      setDraft({ ...draft, points: pointsRef.current })
      return
    }

    if (draft.type === 'rect') {
      setDraft({ ...draft, w: pos.x - start.x, h: pos.y - start.y })
      return
    }

    if (draft.type === 'arrow') {
      setDraft({ ...draft, points: [start.x, start.y, pos.x, pos.y] })
    }
  }

  function handlePointerUp() {
    const shape = draft
    startRef.current = null
    pointsRef.current = []
    setDraft(null)
    if (!shape) return

    if (shape.type === 'pen') {
      const points = shape.points ?? []
      if (points.length < 4) return
      commit({ ...shape, points })
      return
    }
    if (shape.type === 'rect') {
      if (Math.abs(shape.w ?? 0) < 3 || Math.abs(shape.h ?? 0) < 3) return
      const x = Math.min(shape.x ?? 0, (shape.x ?? 0) + (shape.w ?? 0))
      const y = Math.min(shape.y ?? 0, (shape.y ?? 0) + (shape.h ?? 0))
      commit({ ...shape, x, y, w: Math.abs(shape.w ?? 0), h: Math.abs(shape.h ?? 0) })
      return
    }
    if (shape.type === 'arrow') {
      const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = shape.points ?? []
      if (Math.hypot(x2 - x1, y2 - y1) < 6) return
      commit(shape)
    }
  }

  function commitText() {
    const draftText = textDraft
    setTextDraft(null)
    const value = draftText?.value.trim()
    if (!draftText || !value) return
    commit({
      id: shapeId(),
      type: 'text',
      x: draftText.x,
      y: draftText.y,
      text: value,
      color,
      width: strokeWidth,
      userId,
    })
  }

  const preview = draft && draft.type !== 'text' ? draft : null

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-ink"
      style={{ cursor: CURSOR[tool] ?? 'default', touchAction: 'none' }}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <Layer listening={tool === 'eraser'}>{shapes.map((shape) => <ShapeNode key={shape.id} shape={shape} />)}</Layer>
        <Layer listening={false}>
          {preview && <ShapeNode shape={preview} />}
        </Layer>
      </Stage>

      <CanvasToolbar />

      {textDraft && (
        <input
          ref={textInputRef}
          value={textDraft.value}
          onChange={(event) => setTextDraft({ ...textDraft, value: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitText()
            }
            if (event.key === 'Escape') setTextDraft(null)
          }}
          onBlur={commitText}
          placeholder="输入文字，回车确认"
          className="absolute z-20 min-w-40 rounded-md border border-accent/60 bg-ink/95 px-2 py-1 text-[15px] text-fg outline-none placeholder:text-fg-faint"
          style={{ left: textDraft.x, top: textDraft.y, color }}
        />
      )}

      {shapes.length === 0 && !draft && (
        <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs text-fg-faint">
          选个工具，在空白处画一笔
        </p>
      )}
    </div>
  )
}
