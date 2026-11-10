import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Users } from 'lucide-react'
import { Button } from '@/components/Button'
import { isValidRoomCode, newRoomCode, normalizeRoomCode } from '@/lib/roomCode'
import { MEMBER_COLORS, loadIdentity, saveIdentity } from '@/lib/identity'

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
    navigate(`/room/${roomId}`)
  }

  function handleCreate() {
    if (!trimmed) {
      setError('先起个昵称，对方才知道是谁')
      return
    }
    setError('')
    enter(newRoomCode())
  }

  function handleJoin() {
    if (!trimmed) {
      setError('先起个昵称，对方才知道是谁')
      return
    }
    const normalized = normalizeRoomCode(code)
    if (!isValidRoomCode(normalized)) {
      setError('房间码是 6 位，字母和数字')
      return
    }
    setError('')
    enter(normalized)
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(110,168,254,0.10),transparent_65%)]" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <div className="relative h-6 w-6">
              <span className="absolute left-0 top-0 h-4 w-4 rounded-[5px] border border-accent/70 bg-accent/15" />
              <span className="absolute bottom-0 right-0 h-4 w-4 rounded-[5px] border border-fg-faint/60 bg-panel" />
            </div>
            <span className="text-[15px] font-medium tracking-wide">同屏</span>
            <span className="hidden font-mono text-xs text-fg-faint sm:inline">same-screen</span>
          </div>
          <span className="text-xs text-fg-faint">不用注册</span>
        </header>

        <div className="flex flex-1 items-center justify-center py-6">
          <section className="w-full max-w-[420px]">
            <h1 className="text-[26px] font-medium leading-[1.45] tracking-tight sm:text-[30px]">
              一个链接，
              <br />
              两个人一起讲代码
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-fg-dim">
              共享代码、画板、计时。指着某几行说话时旁边顺手画一笔，讲完能导出，也能按时间轴回放。
            </p>

            <div className="mt-7 rounded-xl border border-line bg-panel/85 p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
              <label htmlFor="nickname" className="text-xs text-fg-dim">
                昵称
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="nickname"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                  }}
                  maxLength={16}
                  placeholder="比如 老王"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none placeholder:text-fg-faint focus:border-accent/60"
                />
                <button
                  type="button"
                  onClick={() => setColor(nextColor(color))}
                  title="换个颜色"
                  aria-label="换个颜色"
                  className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-lg border border-line bg-ink"
                >
                  <span className="h-3.5 w-3.5 rounded-full" style={{ background: color }} />
                </button>
              </div>

              <Button onClick={handleCreate} className="mt-4 w-full">
                创建房间
                <ArrowRight className="h-4 w-4" />
              </Button>

              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[11px] text-fg-faint">或加入别人的房间</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(normalizeRoomCode(e.target.value))
                    setError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoin()
                  }}
                  maxLength={6}
                  placeholder="6 位房间码"
                  aria-label="房间码"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm tracking-[0.25em] outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-fg-faint focus:border-accent/60"
                />
                <Button variant="outline" onClick={handleJoin}>
                  <Users className="h-4 w-4" />
                  进入
                </Button>
              </div>

              <p
                className={`mt-3 min-h-[16px] text-xs ${error ? 'text-red-400' : 'text-fg-faint'}`}
                role={error ? 'alert' : undefined}
              >
                {error || '创建后会得到一个房间链接，发给他就行。'}
              </p>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between py-6 text-xs text-fg-faint">
          <span>React · Yjs · Konva · Cloudflare Workers</span>
          <span className="font-mono">v0.1</span>
        </footer>
      </div>
    </main>
  )
}
