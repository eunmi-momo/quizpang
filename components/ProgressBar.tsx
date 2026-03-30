'use client'

import { useEffect, useState } from 'react'

export interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1
  const pct = Math.min(100, Math.max(0, (current / safeTotal) * 100))
  const [widthPct, setWidthPct] = useState(0)

  useEffect(() => {
    const t = requestAnimationFrame(() => setWidthPct(pct))
    return () => cancelAnimationFrame(t)
  }, [pct])

  return (
    <div className="mx-auto w-full max-w-xl px-1">
      <div className="mb-2 text-sm font-bold text-zinc-800 sm:text-base">
        <span className="tabular-nums">
          {current} / {total}
        </span>
      </div>
      <div
        className="h-3.5 w-full overflow-hidden rounded-full border-2 border-black bg-white sm:h-4"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`진행 ${current} 중 ${total}`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-doodle-green via-doodle-sky to-doodle-purple transition-[width] duration-500 ease-out"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  )
}
