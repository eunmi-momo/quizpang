import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase'
import { fetchRssItems } from '@/lib/rss'
import { generateQuizForCategory } from '@/lib/openai'
import type { Category, QuizQuestion } from '@/types/quiz'

const CATEGORIES: Category[] = ['broadcast', 'movie', 'music', 'star']

function isCategory(s: string | null): s is Category {
  return s != null && (CATEGORIES as readonly string[]).includes(s)
}

/** 한국(Asia/Seoul) 기준 오늘 00:00 KST */
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

function getNextKstMidnightIso(): string {
  const t = getKstTodayStartDate()
  return new Date(t.getTime() + 24 * 60 * 60 * 1000).toISOString()
}

type CachedQuizData = Partial<Record<Category, QuizQuestion[]>>

function isFiveQuestions(v: unknown): v is QuizQuestion[] {
  return Array.isArray(v) && v.length === 5
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
      .select('id, quiz_data')
      .gt('expires_at', nowIso)
      .gte('created_at', kstTodayStartIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cacheErr) {
      throw new Error(`quiz_cache read failed: ${cacheErr.message}`)
    }

    const quizData = (cacheRow?.quiz_data ?? null) as CachedQuizData | null
    const cachedForCategory = quizData?.[category]
    if (isFiveQuestions(cachedForCategory)) {
      return NextResponse.json({ questions: cachedForCategory })
    }

    const items = await fetchRssItems()
    const questions = await generateQuizForCategory(category, items)

    const prev: CachedQuizData = { ...(quizData ?? {}) }
    const merged: CachedQuizData = { ...prev, [category]: questions }
    const expiresAt = getNextKstMidnightIso()

    if (cacheRow?.id != null) {
      const { error: updErr } = await supabase
        .from('quiz_cache')
        .update({ quiz_data: merged })
        .eq('id', cacheRow.id)
      if (updErr) {
        throw new Error(`quiz_cache update failed: ${updErr.message}`)
      }
    } else {
      const { error: insertErr } = await supabase.from('quiz_cache').insert({
        quiz_data: merged,
        expires_at: expiresAt,
      })
      if (insertErr) {
        throw new Error(`quiz_cache insert failed: ${insertErr.message}`)
      }
    }

    return NextResponse.json({ questions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[GET /api/quiz/generate]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
