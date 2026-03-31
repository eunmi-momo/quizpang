'use client'

import Link from 'next/link'

/** 퀴즈·결과 등 상단: 좌측 로고, 우측 닉네임 + 홈 */
export function SiteHeaderBar({ nickname }: { nickname: string }) {
  return (
    <header className="quizpang-glass-header">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:py-4">
        <h1 className="min-w-0 flex-1 text-left leading-tight">
          <span className="block text-sm font-bold text-zinc-900 sm:text-base">SBS연예뉴스</span>
          <span className="mt-0.5 flex flex-wrap items-center justify-start gap-0.5 sm:mt-1 sm:gap-1">
            <span className="doodle-title-sticker font-jua text-3xl leading-none text-[#2ecc71] sm:text-4xl">
              퀴즈
            </span>
            <span className="doodle-title-sticker font-jua text-3xl leading-none text-doodle-purple sm:text-4xl">
              팡
            </span>
          </span>
        </h1>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="max-w-[9.5rem] truncate text-right text-base font-bold text-zinc-700 sm:max-w-[12rem] sm:text-lg">
            {nickname}님
          </span>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-white p-2 text-zinc-900 shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-px hover:text-doodle-purple hover:shadow-[3px_3px_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-doodle-purple focus-visible:ring-offset-2 active:translate-y-px"
            aria-label="홈으로"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-6 w-6 sm:h-7 sm:w-7"
              aria-hidden
            >
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
