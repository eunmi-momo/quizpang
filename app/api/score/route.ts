import { NextResponse } from 'next/server'

import { getParticipationCountFromDb, incrementParticipationFallback } from '@/lib/participation'
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
  console.log('[POST /api/score] 요청 수신')
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      console.log('[POST /api/score] JSON 파싱 실패 → 400')
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      console.log('[POST /api/score] body가 객체 아님 → 400')
      return NextResponse.json({ error: 'Body must be an object' }, { status: 400 })
    }

    const { nickname, category, score } = body as Record<string, unknown>

    if (typeof nickname !== 'string' || nickname.trim().length === 0) {
      console.log('[POST /api/score] nickname 검증 실패 → 400')
      return NextResponse.json({ error: 'nickname is required (non-empty string)' }, { status: 400 })
    }
    if (typeof category !== 'string' || !isCategory(category)) {
      console.log('[POST /api/score] category 검증 실패 → 400')
      return NextResponse.json(
        { error: 'category must be broadcast | movie | music | star' },
        { status: 400 },
      )
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      console.log('[POST /api/score] score 검증 실패 → 400')
      return NextResponse.json({ error: 'score must be a finite number' }, { status: 400 })
    }

    console.log('[POST /api/score] 검증 통과', { nickname: nickname.trim(), category, score })

    const supabase = createSupabaseServerClient()
    const { error } = await supabase.from('scores').insert({
      nickname: nickname.trim(),
      category,
      score: Math.round(score),
    })

    if (error) {
      console.error('[POST /api/score] scores insert 실패:', error.message)
      throw new Error(`scores insert failed: ${error.message}`)
    }
    console.log('[POST /api/score] scores insert 성공')

    const { data: rpcData, error: rpcError } = await supabase.rpc('increment_participation')
    if (rpcError) {
      console.error('increment_participation 실패:', rpcError)
      console.log('[POST /api/score] RPC 오류 → 폴백(incrementParticipationFallback) 시도')
      await incrementParticipationFallback(supabase)
    } else if (rpcData == null) {
      /** DB에 id=1 행이 없으면 UPDATE 0행 → PL/pgSQL이 NULL 반환. 에러는 없음 */
      console.warn(
        '[POST /api/score] increment_participation이 null 반환(0행 UPDATE 가능) → 폴백 시도',
      )
      await incrementParticipationFallback(supabase)
    } else {
      console.log('[POST /api/score] increment_participation RPC 성공', { count: rpcData })
    }

    const participationCount = await getParticipationCountFromDb(supabase)
    console.log('[POST /api/score] 처리 완료 → 200', { participationCount })
    return NextResponse.json({ ok: true, participationCount })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[POST /api/score] 예외:', e)
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
