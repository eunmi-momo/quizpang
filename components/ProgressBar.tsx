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
    <div className="w-full max-w-xl mx-auto px-1">
      <div className="text-sm sm:text-base font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        <span className="tabular-nums">
          {current} / {total}
        </span>
      </div>
      <div
        className="h-3 sm:h-3.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden shadow-inner"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`진행 ${current} 중 ${total}`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-500 ease-out"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  )
}
