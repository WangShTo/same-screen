import { createBrowserRouter, Navigate, useParams } from 'react-router'
import Landing from '@/pages/Landing'
import Room from '@/pages/Room'
import Replay from '@/pages/Replay'

function ShareRedirect() {
  const { id = '' } = useParams()
  return <Navigate to={`/room/${id}`} replace />
}

function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <p className="font-mono text-sm text-fg-faint">404</p>
        <h1 className="mt-2 text-xl font-medium">这个页面不存在</h1>
        <a
          href="/"
          className="mt-6 inline-block rounded-lg border border-line px-4 py-2 text-sm text-fg-dim hover:text-fg"
        >
          回首页
        </a>
      </div>
    </main>
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/room/:id', element: <Room /> },
  { path: '/room/:id/replay', element: <Replay /> },
  { path: '/r/:id', element: <ShareRedirect /> },
  { path: '*', element: <NotFound /> },
])
