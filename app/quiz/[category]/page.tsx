'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

import { ProgressBar } from '@/components/ProgressBar'
import { QuizCard } from '@/components/QuizCard'
import { takeQuizPrefetch } from '@/lib/quiz-prefetch'
import type { Category, QuizQuestion } from '@/types/quiz'

const CATEGORIES: Category[] = ['broadcast', 'movie', 'music', 'star']

function isCategory(s: string | null): s is Category {
  return s != null && (CATEGORIES as readonly string[]).includes(s)
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div
        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin"
        role="status"
        aria-label="로딩 중"
      />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">문제를 불러오는 중이에요…</p>
    </div>
  )
}

export default function QuizPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawCategory = typeof params?.category === 'string' ? params.category : null
  const category = isCategory(rawCategory) ? rawCategory : null
  const nickname = searchParams.get('nickname')?.trim() ?? ''

  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const skipNetworkFetchRef = useRef(false)

  const validNickname = nickname.length >= 1

  /** 메인에서 미리 받아 둔 문제 — 페인트 전에 적용해 로딩 스피너를 피함 */
  useLayoutEffect(() => {
    skipNetworkFetchRef.current = false
    if (!category || !validNickname) {
      setLoading(false)
      return
    }
    const prefetched = takeQuizPrefetch(category)
    if (prefetched && prefetched.length > 0) {
      setQuestions(prefetched)
      setCurrentIndex(0)
      setScore(0)
      setLoadError(null)
      setLoading(false)
      skipNetworkFetchRef.current = true
    }
  }, [category, validNickname])

  useEffect(() => {
    if (!category || !validNickname) {
      setLoading(false)
      return
    }
    if (skipNetworkFetchRef.current) {
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)

    const url = `/api/quiz/generate?category=${encodeURIComponent(category)}`

    fetch(url)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : '문제를 불러오지 못했어요.')
        }
        const qs = data.questions
        if (!Array.isArray(qs) || qs.length === 0) {
          throw new Error('문제 데이터가 비어 있어요.')
        }
        return qs as QuizQuestion[]
      })
      .then((qs) => {
        if (!cancelled) {
          setQuestions(qs)
          setCurrentIndex(0)
          setScore(0)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : '알 수 없는 오류예요.')
          setQuestions(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [category, validNickname])

  const currentQuestion = useMemo(() => {
    if (!questions || currentIndex < 0 || currentIndex >= questions.length) return null
    return questions[currentIndex]
  }, [questions, currentIndex])

  const handleAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!category || !validNickname) return

      const nextScore = score + (isCorrect ? 1 : 0)
      setScore(nextScore)

      const nextIndex = currentIndex + 1
      if (nextIndex < (questions?.length ?? 0)) {
        setCurrentIndex(nextIndex)
        return
      }

      const q = new URLSearchParams({
        category,
        nickname,
        score: String(nextScore),
      })
      router.push(`/result?${q.toString()}`)
    },
    [category, validNickname, score, currentIndex, questions?.length, nickname, router],
  )

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-700 dark:text-zinc-300 text-center">잘못된 카테고리예요.</p>
        <Link
          href="/"
          className="mt-6 rounded-xl bg-violet-600 text-white font-semibold px-6 py-3 text-sm sm:text-base"
        >
          메인으로
        </Link>
      </div>
    )
  }

  if (!validNickname) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-700 dark:text-zinc-300 text-center">닉네임이 필요해요. 메인에서 다시 시작해 주세요.</p>
        <Link
          href="/"
          className="mt-6 rounded-xl bg-violet-600 text-white font-semibold px-6 py-3 text-sm sm:text-base"
        >
          메인으로
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-violet-50/40 dark:from-zinc-950 dark:to-violet-950/30 px-4">
        <div className="mx-auto max-w-xl pt-12">
          <Spinner />
        </div>
      </div>
    )
  }

  if (loadError || !questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
        <p className="text-red-600 dark:text-red-400 text-center max-w-md">{loadError ?? '문제를 불러올 수 없어요.'}</p>
        <Link
          href="/"
          className="mt-6 rounded-xl bg-violet-600 text-white font-semibold px-6 py-3 text-sm sm:text-base"
        >
          메인으로 돌아가기
        </Link>
      </div>
    )
  }

  const total = questions.length

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-violet-50/40 dark:from-zinc-950 dark:to-violet-950/30 pb-12">
      <header className="border-b border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md">
        <div className="mx-auto max-w-xl px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <Link href="/" className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline">
            ← 홈
          </Link>
          <span className="text-xs sm:text-sm text-zinc-500 truncate">{nickname}님</span>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 pt-6 sm:pt-8">
        <ProgressBar current={currentIndex + 1} total={total} />
        <div className="mt-8">
          {currentQuestion ? (
            <QuizCard key={`${currentIndex}-${currentQuestion.question.slice(0, 20)}`} question={currentQuestion} onAnswer={handleAnswer} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
