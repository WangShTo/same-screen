import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import type { Awareness } from 'y-protocols/awareness'
import type * as Y from 'yjs'
import { buildExtensions, languageExtension } from './extensions'
import type { Lang } from './languages'

type Props = {
  ytext: Y.Text
  awareness: Awareness
  undoManager: Y.UndoManager
  language: Lang
  /** 笔记面板：不要行号、字号更小 */
  compact?: boolean
  readOnly?: boolean
  placeholderText?: string
  onCursor?: (line: number, column: number) => void
  className?: string
}

export function CodeEditor({
  ytext,
  awareness,
  undoManager,
  language,
  compact = false,
  readOnly = false,
  placeholderText = '在这里输入…',
  onCursor,
  className,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const languageCompartment = useRef(new Compartment())
  const cursorRef = useRef(onCursor)
  cursorRef.current = onCursor

  // 创建/销毁编辑器：只在绑定对象变化时重建（切 Tab 不重建，靠 CSS 隐藏）
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        // 关键：把 Y.Text 里已有的内容塞进初始 state。
        // yCollab 的 YSyncPlugin 只在 ytext 变化时同步（y-sync.js 里只挂 observe），
        // 编辑器挂载时文档已有内容的话，不预置就会一直显示空白。
        doc: ytext.toString(),
        extensions: [
          ...buildExtensions({
            ytext,
            awareness,
            undoManager,
            language,
            compact,
            readOnly,
            placeholderText,
            languageCompartment: languageCompartment.current,
          }),
          EditorView.updateListener.of((update) => {
            if (!update.selectionSet && !update.docChanged) return
            const head = update.state.selection.main.head
            const line = update.state.doc.lineAt(head)
            cursorRef.current?.(line.number, head - line.from + 1)
          }),
        ],
      }),
    })
    viewRef.current = view

    return () => {
      viewRef.current = null
      view.destroy()
    }
    // language / compact / readOnly 通过下面两个 effect 处理，故意不进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytext, awareness, undoManager])

  // 切语言：用 Compartment 重新配置，不重建编辑器（重建会丢 yCollab 绑定和光标）
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: languageCompartment.current.reconfigure(languageExtension(language)),
    })
  }, [language])

  return <div ref={hostRef} className={`h-full min-h-0 overflow-hidden ${className ?? ''}`} />
}
