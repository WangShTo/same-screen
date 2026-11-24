import { Layer, Stage } from 'react-konva'
import { useEffect, useRef, useState } from 'react'
import { ShapeNode } from '@/features/canvas/ShapeNode'
import type { Shape } from '@/features/canvas/types'

type Props = { shapes: Shape[] }

/** 回放里的画板：只画，不接任何指针事件。 */
export function ReplayCanvas({ shapes }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const node = host.current
    if (!node) return
    const observer = new ResizeObserver(() => {
      setSize({ width: node.clientWidth, height: node.clientHeight })
    })
    observer.observe(node)
    setSize({ width: node.clientWidth, height: node.clientHeight })
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={host} className="h-full w-full">
      {size.width > 0 && size.height > 0 && (
        <Stage width={size.width} height={size.height} listening={false}>
          <Layer listening={false}>
            {shapes.map((shape) => (
              <ShapeNode key={shape.id} shape={shape} />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  )
}
