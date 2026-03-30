import { NextResponse } from 'next/server'

import { incrementParticipationAfterScore } from '@/lib/participation'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { Category } from '@/types/quiz'

const CATEGORIES: Category[] = ['broadcast', 'movie', 'music', 'star']

function isCategory(s: string | null): s is Category {
  return s != null && (CATEGORIES as readonly string[]).includes(s)
}

/** 한국(Asia/Seoul) 기준 오늘 00:00:00 ~ 23:59:59.999 를 UTC ISO 문자열로 */
function getKstTodayRangeIso(): { start: string; end: string } {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(now)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  if (!y || !m || !d) {
    throw new Error('Could not resolve KST calendar date')
  }
  const start = new Date(`${y}-${m}-${d}T00:00:00+09:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Body must be an object' }, { status: 400 })
    }

    const { nickname, category, score } = body as Record<string, unknown>

    if (typeof nickname !== 'string' || nickname.trim().length === 0) {
      return NextResponse.json({ error: 'nickname is required (non-empty string)' }, { status: 400 })
    }
    if (typeof category !== 'string' || !isCategory(category)) {
      return NextResponse.json(
        { error: 'category must be broadcast | movie | music | star' },
        { status: 400 },
      )
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      return NextResponse.json({ error: 'score must be a finite number' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const { error } = await supabase.from('scores').insert({
      nickname: nickname.trim(),
      category,
      score: Math.round(score),
    })

    if (error) {
      throw new Error(`scores insert failed: ${error.message}`)
    }

    await incrementParticipationAfterScore(supabase)

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[POST /api/score]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
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

  try {
    const { start, end } = getKstTodayRangeIso()
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('scores')
      .select('nickname, score, created_at')
      .eq('category', raw)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      throw new Error(`scores query failed: ${error.message}`)
    }

    const rankings = (data ?? []).map((row) => ({
      nickname: String(row.nickname ?? '').trim(),
      score: Number(row.score),
    }))

    return NextResponse.json({ rankings })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[GET /api/score]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
