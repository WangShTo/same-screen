export type Lang = 'java' | 'python' | 'javascript'

export const LANGS: ReadonlyArray<{ id: Lang; label: string }> = [
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
]

export function isLang(value: unknown): value is Lang {
  return value === 'java' || value === 'python' || value === 'javascript'
}

export function langLabel(lang: Lang): string {
  return LANGS.find((item) => item.id === lang)?.label ?? 'Java'
}
