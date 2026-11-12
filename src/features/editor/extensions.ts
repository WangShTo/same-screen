import { javascript } from '@codemirror/lang-javascript'
import { java } from '@codemirror/lang-java'
import { python } from '@codemirror/lang-python'
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view'
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next'
import type { Awareness } from 'y-protocols/awareness'
import type * as Y from 'yjs'
import type { Lang } from './languages'
import { sameScreenSyntax, sameScreenTheme } from './theme'

export function languageExtension(lang: Lang): Extension {
  switch (lang) {
    case 'java':
      return java()
    case 'python':
      return python()
    case 'javascript':
      return javascript()
  }
}

type BuildOptions = {
  ytext: Y.Text
  awareness: Awareness
  undoManager: Y.UndoManager
  language: Lang
  compact: boolean
  readOnly: boolean
  placeholderText: string
  languageCompartment: Compartment
}

/**
 * 手写扩展列表，**绝不使用 basicSetup**：它内部含 history()，
 * 会和 Y.UndoManager 抢 Ctrl+Z（表现是撤掉别人刚输入的内容）。
 */
export function buildExtensions(options: BuildOptions): Extension[] {
  const { ytext, awareness, undoManager, language, compact, readOnly, placeholderText, languageCompartment } = options

  const chrome: Extension[] = compact
    ? [EditorView.editorAttributes.of({ class: 'cm-compact' })]
    : [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
      ]

  return [
    ...chrome,
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    sameScreenTheme,
    sameScreenSyntax,
    placeholder(placeholderText),
    bracketMatching(),
    indentOnInput(),
    autocompletion(),
    closeBrackets(),
    keymap.of([...closeBracketsKeymap, ...completionKeymap, ...foldKeymap, indentWithTab, ...defaultKeymap]),
    languageCompartment.of(languageExtension(language)),
    yCollab(ytext, awareness, { undoManager }),
    keymap.of(yUndoManagerKeymap),
    EditorView.lineWrapping,
    // 关掉浏览器拼写检查：代码里一串红波浪线很脏，截图也不好看
    EditorView.contentAttributes.of({ spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' }),
  ]
}
