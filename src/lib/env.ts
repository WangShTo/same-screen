/** 实时服务地址：开发时走 vite proxy 到本地 wrangler，生产同域。 */
export function workerOrigin(): string {
  return import.meta.env.DEV ? '127.0.0.1:8787' : window.location.host
}

/** 完整分享链接。 */
export function shareUrl(roomId: string): string {
  return `${window.location.origin}/r/${roomId}`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
