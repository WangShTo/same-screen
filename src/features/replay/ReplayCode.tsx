import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { languageExtension } from '@/features/editor/extensions'
import type { Lang } from '@/features/editor/languages'
import { sameScreenSyntax, sameScreenTheme } from '@/features/editor/theme'

type Props = { text: string; lang: Lang }

/**
 * 回放里的只读代码。
 * 不复用 CodeEditor：那个绑着 Y.Text + yCollab，回放需要的是"给一段文本就画"，
 * 但主题、语法高亮、行号是同一套，看起来和房间里一致。
 */
export function ReplayCode({ text, lang }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!host.current) return
    const state = EditorState.create({
      doc: text,
      extensions: [
        sameScreenTheme,
        sameScreenSyntax,
        lineNumbers(),
        languageExtension(lang),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.lineWrapping,
      ],
    })
    const instance = new EditorView({ state, parent: host.current })
    view.current = instance
    return () => {
      instance.destroy()
      view.current = null
    }
    // 语言变了重建，文本变化走下面的 dispatch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  useEffect(() => {
    const instance = view.current
    if (!instance) return
    const current = instance.state.doc.toString()
    if (current === text) return
    instance.dispatch({ changes: { from: 0, to: current.length, insert: text } })
  }, [text])

  return <div ref={host} className="h-full w-full overflow-hidden" />
}
