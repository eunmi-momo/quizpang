import { NextResponse } from 'next/server'

import { getParticipationCountFromDb } from '@/lib/participation'
import { createSupabaseServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const DEFAULT_COUNT = 1000

/** GET: participation_counter(id=1)의 count 반환 */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const count = await getParticipationCountFromDb(supabase)

    return NextResponse.json(
      { count },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    )
  } catch (e) {
    console.error('[GET /api/participation]', e)
    return NextResponse.json(
      { count: DEFAULT_COUNT },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    )
  }
}
