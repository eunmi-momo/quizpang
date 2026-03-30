'use client'

import { useCallback, useState } from 'react'

import { copyTextToClipboard } from '@/lib/copy-to-clipboard'
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
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const ok = await copyTextToClipboard(url)
    if (ok) {
      setCopyMsg('URL이 복사되었어요.')
      setTimeout(() => setCopyMsg(null), 2500)
    } else {
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

    const combined = `${title}\n${text}\n${url}`
    const copied = await copyTextToClipboard(combined)
    if (copied) {
      setCopyMsg('공유 문구와 URL을 복사했어요. 카카오톡에 붙여넣기 하세요.')
      setTimeout(() => setCopyMsg(null), 3000)
    } else {
      setCopyMsg('공유를 완료하지 못했어요. URL 복사를 이용해 주세요.')
      setTimeout(() => setCopyMsg(null), 3000)
    }
  }, [category, nickname, score, total])

  const normalizedMe = nickname.trim()

  return (
    <div className="quizpang-stack mx-auto w-full max-w-lg px-3 py-6 sm:px-4 sm:py-8">
      <div className="rounded-2xl border-4 border-black bg-white p-5 text-center shadow-[4px_4px_0_#000] sm:p-8">
        <p className="text-sm font-bold text-zinc-600">
          {categoryLabel[category]} · {nickname}님
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="font-jua text-5xl tabular-nums text-doodle-purple sm:text-6xl">{score}</span>
          <span className="text-2xl font-bold text-zinc-400 sm:text-3xl">/</span>
          <span className="font-jua text-3xl font-bold tabular-nums text-zinc-800 sm:text-4xl">{total}</span>
          {isPerfect ? (
            <span className="text-4xl sm:text-5xl" aria-hidden>
              🎉
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-bold text-zinc-700">{isPerfect ? '만점! 멋져요!' : '수고했어요!'}</p>
      </div>

      <div className="mt-8">
        <h3 className="mb-3 font-jua text-base font-bold text-zinc-900">
          오늘의 랭킹 TOP 5 · {categoryLabel[category]}
        </h3>
        <ol className="divide-y-2 divide-black overflow-hidden rounded-xl border-4 border-black bg-white shadow-[3px_3px_0_#000]">
          {rankings.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm font-bold text-zinc-500">아직 기록이 없어요.</li>
          ) : (
            rankings.map((r, i) => {
              const isMe = r.nickname.trim() === normalizedMe
              return (
                <li
                  key={`${r.nickname}-${i}`}
                  className={
                    'flex items-center justify-between px-4 py-3 text-sm sm:py-3.5 sm:text-base ' +
                    (isMe ? 'bg-doodle-purple/15 font-bold text-doodle-purple' : 'text-zinc-800')
                  }
                >
                  <span className="flex items-center gap-3">
                    <span className="w-6 tabular-nums font-bold text-zinc-500">{i + 1}</span>
                    <span>{r.nickname}</span>
                  </span>
                  <span className="tabular-nums font-bold">{r.score}점</span>
                </li>
              )
            })
          )}
        </ol>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <button type="button" onClick={onRetry} className="doodle-btn-primary flex-1 text-center">
          다시 풀기
        </button>
        <button type="button" onClick={onOtherCategory} className="doodle-btn-outline flex-1 text-center">
          다른 카테고리
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <button
          type="button"
          onClick={handleKakaoShare}
          className="flex-1 rounded-2xl border-4 border-black bg-[#FEE500] py-3 text-sm font-bold text-[#191919] shadow-[3px_3px_0_#000] transition-transform hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_#000] sm:text-base"
        >
          카카오톡 공유
        </button>
        <button
          type="button"
          onClick={handleCopyUrl}
          className="flex-1 rounded-2xl border-4 border-black bg-zinc-200 py-3 text-sm font-bold text-zinc-900 shadow-[3px_3px_0_#000] transition-transform hover:translate-x-px hover:translate-y-px hover:bg-zinc-300 hover:shadow-[2px_2px_0_#000] sm:text-base"
        >
          URL 복사
        </button>
      </div>

      {copyMsg ? (
        <p className="mt-3 text-center text-xs font-bold text-doodle-green sm:text-sm" role="status">
          {copyMsg}
        </p>
      ) : null}
    </div>
  )
}
