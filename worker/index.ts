import { routePartykitRequest } from 'partyserver'

export { Room } from './Room'

export interface Env {
  Main: DurableObjectNamespace
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // /parties/* 走房间 WebSocket，其余交给静态资源（同域部署，免 CORS）
    const party = await routePartykitRequest(request, env as unknown as Record<string, unknown>)
    if (party) return party
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
