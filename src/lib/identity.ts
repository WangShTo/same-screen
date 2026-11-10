export interface Identity {
  id: string
  name: string
  color: string
}

const NAME_KEY = 'same-screen:name'
const ID_KEY = 'same-screen:uid'
const COLOR_KEY = 'same-screen:color'

/** 成员配色：深色背景下都能看清。 */
export const MEMBER_COLORS = [
  '#6ea8fe',
  '#7ee2a8',
  '#f5b76b',
  '#e88fb3',
  '#b39cf7',
  '#6fd3d8',
  '#f08a7a',
  '#c7d36f',
] as const

function pickColor(): string {
  const idx = crypto.getRandomValues(new Uint8Array(1))[0] ?? 0
  return MEMBER_COLORS[idx % MEMBER_COLORS.length] ?? MEMBER_COLORS[0]
}

function readName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

function readColor(): string {
  try {
    return localStorage.getItem(COLOR_KEY) ?? ''
  } catch {
    return ''
  }
}

function newId(): string {
  return crypto.randomUUID()
}

/** 读取本机身份；昵称可能为空（首次），颜色和 id 一定存在。 */
export function loadIdentity(): Identity {
  let id = ''
  let color = ''

  try {
    id = localStorage.getItem(ID_KEY) ?? ''
    if (!id) {
      id = newId()
      localStorage.setItem(ID_KEY, id)
    }
  } catch {
    id = newId()
  }

  color = readColor() || pickColor()
  if (!readColor()) {
    try {
      localStorage.setItem(COLOR_KEY, color)
    } catch {
      /* 隐私模式下写不进去，用内存里的颜色即可 */
    }
  }

  return { id, name: readName(), color }
}

export function saveIdentity(name: string, color: string): void {
  try {
    localStorage.setItem(NAME_KEY, name)
    localStorage.setItem(COLOR_KEY, color)
  } catch {
    /* 隐私模式：不阻断流程 */
  }
}

export function saveColor(color: string): void {
  try {
    localStorage.setItem(COLOR_KEY, color)
  } catch {
    /* 同上 */
  }
}
