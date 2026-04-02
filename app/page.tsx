'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'

import { CategoryCard } from '@/components/CategoryCard'
import { NicknameModal } from '@/components/NicknameModal'
import { apiUrl } from '@/lib/base-path'
import {
  bumpParticipationLocalMax,
  mergeParticipationDisplayValue,
  tryClearSessionParticipationAfterFetch,
} from '@/lib/participation-client'
import { saveQuizPrefetch } from '@/lib/quiz-prefetch'
import type { Category } from '@/types/quiz'

const CARDS: { category: Category; label: string; emoji: string }[] = [
  { category: 'broadcast', label: '방송', emoji: '📺' },
  { category: 'movie', label: '영화', emoji: '🎬' },
  { category: 'music', label: '뮤직', emoji: '🎵' },
  { category: 'star', label: '스타', emoji: '⭐' },
]

const TAGLINE_SUBCOPY = '매일 새로운 퀴즈가 팡팡!'
const TAGLINE_CHARS = Array.from(TAGLINE_SUBCOPY)
const TAGLINE_CHAR_STAGGER_MS = 55
const TAGLINE_CHAR_IN_MS = 450

function pangBurstDelayMs(charIndex: number) {
  return charIndex * TAGLINE_CHAR_STAGGER_MS + TAGLINE_CHAR_IN_MS
}

/** '팡' 글자 등장 직후 근처에서 터지는 폭죽(순수 CSS) */
function PangFireworksBurst({ charIndex }: { charIndex: number }) {
  const delay = pangBurstDelayMs(charIndex)
  const n = 10
  const colors = [
    'bg-doodle-yellow',
    'bg-doodle-purple',
    'bg-doodle-pink',
    'bg-doodle-sky',
    'bg-[#2ecc71]',
  ] as const
  return (
    <span
      className="pointer-events-none absolute left-1/2 top-[45%] z-0 h-0 w-0 motion-reduce:hidden"
      aria-hidden
    >
      {Array.from({ length: n }, (_, i) => {
        const angle = (360 / n) * i
        return (
          <span
            key={i}
            className={`tagline-firework-particle ${colors[i % colors.length]}`}
            style={
              {
                '--angle': `${angle}deg`,
                '--delay': `${delay}ms`,
              } as CSSProperties
            }
          />
        )
      })}
    </span>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [modalCategory, setModalCategory] = useState<Category | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [participationTotal, setParticipationTotal] = useState<number | null>(null)
  const prefetchByCategoryRef = useRef<Partial<Record<Category, Promise<void>>>>({})

  const ensurePrefetch = useCallback((cat: Category): Promise<void> => {
    const existing = prefetchByCategoryRef.current[cat]
    if (existing) return existing
    const p = (async () => {
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
    prefetchByCategoryRef.current[cat] = p
    return p
  }, [])

  const loadParticipation = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const pre = mergeParticipationDisplayValue(0, {})
        if (pre > 0) {
          setParticipationTotal(pre)
        }
      }

      const base = apiUrl('/api/stats/participation')
      const sep = base.includes('?') ? '&' : '?'
      const res = await fetch(`${base}${sep}_=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
      const data = (await res.json().catch(() => ({}))) as { total?: number }
      const n = data.total

      if (typeof n === 'number' && Number.isFinite(n)) {
        const best = mergeParticipationDisplayValue(n, {})
        setParticipationTotal(best)
        bumpParticipationLocalMax(best)
        tryClearSessionParticipationAfterFetch(n)
      } else {
        const fallback = mergeParticipationDisplayValue(1000, {})
        setParticipationTotal(fallback)
        bumpParticipationLocalMax(fallback)
      }
    } catch {
      if (typeof window !== 'undefined') {
        const fallback = mergeParticipationDisplayValue(1000, {})
        setParticipationTotal(fallback)
        bumpParticipationLocalMax(fallback)
        return
      }
      setParticipationTotal(1000)
    }
  }, [])

  useEffect(() => {
    void loadParticipation()
  }, [loadParticipation])

  /** 결과/다른 탭·창 포커스 시 갱신 + 주기 폴링(다른 사용자 참여 반영) */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadParticipation()
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void loadParticipation()
    }
    const onFocus = () => void loadParticipation()

    window.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('focus', onFocus)

    const intervalMs = 20_000
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadParticipation()
    }, intervalMs)

    return () => {
      window.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('focus', onFocus)
      window.clearInterval(id)
    }
  }, [loadParticipation])

  /** 모달이 열리면 해당 카테고리 프리페치(호버와 중복 시 동일 Promise 재사용) */
  useEffect(() => {
    if (!modalCategory) return
    void ensurePrefetch(modalCategory)
  }, [modalCategory, ensurePrefetch])

  const handleConfirmNickname = useCallback(
    async (nickname: string) => {
      if (!modalCategory) return
      setIsPreparing(true)
      try {
        await ensurePrefetch(modalCategory)
        const q = new URLSearchParams({ nickname })
        router.push(`/quiz/${modalCategory}?${q.toString()}`)
        setModalCategory(null)
      } finally {
        setIsPreparing(false)
      }
    },
    [modalCategory, router, ensurePrefetch],
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
          <p className="mt-3 overflow-visible text-lg font-bold text-zinc-800 sm:text-xl">
            <span className="sr-only">{TAGLINE_SUBCOPY}</span>
            <span
              className="inline-flex flex-wrap justify-center gap-0 overflow-visible"
              aria-hidden="true"
            >
              {TAGLINE_CHARS.map((ch, i) => {
                const delayMs = i * TAGLINE_CHAR_STAGGER_MS
                const charEl = (
                  <span
                    className="inline-block opacity-0 motion-safe:animate-tagline-char-in motion-reduce:opacity-100"
                    style={{ animationDelay: `${delayMs}ms` }}
                  >
                    {ch === ' ' ? '\u00a0' : ch}
                  </span>
                )

                if (ch === '팡') {
                  return (
                    <span
                      key={`${ch}-${i}`}
                      className="relative inline-block overflow-visible px-0.5"
                    >
                      <PangFireworksBurst charIndex={i} />
                      <span className="relative z-10 inline-block">{charEl}</span>
                    </span>
                  )
                }

                return (
                  <span key={`${ch}-${i}`} className="inline-block">
                    {charEl}
                  </span>
                )
              })}
            </span>
          </p>
        </div>
      </header>

      <main className="quizpang-stack mx-auto max-w-xl px-4 py-8 pb-12 sm:max-w-2xl sm:py-12 sm:pb-16">
        <div className="mb-5 flex flex-col items-center gap-4 text-center">
          <p className="text-base font-bold text-zinc-900 sm:text-lg">
            자신있는 카테고리에서 실력 발휘해 볼 시간이에요.
          </p>

          {participationTotal === null ? (
            <p className="text-sm font-bold text-zinc-400">참여 인원 불러오는 중…</p>
          ) : (
            <div
              className="inline-flex max-w-full items-center gap-3 rounded-2xl border-[3px] border-black bg-white px-4 py-3 pl-3 shadow-[4px_4px_0_#000] sm:gap-4 sm:px-5 sm:py-4"
              aria-live="polite"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black bg-gradient-to-br from-doodle-purple/20 to-doodle-sky/30 text-doodle-purple animate-participation-float sm:h-14 sm:w-14"
                aria-hidden
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                >
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500 sm:text-xs">
                  누적 참여
                </p>
                <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1 gap-y-0">
                  <span className="font-jua text-2xl tabular-nums leading-none text-doodle-purple animate-participation-pulse sm:text-3xl">
                    {participationTotal.toLocaleString('ko-KR')}
                  </span>
                  <span className="text-sm font-bold text-zinc-800">명</span>
                  <span className="text-sm font-bold text-doodle-purple/90">참여중</span>
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="mx-auto grid w-full max-w-xs grid-cols-2 gap-2 sm:max-w-sm sm:gap-3">
          {CARDS.map((c) => (
            <CategoryCard
              key={c.category}
              category={c.category}
              label={c.label}
              emoji={c.emoji}
              onClick={() => setModalCategory(c.category)}
              onPrefetch={() => void ensurePrefetch(c.category)}
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
