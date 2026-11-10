const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'
const CODE_LENGTH = 6

/** 生成 6 位房间码：去掉 0/o/1/l/i 等易混字符，只用小写。 */
export function newRoomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH)
  crypto.getRandomValues(bytes)
  let code = ''
  for (const byte of bytes) {
    // 数组下标一定存在：ALPHABET 长度固定且非空
    code += ALPHABET[byte % ALPHABET.length] ?? '2'
  }
  return code
}

/** 房间码合法：6 位，且在字母表内。 */
export function isValidRoomCode(value: string): boolean {
  if (value.length !== CODE_LENGTH) return false
  for (const ch of value) {
    if (!ALPHABET.includes(ch)) return false
  }
  return true
}

/** 用户可能输入大写或带空格，统一收敛成合法形式。 */
export function normalizeRoomCode(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}
