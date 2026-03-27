export type Category = 'broadcast' | 'movie' | 'music' | 'star'

export interface QuizQuestion {
  question: string
  options: string[] // 4개
  answer: number // 정답 인덱스 0~3
  explanation: string
  articleUrl?: string
}

export interface QuizSet {
  broadcast: QuizQuestion[]
  movie: QuizQuestion[]
  music: QuizQuestion[]
  star: QuizQuestion[]
}

export interface ScoreRecord {
  nickname: string
  category: Category
  score: number
  created_at: string
}
