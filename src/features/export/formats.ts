import type * as Y from 'yjs'
import type { Lang } from '@/features/editor/languages'
import { langLabel } from '@/features/editor/languages'

export type ExportContext = {
  doc: Y.Doc
  roomId: string
  lang: Lang
}

export type ExportFormat = {
  id: string
  label: string
  /** 导出后文件里装的是什么，一句白话 */
  hint: string
  ext: string
  mime: string
  build: (ctx: ExportContext) => string
}

function stamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

export function fileName(ctx: ExportContext, ext: string): string {
  return `same-screen-${ctx.roomId}-${stamp()}.${ext}`
}

const SOURCE_EXT: Record<Lang, string> = {
  java: 'java',
  python: 'py',
  javascript: 'js',
}

const FENCE: Record<Lang, string> = {
  java: 'java',
  python: 'python',
  javascript: 'javascript',
}

export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'markdown',
    label: 'Markdown',
    hint: '题目 + 代码，带语法标记',
    ext: 'md',
    mime: 'text/markdown',
    build: ({ doc, lang }) => {
      const notes = doc.getText('notes').toString().trim()
      const code = doc.getText('code').toString()
      const parts = [`# 同屏 · 房间记录`, '']
      if (notes) parts.push('## 题目 / 笔记', '', notes, '')
      parts.push(`## 代码 · ${langLabel(lang)}`, '', '```' + FENCE[lang], code.replace(/\n$/, ''), '```', '')
      return parts.join('\n')
    },
  },
  {
    id: 'source',
    label: '源代码',
    hint: '只有代码，按当前语言存',
    ext: 'txt',
    mime: 'text/plain',
    build: ({ doc }) => {
      return doc.getText('code').toString()
    },
  },
  {
    id: 'text',
    label: '纯文本',
    hint: '题目和代码用分隔线隔开',
    ext: 'txt',
    mime: 'text/plain',
    build: ({ doc }) => {
      const notes = doc.getText('notes').toString().trim()
      const code = doc.getText('code').toString().replace(/\n$/, '')
      return notes ? `${notes}\n\n──────────\n\n${code}\n` : `${code}\n`
    },
  },
  {
    id: 'json',
    label: 'JSON',
    hint: '整份房间文档，回放/迁移用',
    ext: 'json',
    mime: 'application/json',
    build: ({ doc, roomId, lang }) => {
      const meta = Object.fromEntries(doc.getMap<unknown>('meta').entries())
      const shapes = [...doc.getMap<unknown>('shapes').entries()]
      return JSON.stringify(
        {
          app: 'same-screen',
          version: 1,
          room: roomId,
          exportedAt: new Date().toISOString(),
          lang,
          notes: doc.getText('notes').toString(),
          code: doc.getText('code').toString(),
          meta,
          shapes: shapes.map(([id, shape]) => ({ id, ...(shape as Record<string, unknown>) })),
        },
        null,
        2,
      )
    },
  },
]

/** 源代码格式的文件后缀跟着语言走 */
export function formatExt(format: ExportFormat, lang: Lang): string {
  return format.id === 'source' ? SOURCE_EXT[lang] : format.ext
}
