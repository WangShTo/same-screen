import { useState } from 'react'
import { useNavigate } from 'react-router'
import { MEMBER_COLORS, loadIdentity, saveIdentity } from '@/lib/identity'
import { isValidRoomCode, newRoomCode, normalizeRoomCode } from '@/lib/roomCode'

function nextColor(current: string): string {
  const idx = MEMBER_COLORS.indexOf(current as (typeof MEMBER_COLORS)[number])
  return MEMBER_COLORS[(idx + 1) % MEMBER_COLORS.length] ?? MEMBER_COLORS[0]
}

export default function Landing() {
  const navigate = useNavigate()
  const [identity] = useState(loadIdentity)
  const [name, setName] = useState(identity.name)
  const [color, setColor] = useState(identity.color)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const trimmed = name.trim()

  function enter(roomId: string) {
    saveIdentity(trimmed, color)
    navigate(`/room/${roomId}?new=1`)
  }

  function handleCreate() {
    if (!trimmed) {
      setError('先填个昵称')
      return
    }
    setError('')
    enter(newRoomCode())
  }

  function handleJoin() {
    if (!trimmed) {
      setError('先填个昵称')
      return
    }
    const normalized = normalizeRoomCode(code)
    if (!isValidRoomCode(normalized)) {
      setError('房间码是 6 位')
      return
    }
    setError('')
    enter(normalized)
  }

  return (
    <main className="flex min-h-dvh flex-col bg-ink">
      <header className="flex h-20 shrink-0 items-center px-6 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="relative h-6 w-6">
            <span className="absolute left-0 top-0 h-4 w-4 rounded-[5px] border border-accent/70 bg-accent/15" />
            <span className="absolute bottom-0 right-0 h-4 w-4 rounded-[5px] border border-fg-faint/50 bg-panel" />
          </div>
          <span className="text-[15px] font-medium tracking-wide">同屏</span>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-[340px]">
          <h1 className="text-[40px] font-semibold leading-none tracking-[-0.035em] text-fg">同屏</h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-fg-faint">same-screen</p>

          <div className="mt-14 space-y-3">
            <div className="relative">
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setError('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleCreate()
                }}
                maxLength={16}
                placeholder="昵称"
                aria-label="昵称"
                className="h-12 w-full rounded-2xl border border-transparent bg-panel pl-4 pr-14 text-sm text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-accent/50"
              />
              <button
                type="button"
                onClick={() => setColor(nextColor(color))}
                title="换个颜色"
                aria-label="换个颜色"
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-xl transition-colors hover:bg-panel-2"
              >
                <span className="h-3.5 w-3.5 rounded-full" style={{ background: color }} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCreate}
              className="h-12 w-full rounded-2xl bg-accent text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 active:opacity-80"
            >
              创建房间
            </button>

            <div className="flex items-center gap-3 py-5">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[11px] text-fg-faint">或</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="flex gap-2">
              <input
                value={code}
                onChange={(event) => {
                  setCode(normalizeRoomCode(event.target.value))
                  setError('')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleJoin()
                }}
                maxLength={6}
                placeholder="房间码"
                aria-label="房间码"
                className="h-12 min-w-0 flex-1 rounded-2xl border border-transparent bg-panel px-4 font-mono text-sm tracking-[0.2em] text-fg outline-none transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-fg-faint focus:border-accent/50"
              />
              <button
                type="button"
                onClick={handleJoin}
                className="h-12 shrink-0 rounded-2xl border border-line px-5 text-sm text-fg-dim transition-colors hover:border-fg-faint/50 hover:text-fg"
              >
                进入
              </button>
            </div>
          </div>

          <p className="mt-5 h-4 text-[11px] text-red-400" role={error ? 'alert' : undefined}>
            {error}
          </p>
        </div>
      </div>
    </main>
  )
}
