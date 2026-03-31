'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

import { ProgressBar } from '@/components/ProgressBar'
import { QuizCard } from '@/components/QuizCard'
import { SiteHeaderBar } from '@/components/SiteHeaderBar'
import { apiUrl } from '@/lib/base-path'
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
        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-4 border-zinc-300 border-t-doodle-purple animate-spin"
        role="status"
        aria-label="로딩 중"
      />
      <p className="text-sm font-bold text-zinc-700">문제를 불러오는 중이에요…</p>
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

    const url = apiUrl(`/api/quiz/generate?category=${encodeURIComponent(category)}`)

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
      <div className="quizpang-page flex flex-col items-center justify-center px-4">
        <p className="quizpang-stack text-center font-bold text-zinc-800">잘못된 카테고리예요.</p>
        <Link href="/" className="quizpang-stack mt-6 doodle-btn-outline">
          메인으로
        </Link>
      </div>
    )
  }

  if (!validNickname) {
    return (
      <div className="quizpang-page flex flex-col items-center justify-center px-4">
        <p className="quizpang-stack text-center font-bold text-zinc-800">닉네임이 필요해요. 메인에서 다시 시작해 주세요.</p>
        <Link href="/" className="quizpang-stack mt-6 doodle-btn-outline">
          메인으로
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="quizpang-page px-4">
        <div className="quizpang-stack mx-auto max-w-xl pt-12">
          <Spinner />
        </div>
      </div>
    )
  }

  if (loadError || !questions || questions.length === 0) {
    return (
      <div className="quizpang-page flex flex-col items-center justify-center px-4">
        <p className="quizpang-stack max-w-md text-center font-bold text-red-600">
          {loadError ?? '문제를 불러올 수 없어요.'}
        </p>
        <Link href="/" className="quizpang-stack mt-6 doodle-btn-outline">
          메인으로 돌아가기
        </Link>
      </div>
    )
  }

  const total = questions.length

  return (
    <div className="quizpang-page pb-12">
      <SiteHeaderBar nickname={nickname} />

      <div className="quizpang-stack mx-auto max-w-xl px-4 pt-6 sm:pt-8">
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
