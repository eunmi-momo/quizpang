'use client'

import { useEffect, useRef, useState } from 'react'

import type { QuizQuestion } from '@/types/quiz'

export interface QuizCardProps {
  question: QuizQuestion
  onAnswer: (isCorrect: boolean) => void
}

export function QuizCard({ question, onAnswer }: QuizCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const answeredRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const correctIdx = question.answer

  useEffect(() => {
    setSelected(null)
    answeredRef.current = false
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [question])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handlePick = (idx: number) => {
    if (selected !== null || answeredRef.current) return

    setSelected(idx)
    answeredRef.current = true
    const isCorrect = idx === correctIdx

    timerRef.current = setTimeout(() => {
      onAnswer(isCorrect)
    }, 2000)
  }

  const isCorrect = selected !== null && selected === correctIdx
  const showResult = selected !== null

  const hintUrl = question.articleUrl?.trim()

  const handleHintClick = () => {
    if (!hintUrl || showResult) return
    window.open(hintUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <article className="w-full max-w-xl mx-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-lg">
      <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
        {question.question}
      </h2>

      {hintUrl ? (
        <div className="mt-2">
          <button
            type="button"
            disabled={showResult}
            onClick={handleHintClick}
            className="text-xs text-zinc-500 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400 underline-offset-2 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed disabled:hover:text-zinc-500"
          >
            🔍 힌트 보기
          </button>
        </div>
      ) : null}

      <ul className="mt-5 space-y-2 sm:space-y-3">
        {question.options.map((opt, idx) => {
          const picked = selected === idx
          const isThisCorrect = idx === correctIdx
          let btnClass =
            'w-full text-left rounded-xl border-2 px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium transition-colors duration-200 '

          if (!showResult) {
            btnClass +=
              'border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/80 hover:border-violet-400 hover:bg-violet-50/80 dark:hover:bg-violet-950/40 text-zinc-900 dark:text-zinc-100 '
          } else {
            if (isThisCorrect) {
              btnClass += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 '
            } else if (picked && !isThisCorrect) {
              btnClass += 'border-red-400 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-100 '
            } else {
              btnClass += 'border-zinc-200 dark:border-zinc-600 bg-zinc-100/80 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-500 opacity-70 '
            }
          }

          const disabled = showResult

          return (
            <li key={idx}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handlePick(idx)}
                className={btnClass + (disabled && !picked && !isThisCorrect ? 'cursor-not-allowed' : '')}
              >
                <span className="mr-2 font-bold text-violet-600 dark:text-violet-400">{idx + 1}.</span>
                {opt}
              </button>
            </li>
          )
        })}
      </ul>

      {showResult ? (
        <div className="mt-5 space-y-2">
          {isCorrect ? (
            <p className="text-center text-lg font-bold text-emerald-600 dark:text-emerald-400">
              정답! 🎉
            </p>
          ) : (
            <p className="text-center text-lg font-bold text-red-600 dark:text-red-400">
              아쉽네요 😢
            </p>
          )}
          <p className="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-sm sm:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">해설 </span>
            {question.explanation}
          </p>
        </div>
      ) : null}
    </article>
  )
}
