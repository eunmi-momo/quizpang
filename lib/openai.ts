import OpenAI from 'openai'

import type { Category, QuizQuestion } from '@/types/quiz'
import type { RssItem } from '@/lib/rss'

const CATEGORY_LABEL: Record<Category, string> = {
  broadcast: '방송',
  movie: '영화',
  music: '뮤직',
  star: '스타',
}

/** 기본은 gpt-4o-mini(빠름). 품질 우선이면 .env에 OPENAI_QUIZ_MODEL=gpt-4o */
function quizModel(): string {
  const m = process.env.OPENAI_QUIZ_MODEL?.trim()
  return m || 'gpt-4o-mini'
}

const SINGLE_CATEGORY_RULES = `문제 출제 원칙:
1. 기사를 단순히 옮기는 문제가 아니라, 에피소드·맥락을 이해해야 풀 수 있게 출제
2. "왜 그랬을까?", "어떤 의미일까?" 같은 스토리텔링 관점 우선
3. 보기 4개는 그럴듯하게. 정답은 기사 근거 1개, 해설은 맥락 중심
4. 각 문제는 기사 하나를 근거로 하고 articleUrl에 해당 기사 link

절대 금지: 소속사·장소·날짜 단순 암기, 사망·범죄·질병 관련

반드시 아래 JSON 객체만 반환해. 다른 텍스트 금지.
{"questions":[ ... 정확히 5개의 퀴즈 객체 ...]}

각 퀴즈 객체 형식:
{"question":"문제","options":["보기1","보기2","보기3","보기4"],"answer":0,"explanation":"해설","articleUrl":"https://..."}`

function getOpenAI(): OpenAI {
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

function truncateText(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export function buildArticlesContext(items: RssItem[], maxDescLen = 280): string {
  return items
    .map(
      (item, i) =>
        `[${i + 1}] 제목: ${item.title}\n    요약: ${truncateText(item.description, maxDescLen)}\n    URL: ${item.link}`,
    )
    .join('\n\n')
}

/**
 * RSS 기사로 **해당 카테고리 5문제만** 생성 (전체 20문제 대비 응답·지연 대폭 감소)
 */
export async function generateQuizForCategory(
  category: Category,
  items: RssItem[],
): Promise<QuizQuestion[]> {
  if (items.length === 0) {
    throw new Error('No RSS items to generate quiz from')
  }

  const label = CATEGORY_LABEL[category]
  const userContent = `너는 연예뉴스 퀴즈 출제자야.
아래 SBS 연예뉴스 기사 목록을 읽고, **${label}** 카테고리(방송·드라마·예능·방송 화제 등 ${label}에 맞는 내용)에 해당하는 기사를 바탕으로 4지선다 퀴즈를 **정확히 5개**만 만들어줘. 다른 카테고리용 문제는 넣지 마.

${SINGLE_CATEGORY_RULES}

[기사 목록]

${buildArticlesContext(items)}`

  const openai = getOpenAI()
  let content: string
  try {
    const completion = await openai.chat.completions.create({
      model: quizModel(),
      messages: [
        {
          role: 'system',
          content:
            'You output only valid JSON with a "questions" array. No markdown, no extra keys.',
        },
        { role: 'user', content: userContent },
      ],
      temperature: 0.55,
      response_format: { type: 'json_object' },
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

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Quiz JSON is not an object')
  }
  const questions = (parsed as Record<string, unknown>).questions
  if (!Array.isArray(questions) || questions.length !== 5) {
    throw new Error('Expected "questions" array of length 5')
  }
  for (let i = 0; i < questions.length; i++) {
    if (!isQuizQuestion(questions[i])) {
      throw new Error(`Invalid question at index ${i}`)
    }
  }

  return questions as QuizQuestion[]
}
