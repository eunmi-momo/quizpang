'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { CategoryCard } from '@/components/CategoryCard'
import { NicknameModal } from '@/components/NicknameModal'
import { apiUrl } from '@/lib/base-path'
import { saveQuizPrefetch } from '@/lib/quiz-prefetch'
import type { Category } from '@/types/quiz'

const CARDS: { category: Category; label: string; emoji: string }[] = [
  { category: 'broadcast', label: '방송', emoji: '📺' },
  { category: 'movie', label: '영화', emoji: '🎬' },
  { category: 'music', label: '뮤직', emoji: '🎵' },
  { category: 'star', label: '스타', emoji: '⭐' },
]

export default function HomePage() {
  const router = useRouter()
  const [modalCategory, setModalCategory] = useState<Category | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const prefetchReadyRef = useRef<Promise<void> | null>(null)

  /** 카테고리 모달이 열리면 해당 퀴즈를 미리 불러와 sessionStorage에 저장 */
  useEffect(() => {
    if (!modalCategory) {
      prefetchReadyRef.current = null
      return
    }
    const cat = modalCategory
    prefetchReadyRef.current = (async () => {
      try {
        const res = await fetch(apiUrl(`/api/quiz/generate?category=${encodeURIComponent(cat)}`))
        const data = await res.json().catch(() => ({}))
        if (!res.ok) return
        const qs = data.questions
        if (Array.isArray(qs) && qs.length > 0) {
          saveQuizPrefetch(cat, qs)
        }
      } catch {
        // 퀴즈 페이지에서 다시 요청
      }
    })()
  }, [modalCategory])

  const handleConfirmNickname = useCallback(
    async (nickname: string) => {
      if (!modalCategory) return
      setIsPreparing(true)
      try {
        if (prefetchReadyRef.current) {
          await prefetchReadyRef.current
        }
        const q = new URLSearchParams({ nickname })
        router.push(`/quiz/${modalCategory}?${q.toString()}`)
        setModalCategory(null)
      } finally {
        setIsPreparing(false)
      }
    },
    [modalCategory, router],
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-violet-50/40 dark:from-zinc-950 dark:to-violet-950/30">
      <header className="border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:py-5 text-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            연예뉴스 퀴즈팡
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            SBS 연예 뉴스 기반 · 카테고리를 골라 도전해 보세요
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {CARDS.map((c) => (
            <CategoryCard
              key={c.category}
              category={c.category}
              label={c.label}
              emoji={c.emoji}
              onClick={() => setModalCategory(c.category)}
            />
          ))}
        </div>
      </main>

      {modalCategory ? (
        <NicknameModal
          category={modalCategory}
          onConfirm={handleConfirmNickname}
          onClose={() => setModalCategory(null)}
          isPreparing={isPreparing}
        />
      ) : null}
    </div>
  )
}
