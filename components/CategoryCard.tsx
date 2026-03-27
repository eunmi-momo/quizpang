'use client'

import type { Category } from '@/types/quiz'

const categoryStyles: Record<
  Category,
  { gradient: string; ring: string; shadow: string }
> = {
  broadcast: {
    gradient: 'from-violet-600 to-purple-700',
    ring: 'ring-violet-400/50',
    shadow: 'shadow-violet-500/25',
  },
  movie: {
    gradient: 'from-blue-600 to-indigo-700',
    ring: 'ring-blue-400/50',
    shadow: 'shadow-blue-500/25',
  },
  music: {
    gradient: 'from-pink-500 to-rose-600',
    ring: 'ring-pink-400/50',
    shadow: 'shadow-pink-500/25',
  },
  star: {
    gradient: 'from-amber-400 to-yellow-500',
    ring: 'ring-amber-300/60',
    shadow: 'shadow-amber-500/30',
  },
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
        'group relative w-full max-w-sm mx-auto rounded-2xl p-5 sm:p-6 text-left',
        'bg-gradient-to-br text-white',
        s.gradient,
        'shadow-lg transition-all duration-300 ease-out',
        'hover:scale-[1.03] active:scale-[0.98]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950',
        s.ring,
        s.shadow,
        'hover:shadow-xl',
      ].join(' ')}
    >
      <span className="text-4xl sm:text-5xl block mb-3 drop-shadow-sm" aria-hidden>
        {emoji}
      </span>
      <span className="text-lg sm:text-xl font-bold tracking-tight block">{label}</span>
      <span className="mt-1 text-sm text-white/85 font-medium">퀴즈 풀러 가기 →</span>
    </button>
  )
}
