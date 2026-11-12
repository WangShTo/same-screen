import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Download } from 'lucide-react'
import type * as Y from 'yjs'
import type { Lang } from '@/features/editor/languages'
import { EXPORT_FORMATS, fileName, formatExt } from './formats'
import { saveTextFile, type SaveResult } from './save'

type Props = {
  doc: Y.Doc
  roomId: string
  lang: Lang
}

const RESULT_TEXT: Record<SaveResult, string> = {
  saved: '已保存',
  downloaded: '已下载',
  cancelled: '已取消',
  failed: '保存失败',
}

export function ExportMenu({ doc, roomId, lang }: Props) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handlePick(formatId: string) {
    const format = EXPORT_FORMATS.find((item) => item.id === formatId)
    if (!format) return
    setOpen(false)
    const ext = formatExt(format, lang)
    const result = await saveTextFile({
      suggestedName: fileName({ doc, roomId, lang }, ext),
      mime: format.mime,
      ext,
      text: format.build({ doc, roomId, lang }),
    })
    setNote(RESULT_TEXT[result])
    window.setTimeout(() => setNote(''), 1800)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-transparent px-2.5 text-xs text-fg-dim transition-colors hover:border-fg-faint/50 hover:text-fg"
        title="导出房间内容"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">导出</span>
        <ChevronDown className={`hidden h-3 w-3 transition-transform sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-64 overflow-hidden rounded-xl border border-line bg-panel p-1 shadow-2xl shadow-black/40">
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.id}
              type="button"
              onClick={() => void handlePick(format.id)}
              className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-panel-2"
            >
              <span className="mt-0.5 font-mono text-[10px] uppercase text-fg-faint">
                .{formatExt(format, lang)}
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-fg">{format.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-fg-faint">{format.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {note && (
        <span className="absolute right-0 top-10 z-30 flex items-center gap-1 rounded-lg border border-line bg-panel px-2 py-1 text-[11px] text-fg-dim">
          <Check className="h-3 w-3" />
          {note}
        </span>
      )}
    </div>
  )
}
