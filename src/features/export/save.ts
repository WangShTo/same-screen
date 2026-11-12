/**
 * 保存文件：优先让用户自己选路径（File System Access API），
 * 浏览器不支持或被策略拦掉时退回普通下载。
 */

type FilePickerAcceptType = {
  description?: string
  accept: Record<string, string[]>
}

type SaveFilePickerOptions = {
  suggestedName?: string
  types?: FilePickerAcceptType[]
}

type WritableStreamLike = {
  write: (data: BlobPart) => Promise<void>
  close: () => Promise<void>
}

type FileHandleLike = {
  createWritable: () => Promise<WritableStreamLike>
}

type WindowWithPicker = Window & {
  showSaveFilePicker?: (options: SaveFilePickerOptions) => Promise<FileHandleLike>
}

export type SaveResult = 'saved' | 'cancelled' | 'downloaded' | 'failed'

export type SaveFileOptions = {
  suggestedName: string
  mime: string
  ext: string
  text: string
}

export type SaveBlobOptions = {
  suggestedName: string
  mime: string
  ext: string
  blob: Blob
}

export function canPickSavePath(): boolean {
  return typeof (window as WindowWithPicker).showSaveFilePicker === 'function'
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body = ''] = dataUrl.split(',')
  const mime = /data:([^;]+)/.exec(head ?? '')?.[1] ?? 'application/octet-stream'
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mime })
}

export async function saveBlobFile({ suggestedName, mime, ext, blob }: SaveBlobOptions): Promise<SaveResult> {
  const picker = (window as WindowWithPicker).showSaveFilePicker

  if (picker) {
    try {
      const handle = await picker({
        suggestedName,
        types: [{ description: `${ext.toUpperCase()} 文件`, accept: { [mime]: [`.${ext}`] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return 'saved'
    } catch (error) {
      // 用户点取消是 AbortError，不该再偷偷下载一份
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      console.warn('[export] 选择保存路径失败，改用下载', error)
    }
  }

  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = suggestedName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 2000)
    return 'downloaded'
  } catch (error) {
    console.error('[export] 保存失败', error)
    return 'failed'
  }
}

export async function saveTextFile({ suggestedName, mime, ext, text }: SaveFileOptions): Promise<SaveResult> {
  return saveBlobFile({
    suggestedName,
    mime,
    ext,
    blob: new Blob([text], { type: `${mime};charset=utf-8` }),
  })
}
