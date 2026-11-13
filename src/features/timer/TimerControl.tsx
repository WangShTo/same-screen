import { Pause, Play, RotateCcw } from 'lucide-react'
import { TIMER_PRESETS, formatRemaining, type RoomTimer } from './useTimer'

type Props = {
  timer: RoomTimer
}

/** 顶栏里的同步计时器：两端看到同一个剩余时间。 */
export function TimerControl({ timer }: Props) {
  const minutes = Math.round(timer.durationMs / 60000)
  const low = timer.remainingMs <= 60_000

  return (
    <div className="flex items-center gap-1 rounded-lg border border-line bg-panel px-1.5 py-1">
      <span
        className={`w-11 text-center font-mono text-sm tabular-nums ${low ? 'text-[#f2b878]' : 'text-fg-dim'}`}
        title="两端看到同一个倒计时"
      >
        {formatRemaining(timer.remainingMs)}
      </span>

      <button
        type="button"
        onClick={timer.running ? timer.pause : timer.start}
        className="grid h-6 w-6 place-items-center rounded text-fg-faint hover:bg-panel-2 hover:text-fg"
        title={timer.running ? '暂停（两端同步）' : '开始（两端同步）'}
        aria-label={timer.running ? '暂停计时' : '开始计时'}
      >
        {timer.running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>

      <button
        type="button"
        onClick={timer.reset}
        className="grid h-6 w-6 place-items-center rounded text-fg-faint hover:bg-panel-2 hover:text-fg"
        title="重置到整段时间"
        aria-label="重置计时"
      >
        <RotateCcw className="h-3 w-3" />
      </button>

      <select
        value={minutes}
        onChange={(event) => timer.setDuration(Number(event.target.value))}
        className="hidden appearance-none rounded bg-transparent py-0.5 pl-1 pr-3 font-mono text-[11px] text-fg-faint hover:bg-panel-2 focus:outline-none sm:block"
        title="时长（两端同步）"
      >
        {TIMER_PRESETS.map((preset) => (
          <option key={preset} value={preset} className="bg-panel text-fg">
            {preset}m
          </option>
        ))}
      </select>
    </div>
  )
}
