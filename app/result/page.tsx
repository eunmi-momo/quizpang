'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { ResultBoard } from '@/components/ResultBoard'
import type { Category } from '@/types/quiz'

const CATEGORIES: Category[] = ['broadcast', 'movie', 'music', 'star']

function isCategory(s: string | null): s is Category {
  return s != null && (CATEGORIES as readonly string[]).includes(s)
}

/** Strict Mode에서 첫 번째 POST가 끝날 때까지 대기 (두 번째 effect가 빨리 GET 하는 것 방지) */
async function waitUntilScorePostSettled(key: string) {
  for (let i = 0; i < 200; i++) {
    const v = sessionStorage.getItem(key)
    if (v === '1') return
    if (v !== 'pending') return
    await new Promise((r) => setTimeout(r, 50))
  }
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 min-h-[40vh]">
      <div
        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin"
        role="status"
        aria-label="로딩 중"
      />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">결과를 저장하고 랭킹을 불러오는 중이에요…</p>
    </div>
  )
}

export default function ResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const categoryParam = searchParams.get('category')
  const nickname = searchParams.get('nickname')?.trim() ?? ''
  const scoreParam = searchParams.get('score')

  const category = isCategory(categoryParam) ? categoryParam : null
  const scoreNum = useMemo(() => {
    if (scoreParam == null || scoreParam === '') return NaN
    const n = Number.parseInt(scoreParam, 10)
    return Number.isFinite(n) ? n : NaN
  }, [scoreParam])

  const totalQuestions = 5

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rankings, setRankings] = useState<{ nickname: string; score: number }[]>([])

  const paramsValid = category != null && nickname.length >= 1 && !Number.isNaN(scoreNum)

  /** 동일 결과 URL에 대한 점수 POST는 한 번만 (React Strict Mode 이중 effect 방지) */
  const scorePostDedupeKey =
    paramsValid && category != null
      ? `quiz-score-post:${category}:${nickname}:${scoreNum}`
      : null

  useEffect(() => {
    if (!paramsValid || category == null) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const run = async () => {
      try {
        let shouldPost = true
        if (typeof window !== 'undefined' && scorePostDedupeKey) {
          const v = sessionStorage.getItem(scorePostDedupeKey)
          if (v === '1' || v === 'pending') {
            shouldPost = false
          } else {
            sessionStorage.setItem(scorePostDedupeKey, 'pending')
          }
        }

        if (shouldPost) {
          try {
            const postRes = await fetch('/api/score', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nickname,
                category,
                score: scoreNum,
              }),
            })
            const postData = await postRes.json().catch(() => ({}))
            if (!postRes.ok) {
              throw new Error(typeof postData.error === 'string' ? postData.error : '점수 저장에 실패했어요.')
            }
            if (typeof window !== 'undefined' && scorePostDedupeKey) {
              sessionStorage.setItem(scorePostDedupeKey, '1')
            }
          } catch (postErr) {
            if (typeof window !== 'undefined' && scorePostDedupeKey) {
              sessionStorage.removeItem(scorePostDedupeKey)
            }
            throw postErr
          }
        } else if (typeof window !== 'undefined' && scorePostDedupeKey) {
          await waitUntilScorePostSettled(scorePostDedupeKey)
        }

        const getRes = await fetch(`/api/score?category=${encodeURIComponent(category)}`)
        const getData = await getRes.json().catch(() => ({}))
        if (!getRes.ok) {
          throw new Error(typeof getData.error === 'string' ? getData.error : '랭킹을 불러오지 못했어요.')
        }
        const list = getData.rankings
        if (!Array.isArray(list)) {
          throw new Error('랭킹 형식이 올바르지 않아요.')
        }

        if (!cancelled) {
          setRankings(
            list.map((r: { nickname?: string; score?: number }) => ({
              nickname: String(r.nickname ?? ''),
              score: Number(r.score ?? 0),
            })),
          )
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '오류가 발생했어요.')
          setRankings([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [paramsValid, category, nickname, scoreNum, scorePostDedupeKey])

  const onRetry = useCallback(() => {
    if (!category) return
    const q = new URLSearchParams({ nickname })
    router.push(`/quiz/${category}?${q.toString()}`)
  }, [category, nickname, router])

  const onOtherCategory = useCallback(() => {
    router.push('/')
  }, [router])

  if (!category || nickname.length < 1 || Number.isNaN(scoreNum)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-700 dark:text-zinc-300 text-center">결과 정보가 올바르지 않아요.</p>
        <Link href="/" className="mt-6 rounded-xl bg-violet-600 text-white font-semibold px-6 py-3 text-sm sm:text-base">
          메인으로
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-violet-50/40 dark:from-zinc-950 dark:to-violet-950/30 px-4">
        <div className="mx-auto max-w-lg">
          <Spinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-red-600 dark:text-red-400 text-center max-w-md">{error}</p>
        <Link href="/" className="mt-6 rounded-xl bg-violet-600 text-white font-semibold px-6 py-3 text-sm sm:text-base">
          메인으로
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-violet-50/40 dark:from-zinc-950 dark:to-violet-950/30 pb-12">
      <header className="border-b border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 py-3 text-center">
          <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">퀴즈 결과</span>
        </div>
      </header>
      <ResultBoard
        score={scoreNum}
        total={totalQuestions}
        category={category}
        nickname={nickname}
        rankings={rankings}
        onRetry={onRetry}
        onOtherCategory={onOtherCategory}
      />
    </div>
  )
}
