import OpenAI from 'openai'

import type { QuizQuestion, QuizSet } from '@/types/quiz'
import type { RssItem } from '@/lib/rss'

const QUIZ_PROMPT = `너는 연예뉴스 퀴즈 출제자야.
아래 SBS 연예뉴스 기사 목록을 읽고, 각 기사를 방송/영화/뮤직/스타 중 하나로 분류한 다음
각 카테고리별로 5개씩, 총 20개의 4지선다 퀴즈를 만들어줘.

문제 출제 원칙:
1. 힌트를 보지 않아도 질문과 보기만으로 답을 유추할 수 있는 문제를 만들어
2. 기사 내용을 직접 알아야만 풀 수 있는 단순 암기 문제는 피해
3. 연예계 상식 + 기사 내용을 결합해서 논리적으로 추론 가능한 문제 위주로 출제
4. 보기 4개는 그럴듯하게 만들되, 정답은 기사에 근거한 명확한 1개
5. 해설은 왜 그게 정답인지 기사 내용 기반으로 간단히 설명
6. 특정 카테고리 기사가 부족하면 관련 기사를 최대한 활용하고, 그래도 부족하면 해당 카테고리 기사에서 다양한 각도로 문제를 출제해

예시 (좋은 문제):
Q. 최근 빌보드 200 차트에서 자체 최고 순위를 기록한 그룹은?
→ 보기만 봐도 K-POP 그룹들 중 하나임을 알 수 있고, 기사를 읽으면 정답을 확인할 수 있음

예시 (나쁜 문제 - 피할 것):
Q. 피원하모니 테오가 시구하는 경기장 이름은?
→ 기사를 외우지 않으면 절대 맞출 수 없는 단순 암기 문제

각 퀴즈는 기사 하나를 근거로 내고, articleUrl에는 해당 기사의 link(URL)를 목록에 적힌 그대로 넣어줘.

반드시 아래 JSON 형식만 반환해. 다른 설명은 절대 붙이지 마.

{
  "broadcast": [퀴즈 5개],
  "movie": [퀴즈 5개],
  "music": [퀴즈 5개],
  "star": [퀴즈 5개]
}

각 퀴즈 형식:
{
  "question": "문제",
  "options": ["보기1", "보기2", "보기3", "보기4"],
  "answer": 0,
  "explanation": "해설",
  "articleUrl": "https://ent.sbs.co.kr/news/article.do?article_id=..."
}`

const CATEGORIES = ['broadcast', 'movie', 'music', 'star'] as const

function getOpenAI(): OpenAI {
  // Next 번들러가 정적으로 치환하는 경우를 줄이기 위해 동적 키로 읽음
  const raw = process.env['OPENAI_API_KEY']
  const key = typeof raw === 'string' ? raw.trim() : ''
  if (!key) {
    throw new Error(
      'OPENAI_API_KEY가 비어 있거나 없습니다. 프로젝트 루트 .env.local에 OPENAI_API_KEY=sk-... 형식으로 값을 넣고 파일을 저장(Ctrl+S)한 뒤, 개발 서버(npm run dev)를 재시작하세요.',
    )
  }
  return new OpenAI({ apiKey: key })
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const fence = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n```$/im
  const m = trimmed.match(fence)
  if (m?.[1]) return m[1].trim()

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1)

  return trimmed
}

function isQuizQuestion(q: unknown): q is QuizQuestion {
  if (!q || typeof q !== 'object') return false
  const o = q as Record<string, unknown>
  if (typeof o.question !== 'string') return false
  if (!Array.isArray(o.options) || o.options.length !== 4) return false
  if (!o.options.every((x) => typeof x === 'string')) return false
  if (typeof o.answer !== 'number' || !Number.isInteger(o.answer)) return false
  if (o.answer < 0 || o.answer > 3) return false
  if (typeof o.explanation !== 'string') return false
  if (typeof o.articleUrl !== 'string' || !o.articleUrl.trim()) return false
  const url = o.articleUrl.trim()
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false
  return true
}

function assertValidQuizSet(data: unknown): asserts data is QuizSet {
  if (!data || typeof data !== 'object') {
    throw new Error('Quiz JSON is not an object')
  }
  const obj = data as Record<string, unknown>
  for (const cat of CATEGORIES) {
    const arr = obj[cat]
    if (!Array.isArray(arr) || arr.length !== 5) {
      throw new Error(`Invalid quiz set: "${cat}" must be an array of length 5`)
    }
    for (let i = 0; i < arr.length; i++) {
      if (!isQuizQuestion(arr[i])) {
        throw new Error(`Invalid question in "${cat}" at index ${i}`)
      }
    }
  }
}

function buildArticlesContext(items: RssItem[]): string {
  return items
    .map(
      (item, i) =>
        `[${i + 1}] 제목: ${item.title}\n    요약: ${item.description}\n    URL: ${item.link}`,
    )
    .join('\n\n')
}

/**
 * RSS 기사 목록으로 GPT-4o가 QuizSet(JSON)을 생성
 */
export async function generateQuizSet(items: RssItem[]): Promise<QuizSet> {
  if (items.length === 0) {
    throw new Error('No RSS items to generate quiz from')
  }

  const openai = getOpenAI()
  const userContent = `${QUIZ_PROMPT}\n\n[기사 목록]\n\n${buildArticlesContext(items)}`

  let content: string
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You output only valid JSON matching the user schema. No markdown unless wrapping JSON in a code block.',
        },
        { role: 'user', content: userContent },
      ],
      temperature: 0.6,
    })
    content = completion.choices[0]?.message?.content ?? ''
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`OpenAI request failed: ${msg}`)
  }

  if (!content.trim()) {
    throw new Error('Empty response from OpenAI')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(content))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Failed to parse quiz JSON: ${msg}`)
  }

  try {
    assertValidQuizSet(parsed)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Quiz validation failed: ${msg}`)
  }

  return parsed
}
