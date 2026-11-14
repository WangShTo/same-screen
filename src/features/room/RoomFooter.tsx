import { Redo2, Undo2 } from 'lucide-react'
import { LANGS, langLabel, type Lang } from '@/features/editor/languages'
import { STATUS_COLOR, STATUS_TEXT } from '@/features/room/StatusDot'
import type { ConnStatus } from '@/features/presence/usePresence'
import type * as Y from 'yjs'

type Props = {
  lang: Lang
  setLang: (lang: Lang) => void
  cursor: { line: number; column: number }
  status: ConnStatus
  undoManager: Y.UndoManager
  undoState: { undo: number; redo: number }
}

/** 底部状态栏：语言、光标位置、同步状态、撤销重做。 */
export function RoomFooter({ lang, setLang, cursor, status, undoManager, undoState }: Props) {
  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-line px-3 text-[11px] text-fg-faint">
      <select
        value={lang}
        onChange={(event) => setLang(event.target.value as Lang)}
        className="-ml-1 appearance-none rounded border border-transparent bg-transparent py-0.5 pl-1 pr-4 font-mono text-[11px] text-fg-dim hover:border-line hover:bg-panel focus:outline-none"
        title="切换语言（两端同步）"
      >
        {LANGS.map((item) => (
          <option key={item.id} value={item.id} className="bg-panel text-fg">
            {langLabel(item.id)}
          </option>
        ))}
      </select>

      <span className="font-mono tabular-nums">
        行 {cursor.line}, 列 {cursor.column}
      </span>

      <span className="ml-auto flex items-center gap-1.5" title="Yjs 同步状态">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
        {status === 'connected' ? '已同步' : STATUS_TEXT[status]}
      </span>

      <span className="flex items-center gap-1">
        <button
          type="button"
          disabled={undoState.undo === 0}
          onClick={() => undoManager.undo()}
          className="grid h-5 w-5 place-items-center rounded text-fg-faint enabled:hover:bg-panel-2 enabled:hover:text-fg disabled:text-fg-faint/40"
          title={`撤销（${undoState.undo}）`}
        >
          <Undo2 className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled={undoState.redo === 0}
          onClick={() => undoManager.redo()}
          className="grid h-5 w-5 place-items-center rounded text-fg-faint enabled:hover:bg-panel-2 enabled:hover:text-fg disabled:text-fg-faint/40"
          title={`重做（${undoState.redo}）`}
        >
          <Redo2 className="h-3 w-3" />
        </button>
      </span>
    </footer>
  )
}
