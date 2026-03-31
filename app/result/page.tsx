'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { apiUrl } from '@/lib/base-path'
import { ResultBoard } from '@/components/ResultBoard'
import type { Category } from '@/types/quiz'

const CATEGORIES: Category[] = ['broadcast', 'movie', 'music', 'star']

const DEFAULT_PARTICIPATION = 1000

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
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-24">
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-300 border-t-doodle-purple sm:h-14 sm:w-14"
        role="status"
        aria-label="로딩 중"
      />
      <p className="text-sm font-bold text-zinc-700">결과를 저장하고 랭킹을 불러오는 중이에요…</p>
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
  const [participationCount, setParticipationCount] = useState<number>(DEFAULT_PARTICIPATION)

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
            const postRes = await fetch(apiUrl('/api/score'), {
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

        const getRes = await fetch(apiUrl(`/api/score?category=${encodeURIComponent(category)}`), {
          cache: 'no-store',
        })
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

        let nextParticipation = DEFAULT_PARTICIPATION
        try {
          const partRes = await fetch(apiUrl('/api/participation'), { cache: 'no-store' })
          const partData = await partRes.json().catch(() => ({}))
          if (partRes.ok) {
            const rawCount = (partData as { count?: unknown }).count
            if (typeof rawCount === 'number' && Number.isFinite(rawCount)) {
              nextParticipation = Math.round(rawCount)
            }
          }
        } catch {
          // 참여 수만 실패해도 점수·랭킹은 표시
        }
        if (!cancelled) {
          setParticipationCount(nextParticipation)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '오류가 발생했어요.')
          setRankings([])
          setParticipationCount(DEFAULT_PARTICIPATION)
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
      <div className="quizpang-page flex flex-col items-center justify-center px-4">
        <p className="quizpang-stack text-center font-bold text-zinc-800">결과 정보가 올바르지 않아요.</p>
        <Link href="/" className="quizpang-stack mt-6 doodle-btn-outline">
          메인으로
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="quizpang-page px-4">
        <div className="quizpang-stack mx-auto max-w-lg">
          <Spinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="quizpang-page flex flex-col items-center justify-center px-4">
        <p className="quizpang-stack max-w-md text-center font-bold text-red-600">{error}</p>
        <Link href="/" className="quizpang-stack mt-6 doodle-btn-outline">
          메인으로
        </Link>
      </div>
    )
  }

  return (
    <div className="quizpang-page pb-12">
      <header className="quizpang-glass-header">
        <div className="mx-auto max-w-lg px-4 py-3 text-center">
          <span className="font-jua text-base font-bold text-zinc-900">퀴즈 결과</span>
        </div>
      </header>
      <ResultBoard
        score={scoreNum}
        total={totalQuestions}
        category={category}
        nickname={nickname}
        rankings={rankings}
        participationCount={participationCount}
        onRetry={onRetry}
        onOtherCategory={onOtherCategory}
      />
    </div>
  )
}
