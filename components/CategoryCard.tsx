'use client'

import type { Category } from '@/types/quiz'

const categoryStyles: Record<Category, { bar: string; emojiBg: string }> = {
  broadcast: { bar: 'bg-doodle-purple', emojiBg: 'bg-doodle-purple/15' },
  movie: { bar: 'bg-doodle-sky', emojiBg: 'bg-doodle-sky/20' },
  music: { bar: 'bg-doodle-pink', emojiBg: 'bg-doodle-pink/15' },
  star: { bar: 'bg-doodle-yellow', emojiBg: 'bg-doodle-yellow/25' },
}

export interface CategoryCardProps {
  category: Category
  label: string
  emoji: string
  onClick: () => void
}

export function CategoryCard({ category, label, emoji, onClick }: CategoryCardProps) {
  const s = categoryStyles[category]

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group relative flex aspect-square w-full min-w-0 flex-col overflow-hidden rounded-lg border-[3px] border-black bg-white text-zinc-900',
        'shadow-[2px_2px_0_#000]',
        'transition-transform duration-200 hover:-translate-y-px hover:shadow-[3px_3px_0_#000] active:translate-y-0',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-doodle-purple focus-visible:ring-offset-2',
      ].join(' ')}
    >
      <span className={`h-1.5 w-full shrink-0 ${s.bar}`} aria-hidden />
      <span className="flex min-h-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 pb-1.5 pt-0.5 sm:gap-1 sm:px-1 sm:pb-2 sm:pt-1">
        <span
          className={`flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-md border-2 border-black text-[1.85rem] leading-none sm:h-16 sm:w-16 sm:text-[2.35rem] ${s.emojiBg}`}
          aria-hidden
        >
          {emoji}
        </span>
        <span className="line-clamp-2 text-center font-jua text-xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-2xl">
          {label}
        </span>
      </span>
    </button>
  )
}
