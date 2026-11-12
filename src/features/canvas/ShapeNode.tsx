import { Arrow, Line, Rect, Text } from 'react-konva'
import type { Shape } from './types'

type Props = { shape: Shape }

/** 图元渲染：回放页也复用它（readonly 只是不挂交互，不影响画） */
export function ShapeNode({ shape }: Props) {
  switch (shape.type) {
    case 'pen':
      return (
        <Line
          id={shape.id}
          points={shape.points ?? []}
          stroke={shape.color}
          strokeWidth={shape.width}
          lineCap="round"
          lineJoin="round"
          tension={0.35}
          perfectDrawEnabled={false}
        />
      )
    case 'rect':
      return (
        <Rect
          id={shape.id}
          x={shape.x ?? 0}
          y={shape.y ?? 0}
          width={shape.w ?? 0}
          height={shape.h ?? 0}
          stroke={shape.color}
          strokeWidth={shape.width}
          cornerRadius={2}
          perfectDrawEnabled={false}
        />
      )
    case 'arrow':
      return (
        <Arrow
          id={shape.id}
          points={shape.points ?? []}
          stroke={shape.color}
          fill={shape.color}
          strokeWidth={shape.width}
          pointerLength={9 + shape.width}
          pointerWidth={9 + shape.width}
          perfectDrawEnabled={false}
        />
      )
    case 'text':
      return (
        <Text
          id={shape.id}
          x={shape.x ?? 0}
          y={shape.y ?? 0}
          text={shape.text ?? ''}
          fill={shape.color}
          fontSize={Math.max(14, shape.width * 4)}
          fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
        />
      )
  }
}
