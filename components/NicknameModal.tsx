'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'

import type { Category } from '@/types/quiz'

export interface NicknameModalProps {
  category: Category
  onConfirm: (nickname: string) => void | Promise<void>
  onClose: () => void
  /** 문제 미리 불러오는 중 (확인 버튼·배경 비활성) */
  isPreparing?: boolean
}

const categoryLabel: Record<Category, string> = {
  broadcast: '방송',
  movie: '영화',
  music: '뮤직',
  star: '스타',
}

export function NicknameModal({ category, onConfirm, onClose, isPreparing = false }: NicknameModalProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  const handleConfirm = async () => {
    if (isPreparing) return
    const trimmed = value.trim()
    if (trimmed.length < 1) {
      setError('닉네임을 입력해 주세요.')
      return
    }
    if (trimmed.length > 10) {
      setError('닉네임은 최대 10자까지예요.')
      return
    }
    setError(null)
    await onConfirm(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={isPreparing ? undefined : handleBackdrop}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xl border border-zinc-200/80 dark:border-zinc-700 p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg sm:text-xl font-bold">
          {categoryLabel[category]} 퀴즈
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          랭킹에 표시될 닉네임을 입력해 주세요. (1~10자)
        </p>
        {isPreparing ? (
          <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">문제를 준비하고 있어요…</p>
        ) : null}

        <label htmlFor="nickname-input" className="sr-only">
          닉네임
        </label>
        <input
          ref={inputRef}
          id="nickname-input"
          type="text"
          maxLength={10}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm()
          }}
          className="mt-4 w-full rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60"
          placeholder="닉네임"
          autoComplete="nickname"
          disabled={isPreparing}
        />

        {error ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPreparing}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isPreparing}
            className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 text-sm font-semibold shadow-md transition-colors disabled:opacity-70 disabled:cursor-wait"
          >
            {isPreparing ? '준비 중…' : '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}
