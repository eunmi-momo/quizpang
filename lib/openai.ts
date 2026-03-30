import OpenAI from 'openai'

import type { QuizQuestion, QuizSet } from '@/types/quiz'
import type { RssItem } from '@/lib/rss'

const QUIZ_PROMPT = `너는 연예뉴스 퀴즈 출제자야.
아래 SBS 연예뉴스 기사 목록을 읽고, 각 기사를 방송/영화/뮤직/스타 중 하나로 분류한 다음
각 카테고리별로 5개씩, 총 20개의 4지선다 퀴즈를 만들어줘.

문제 출제 원칙:
1. 기사를 단순히 옮기는 문제가 아니라, 기사 속 에피소드와 맥락을 이해해야 풀 수 있는 문제를 만들어
2. "왜 그랬을까?", "어떤 의미일까?", "이 상황에서 무엇이 화제가 됐을까?" 같은 스토리텔링 관점으로 출제해
3. 기사 속 숨겨진 배경, 이유, 의미를 묻는 문제를 우선으로 해
4. 스타 카테고리는 스타의 성격, 행동 패턴, 활동 히스토리를 기사와 연결해서 출제해도 좋아
5. 보기 4개는 모두 그럴듯하게 만들어서 생각하게 만들어. 너무 뻔한 오답은 피해
6. 정답은 기사에 근거한 명확한 1개, 해설은 "왜 그게 정답인지" 배경과 맥락 중심으로 설명
7. 특정 카테고리 기사가 부족하면 관련 기사를 최대한 활용해
8. 각 퀴즈는 기사 하나를 근거로 내고, articleUrl에는 해당 기사의 link를 넣어줘

절대 출제하면 안 되는 문제 유형:
- 소속사, 기획사 이름 단순 맞추기
- 경기장, 장소, 건물 이름 단순 맞추기
- 날짜, 회차 단순 맞추기
- 기사 한 문장을 그대로 옮겨서 빈칸 채우기식 문제
- 사망, 부고 등 죽음 관련 내용
- 범죄, 질병 관련 내용

좋은 문제 예시:
Q. RM이 라이브 방송 직후 타블로에게 "방송 켜지 말걸 그랬어요"라고 문자를 보낸 이유는?
→ 보기: 말실수를 해서 / 팬들 반응이 너무 뜨거워서 / 감정이 너무 솔직하게 드러나서 / 방송 사고가 났서
→ 기사 맥락(거울을 보는 느낌, 논리적 성격)을 이해해야 풀 수 있음

Q. 환승연애4 출연자 김우진이 SNS에 "빨리 결혼하자"고 댓글을 달았을 때 팬들이 열광한 진짜 이유는?
→ 보기: 깜짝 프러포즈처럼 보여서 / 웨딩화보 같은 사진 분위기 때문에 / 방송 중 약속했던 말이라서 / 홍지연이 먼저 결혼 언급을 해서
→ 단순 사실이 아니라 에피소드의 맥락을 이해해야 함

나쁜 문제 예시 (절대 금지):
Q. 윤택이 부친상을 알린 소속사는? → 단순 암기
Q. 피원하모니 테오가 시구하는 경기장 이름은? → 단순 암기
Q. 환승연애4 최종화는 몇 월에 공개됐나? → 단순 암기

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
