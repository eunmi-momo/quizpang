import type { Category, QuizQuestion } from '@/types/quiz'

const PREFIX = 'quiz-prefetch:'

export function saveQuizPrefetch(category: Category, questions: QuizQuestion[]): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(PREFIX + category, JSON.stringify(questions))
  } catch {
    // storage full 등
  }
}

/** 퀴즈 화면에서 한 번만 읽고 제거 (소비) */
export function takeQuizPrefetch(category: Category): QuizQuestion[] | null {
  if (typeof window === 'undefined') return null
  const key = PREFIX + category
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    sessionStorage.removeItem(key)
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed as QuizQuestion[]
  } catch {
    sessionStorage.removeItem(key)
    return null
  }
}
