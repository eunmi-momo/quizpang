'use client'

import { useCallback, useState } from 'react'

import type { Category } from '@/types/quiz'

const categoryLabel: Record<Category, string> = {
  broadcast: '방송',
  movie: '영화',
  music: '뮤직',
  star: '스타',
}

export interface ResultBoardProps {
  score: number
  total: number
  category: Category
  nickname: string
  rankings: { nickname: string; score: number }[]
  onRetry: () => void
  onOtherCategory: () => void
}

export function ResultBoard({
  score,
  total,
  category,
  nickname,
  rankings,
  onRetry,
  onOtherCategory,
}: ResultBoardProps) {
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const isPerfect = total > 0 && score === total

  const handleCopyUrl = useCallback(async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : ''
      await navigator.clipboard.writeText(url)
      setCopyMsg('URL이 복사되었어요.')
      setTimeout(() => setCopyMsg(null), 2500)
    } catch {
      setCopyMsg('복사에 실패했어요. 주소창에서 직접 복사해 주세요.')
      setTimeout(() => setCopyMsg(null), 3000)
    }
  }, [])

  const handleKakaoShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const title = `SBS 연예 퀴즈 — ${categoryLabel[category]}`
    const text = `${nickname}님 점수 ${score}/${total}! 같이 풀어보세요.`

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
        return
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }

    try {
      await navigator.clipboard.writeText(`${title}\n${text}\n${url}`)
      setCopyMsg('공유 문구와 URL을 복사했어요. 카카오톡에 붙여넣기 하세요.')
      setTimeout(() => setCopyMsg(null), 3000)
    } catch {
      setCopyMsg('공유를 완료하지 못했어요. URL 복사를 이용해 주세요.')
      setTimeout(() => setCopyMsg(null), 3000)
    }
  }, [category, nickname, score, total])

  const normalizedMe = nickname.trim()

  return (
    <div className="w-full max-w-lg mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5 sm:p-8 shadow-xl text-center">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {categoryLabel[category]} · {nickname}님
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-5xl sm:text-6xl font-black tabular-nums text-violet-600 dark:text-violet-400">
            {score}
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-zinc-400">/</span>
          <span className="text-3xl sm:text-4xl font-bold tabular-nums text-zinc-700 dark:text-zinc-200">
            {total}
          </span>
          {isPerfect ? <span className="text-4xl sm:text-5xl" aria-hidden>🎉</span> : null}
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {isPerfect ? '만점! 멋져요!' : '수고했어요!'}
        </p>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-200 mb-3">
          오늘의 랭킹 TOP 5 · {categoryLabel[category]}
        </h3>
        <ol className="rounded-xl border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-200 dark:divide-zinc-700 bg-zinc-50/80 dark:bg-zinc-900/50 overflow-hidden">
          {rankings.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">아직 기록이 없어요.</li>
          ) : (
            rankings.map((r, i) => {
              const isMe = r.nickname.trim() === normalizedMe
              return (
                <li
                  key={`${r.nickname}-${i}`}
                  className={
                    'flex items-center justify-between px-4 py-3 sm:py-3.5 text-sm sm:text-base ' +
                    (isMe
                      ? 'bg-violet-100/90 dark:bg-violet-950/50 font-bold text-violet-900 dark:text-violet-100'
                      : 'text-zinc-800 dark:text-zinc-200')
                  }
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 text-zinc-500 font-semibold tabular-nums">{i + 1}</span>
                    <span>{r.nickname}</span>
                  </span>
                  <span className="tabular-nums font-semibold">{r.score}점</span>
                </li>
              )
            })
          )}
        </ol>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-4 text-sm sm:text-base shadow-md transition-colors"
        >
          다시 풀기
        </button>
        <button
          type="button"
          onClick={onOtherCategory}
          className="flex-1 rounded-xl border-2 border-violet-500 text-violet-700 dark:text-violet-300 font-semibold py-3 px-4 text-sm sm:text-base hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
        >
          다른 카테고리
        </button>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleKakaoShare}
          className="flex-1 rounded-xl bg-[#FEE500] hover:bg-[#fdd835] text-[#191919] font-semibold py-3 px-4 text-sm sm:text-base border border-yellow-600/20 transition-colors"
        >
          카카오톡 공유
        </button>
        <button
          type="button"
          onClick={handleCopyUrl}
          className="flex-1 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 font-semibold py-3 px-4 text-sm sm:text-base transition-colors"
        >
          URL 복사
        </button>
      </div>

      {copyMsg ? (
        <p className="mt-3 text-center text-xs sm:text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {copyMsg}
        </p>
      ) : null}
    </div>
  )
}
