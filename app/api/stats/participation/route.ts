import { NextResponse } from 'next/server'

import { getParticipationCountFromDb } from '@/lib/participation'
import { createSupabaseServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const DEFAULT_TOTAL = 1000

/**
 * 누적 참여 수 (기본 1000 + 퀴즈 완료 시 증가, participation_counter 테이블)
 */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const total = await getParticipationCountFromDb(supabase)

    const noStore = {
      'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      /** nginx / Cloud CDN / LB 앞단 캐시 억제(설정에 따라 무시될 수 있음) */
      'CDN-Cache-Control': 'no-store',
    } as const

    return NextResponse.json({ total }, { headers: noStore })
  } catch (e) {
    console.error('[GET /api/stats/participation]', e)
    return NextResponse.json(
      { total: DEFAULT_TOTAL },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          'CDN-Cache-Control': 'no-store',
        },
      },
    )
  }
}
