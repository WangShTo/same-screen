import { Eraser, MoveUpRight, PenLine, Square, Type } from 'lucide-react'
import { useCanvasUi } from './store'
import { PEN_COLORS, STROKE_WIDTHS, TOOLS, type Tool } from './types'

const ICONS: Record<Tool, typeof PenLine> = {
  pen: PenLine,
  rect: Square,
  arrow: MoveUpRight,
  text: Type,
  eraser: Eraser,
}

export function CanvasToolbar() {
  const tool = useCanvasUi((state) => state.tool)
  const color = useCanvasUi((state) => state.color)
  const strokeWidth = useCanvasUi((state) => state.strokeWidth)
  const setTool = useCanvasUi((state) => state.setTool)
  const setColor = useCanvasUi((state) => state.setColor)
  const setStrokeWidth = useCanvasUi((state) => state.setStrokeWidth)

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-2xl border border-line/80 bg-panel/90 p-1.5 backdrop-blur">
      <div className="pointer-events-auto flex items-center gap-0.5">
        {TOOLS.map(({ id, label, key }) => {
          const Icon = ICONS[id]
          const active = tool === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              title={`${label} · ${key}`}
              aria-label={label}
              aria-pressed={active}
              className={`grid h-7 w-7 place-items-center rounded-xl transition-colors ${
                active ? 'bg-panel-2 text-fg' : 'text-fg-faint hover:text-fg-dim'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          )
        })}
      </div>

      <span className="mx-1 hidden h-4 w-px bg-line sm:block" />

      <div className="pointer-events-auto hidden items-center gap-1 sm:flex">
        {PEN_COLORS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setColor(item)}
            aria-label={`颜色 ${item}`}
            className={`grid h-6 w-6 place-items-center rounded-full transition-transform ${
              color === item ? 'ring-1 ring-fg-faint' : 'hover:scale-105'
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item }} />
          </button>
        ))}
      </div>

      <span className="mx-1 hidden h-4 w-px bg-line sm:block" />

      <div className="pointer-events-auto flex items-center gap-1">
        {STROKE_WIDTHS.map((width) => (
          <button
            key={width}
            type="button"
            onClick={() => setStrokeWidth(width)}
            aria-label={`线宽 ${width}`}
            className={`grid h-6 w-6 place-items-center rounded-full ${
              strokeWidth === width ? 'bg-panel-2' : 'hover:bg-panel-2/60'
            }`}
          >
            <span className="rounded-full bg-fg-dim" style={{ width: width + 2, height: width + 2 }} />
          </button>
        ))}
      </div>
    </div>
  )
}
