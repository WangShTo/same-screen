import { useEffect, useState } from 'react'
import type YProvider from 'y-partyserver/provider'

export type ConnStatus = 'connecting' | 'connected' | 'disconnected'

export type Peer = {
  clientId: number
  name: string
  color: string
  self: boolean
}

type AwarenessUser = { name?: unknown; color?: unknown }

function readUser(state: unknown): { name: string; color: string } | null {
  if (typeof state !== 'object' || state === null) return null
  const user = (state as { user?: unknown }).user
  if (typeof user !== 'object' || user === null) return null
  const { name, color } = user as AwarenessUser
  if (typeof name !== 'string' || name.length === 0) return null
  return { name, color: typeof color === 'string' ? color : '#8b93a1' }
}

/**
 * 在线成员 + 连接状态。
 * 成员来自 Awareness（不进 Y.Doc）；断线时 Awareness 会自动清掉本机以外的状态。
 */
export function usePresence(provider: YProvider | null): { status: ConnStatus; peers: Peer[] } {
  const [status, setStatus] = useState<ConnStatus>('connecting')
  const [peers, setPeers] = useState<Peer[]>([])

  useEffect(() => {
    if (!provider) return
    const awareness = provider.awareness

    const sync = () => {
      const next: Peer[] = []
      awareness.getStates().forEach((state, clientId) => {
        const user = readUser(state)
        if (!user) return
        next.push({ clientId, name: user.name, color: user.color, self: clientId === awareness.clientID })
      })
      next.sort((a, b) => Number(b.self) - Number(a.self) || a.clientId - b.clientId)
      setPeers(next)
    }

    const onStatus = (event: { status?: unknown }) => {
      const value = event.status
      setStatus(value === 'connected' ? 'connected' : value === 'disconnected' ? 'disconnected' : 'connecting')
    }

    awareness.on('change', sync)
    awareness.on('update', sync)
    provider.on('status', onStatus)
    sync()
    if (provider.wsconnected) setStatus('connected')

    return () => {
      awareness.off('change', sync)
      awareness.off('update', sync)
      provider.off('status', onStatus)
    }
  }, [provider])

  return { status, peers }
}
