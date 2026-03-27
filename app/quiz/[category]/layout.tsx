import { Suspense } from 'react'

function Fallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-zinc-50 to-violet-50/40 dark:from-zinc-950 dark:to-violet-950/30 px-4">
      <div
        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin"
        role="status"
        aria-label="로딩 중"
      />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">불러오는 중…</p>
    </div>
  )
}

export default function QuizCategoryLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Fallback />}>{children}</Suspense>
}
