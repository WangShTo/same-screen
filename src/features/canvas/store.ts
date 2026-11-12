import { create } from 'zustand'
import { PEN_COLORS, STROKE_WIDTHS, type Tool } from './types'

type CanvasUiState = {
  tool: Tool
  color: string
  strokeWidth: number
  setTool: (tool: Tool) => void
  setColor: (color: string) => void
  setStrokeWidth: (width: number) => void
}

/** 只放本地 UI 状态，共享的图元永远只在 Y.Map 里 */
export const useCanvasUi = create<CanvasUiState>((set) => ({
  tool: 'pen',
  color: PEN_COLORS[1],
  strokeWidth: STROKE_WIDTHS[1],
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
}))
