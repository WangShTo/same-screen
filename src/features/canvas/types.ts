export type ShapeType = 'pen' | 'rect' | 'arrow' | 'text'

export type Shape = {
  id: string
  type: ShapeType
  /** pen / arrow 用梯形点列，坐标是画板本地像素 */
  points?: number[]
  /** rect / text 用左上角 + 宽高 */
  x?: number
  y?: number
  w?: number
  h?: number
  text?: string
  color: string
  width: number
  userId: string
}

export type Tool = 'pen' | 'rect' | 'arrow' | 'text' | 'eraser'

export const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: 'pen', label: '画笔', key: 'B' },
  { id: 'rect', label: '矩形', key: 'R' },
  { id: 'arrow', label: '箭头', key: 'A' },
  { id: 'text', label: '文字', key: 'T' },
  { id: 'eraser', label: '橡皮', key: 'E' },
]

export const PEN_COLORS = ['#e8edf7', '#6ea8fe', '#7ee0a8', '#f2b878', '#f07f8a'] as const

export const STROKE_WIDTHS = [2, 4, 7] as const

export function shapeId(): string {
  return crypto.randomUUID()
}

/** 后端存的是 Y.Map 里的普通对象，取出来先做一次形状校验，脏数据不至于把画板炸掉 */
export function isShape(value: unknown): value is Shape {
  if (!value || typeof value !== 'object') return false
  const shape = value as Partial<Shape>
  return (
    typeof shape.id === 'string' &&
    (shape.type === 'pen' || shape.type === 'rect' || shape.type === 'arrow' || shape.type === 'text') &&
    typeof shape.color === 'string' &&
    typeof shape.width === 'number'
  )
}
