import { NextResponse } from 'next/server'

import { parseCountField } from '@/lib/participation'
import { createSupabaseServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const DEFAULT_TOTAL = 1000

/**
 * 누적 참여 수 (기본 1000 + 퀴즈 완료 시 증가, participation_counter 테이블)
 */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('participation_counter')
      .select('count')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      console.warn('[GET /api/stats/participation]', error.message)
      return NextResponse.json(
        { total: DEFAULT_TOTAL },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        },
      )
    }

    const total = parseCountField(data?.count)

    return NextResponse.json(
      { total },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    )
  } catch (e) {
    console.error('[GET /api/stats/participation]', e)
    return NextResponse.json(
      { total: DEFAULT_TOTAL },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    )
  }
}
