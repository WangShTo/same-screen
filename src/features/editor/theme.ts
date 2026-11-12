import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

/**
 * 深色编辑器主题，颜色直接复用 styles.css 里的 --color-*，避免出现第二套色板。
 * 不用 @codemirror/theme-one-dark：多一个依赖，而且它不是我们的背景色。
 */
export const sameScreenTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: 'var(--color-ink)',
      color: 'var(--color-fg)',
      fontSize: '13px',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
      lineHeight: '1.65',
      overflow: 'auto',
    },
    '.cm-content': {
      padding: '10px 0',
      caretColor: 'var(--color-accent)',
    },
    '.cm-line': { padding: '0 16px' },
    '&.cm-focused': { outline: 'none' },
    '.cm-gutters': {
      backgroundColor: 'var(--color-ink)',
      color: 'var(--color-fg-faint)',
      border: 'none',
      paddingLeft: '6px',
    },
    '.cm-activeLine': { backgroundColor: 'rgb(255 255 255 / 0.025)' },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--color-fg-dim)',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: '#2a4a7f !important',
    },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: '#2a4a7f' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-accent)' },
    '.cm-placeholder': { color: 'var(--color-fg-faint)' },
    // 笔记面板（compact）：更紧的内边距、更小的字号，别喧宾夺主
    '&.cm-compact': { fontSize: '12.5px' },
    '&.cm-compact .cm-content': { padding: '10px 0' },
    '&.cm-compact .cm-line': { padding: '0 12px' },
    '&.cm-compact .cm-placeholder': { color: 'rgb(91 100 114 / 0.85)', fontStyle: 'italic' },
    '.cm-foldPlaceholder': {
      backgroundColor: 'var(--color-panel-2)',
      border: '1px solid var(--color-line)',
      color: 'var(--color-fg-dim)',
    },
    // 远端光标：y-codemirror.next 用 y-codemirror 的样式类
    '.cm-ySelectionInfo': {
      fontSize: '10px',
      padding: '1px 4px',
      borderRadius: '3px',
      color: '#0a1420',
    },
    '.cm-ySelectionCaret': { borderLeftWidth: '2px' },
  },
  { dark: true },
)

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.moduleKeyword, t.controlKeyword], color: '#c792ea' },
  { tag: [t.string, t.special(t.string)], color: '#a5d6a7' },
  { tag: [t.number, t.integer, t.float], color: '#f78c6c' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#5b6472', fontStyle: 'italic' },
  { tag: [t.typeName, t.className, t.namespace], color: '#ffcb6b' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#82aaff' },
  { tag: [t.propertyName, t.attributeName], color: '#b2ccd6' },
  { tag: [t.operator, t.punctuation, t.separator], color: '#89ddff' },
  { tag: [t.bool, t.null, t.atom], color: '#ff9cac' },
  { tag: [t.variableName, t.definition(t.variableName)], color: '#e7eaee' },
  { tag: [t.tagName, t.angleBracket], color: '#f07178' },
  { tag: t.invalid, color: '#ff5370' },
])

export const sameScreenSyntax = syntaxHighlighting(highlight)
