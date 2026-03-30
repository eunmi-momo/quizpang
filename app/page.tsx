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
  const [participationTotal, setParticipationTotal] = useState<number | null>(null)
  const prefetchReadyRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(apiUrl('/api/stats/participation'))
        const data = (await res.json().catch(() => ({}))) as { total?: number }
        const n = data.total
        if (!cancelled && typeof n === 'number' && Number.isFinite(n)) {
          setParticipationTotal(n)
        } else if (!cancelled) {
          setParticipationTotal(1000)
        }
      } catch {
        if (!cancelled) setParticipationTotal(1000)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
    <div className="quizpang-page">
      <header className="quizpang-glass-header sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:py-6 text-center">
          <h1>
            <span className="block text-xl font-bold text-zinc-900 sm:text-2xl">SBS연예뉴스</span>
            <span className="mt-2 flex flex-wrap items-center justify-center gap-1 sm:mt-3 sm:gap-2">
              <span className="doodle-title-sticker font-jua text-7xl leading-none text-[#2ecc71] sm:text-8xl">
                퀴즈
              </span>
              <span className="doodle-title-sticker font-jua text-7xl leading-none text-doodle-purple sm:text-8xl">
                팡
              </span>
            </span>
          </h1>
          <p className="mt-3 text-sm font-bold text-zinc-800 sm:text-base">매일 새로운 퀴즈가 찾아옵니다!</p>
        </div>
      </header>

      <main className="quizpang-stack mx-auto max-w-xl px-4 py-8 pb-12 sm:max-w-2xl sm:py-12 sm:pb-16">
        <div className="mb-5 text-center">
          <p className="text-base font-bold text-zinc-900 sm:text-lg">
            지금 자신 있는 카테고리에 도전하세요!
          </p>
          <p className="mt-2 text-sm text-zinc-700 sm:text-base">
            {participationTotal === null ? (
              <span className="text-zinc-400">참여 인원 불러오는 중…</span>
            ) : (
              <>
                지금까지{' '}
                <span className="font-bold tabular-nums text-doodle-purple">
                  {participationTotal.toLocaleString('ko-KR')}
                </span>
                명 참여중
              </>
            )}
          </p>
        </div>
        <div className="mx-auto grid w-full max-w-xs grid-cols-2 gap-2 sm:max-w-sm sm:gap-3">
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
