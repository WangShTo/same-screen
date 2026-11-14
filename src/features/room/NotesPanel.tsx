import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import { CodeEditor } from '@/features/editor/CodeEditor'

type Props = {
  ytext: Y.Text
  awareness: Awareness | null
  undoManager: Y.UndoManager
  synced: boolean
  open: boolean
}

/** 左侧题目/笔记面板，桌面端可收起。 */
export function NotesPanel({ ytext, awareness, undoManager, synced, open }: Props) {
  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-line md:flex ${
        open ? 'md:w-60' : 'md:w-0 md:overflow-hidden md:border-r-0'
      }`}
    >
      <div className="flex h-10 shrink-0 items-center border-b border-line px-3">
        <span className="text-xs font-medium text-fg-dim">题目 / 笔记</span>
      </div>
      <div className="min-h-0 flex-1">
        {awareness && synced ? (
          <CodeEditor
            ytext={ytext}
            awareness={awareness}
            undoManager={undoManager}
            language="javascript"
            compact
            placeholderText="粘贴题目"
          />
        ) : (
          <p className="p-3 text-xs text-fg-faint">同步中…</p>
        )}
      </div>
    </aside>
  )
}
