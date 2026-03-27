import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase'
import { fetchRssItems } from '@/lib/rss'
import { generateQuizSet } from '@/lib/openai'
import type { Category, QuizQuestion, QuizSet } from '@/types/quiz'

const CATEGORIES: Category[] = ['broadcast', 'movie', 'music', 'star']

function isCategory(s: string | null): s is Category {
  return s != null && (CATEGORIES as readonly string[]).includes(s)
}

/** 한국(Asia/Seoul) 기준 오늘 00:00 KST (= UTC 전날 15:00 등, 날짜는 +09:00로 고정) */
function getKstTodayStartDate(): Date {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  if (!y || !m || !d) {
    throw new Error('Could not resolve KST calendar date')
  }
  return new Date(`${y}-${m}-${d}T00:00:00+09:00`)
}

function getKstTodayStartIso(): string {
  return getKstTodayStartDate().toISOString()
}

/** 한국 기준 '내일' 00:00 KST — 캐시 만료 시각 */
function getNextKstMidnightIso(): string {
  const t = getKstTodayStartDate()
  return new Date(t.getTime() + 24 * 60 * 60 * 1000).toISOString()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('category')
  if (!isCategory(raw)) {
    return NextResponse.json(
      { error: 'Invalid or missing category. Use broadcast | movie | music | star' },
      { status: 400 },
    )
  }
  const category = raw

  try {
    const supabase = createSupabaseServerClient()
    const nowIso = new Date().toISOString()
    const kstTodayStartIso = getKstTodayStartIso()

    const { data: cacheRow, error: cacheErr } = await supabase
      .from('quiz_cache')
      .select('quiz_data')
      .gt('expires_at', nowIso)
      .gte('created_at', kstTodayStartIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cacheErr) {
      throw new Error(`quiz_cache read failed: ${cacheErr.message}`)
    }

    let quizSet: QuizSet | null = null
    if (cacheRow?.quiz_data) {
      quizSet = cacheRow.quiz_data as QuizSet
    }

    if (quizSet && Array.isArray(quizSet[category]) && quizSet[category].length === 5) {
      return NextResponse.json({ questions: quizSet[category] as QuizQuestion[] })
    }

    const items = await fetchRssItems()
    const parsedQuiz = await generateQuizSet(items)
    console.log(JSON.stringify(parsedQuiz, null, 2))

    const expiresAt = getNextKstMidnightIso()
    const { error: insertErr } = await supabase.from('quiz_cache').insert({
      quiz_data: parsedQuiz,
      expires_at: expiresAt,
    })

    if (insertErr) {
      throw new Error(`quiz_cache insert failed: ${insertErr.message}`)
    }

    const questions = parsedQuiz[category]
    if (!Array.isArray(questions) || questions.length !== 5) {
      throw new Error(`Generated quiz missing category "${category}"`)
    }

    return NextResponse.json({ questions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[GET /api/quiz/generate]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
