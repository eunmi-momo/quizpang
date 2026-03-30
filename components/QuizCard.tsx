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
    <article className="mx-auto w-full max-w-xl rounded-2xl border-4 border-black bg-white p-4 shadow-[4px_4px_0_#000] sm:p-6">
      <h2 className="text-base font-bold leading-snug text-zinc-900 sm:text-lg">
        {question.question}
      </h2>

      {hintUrl ? (
        <div className="mt-2">
          <button
            type="button"
            disabled={showResult}
            onClick={handleHintClick}
            className="text-xs font-bold text-doodle-purple underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline disabled:hover:text-doodle-purple"
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
            'w-full text-left rounded-xl border-2 border-black px-4 py-3 sm:py-3.5 text-sm sm:text-base font-medium transition-colors duration-200 '

          if (!showResult) {
            btnClass +=
              'bg-doodle-cream/80 hover:bg-doodle-purple/10 hover:shadow-[2px_2px_0_#000] text-zinc-900 '
          } else {
            if (isThisCorrect) {
              btnClass += 'border-doodle-green bg-doodle-green/20 text-emerald-900 '
            } else if (picked && !isThisCorrect) {
              btnClass += 'border-red-500 bg-red-50 text-red-900 '
            } else {
              btnClass += 'border-zinc-300 bg-zinc-100/90 text-zinc-500 opacity-75 '
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
                <span className="mr-2 font-bold text-doodle-purple">{idx + 1}.</span>
                {opt}
              </button>
            </li>
          )
        })}
      </ul>

      {showResult ? (
        <div className="mt-5 space-y-2">
          {isCorrect ? (
            <p className="text-center font-jua text-lg font-bold text-doodle-green">정답! 🎉</p>
          ) : (
            <p className="text-center font-jua text-lg font-bold text-red-600">아쉽네요 😢</p>
          )}
          <p className="rounded-xl border-2 border-black bg-doodle-cream/60 px-4 py-3 text-sm leading-relaxed text-zinc-800 sm:text-base">
            <span className="font-bold text-zinc-900">해설 </span>
            {question.explanation}
          </p>
        </div>
      ) : null}
    </article>
  )
}
