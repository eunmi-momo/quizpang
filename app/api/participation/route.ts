import { NextResponse } from 'next/server'

import { parseCountField } from '@/lib/participation'
import { createSupabaseServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const DEFAULT_COUNT = 1000

/** GET: participation_counter(id=1)의 count 반환 */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('participation_counter')
      .select('count')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      console.warn('[GET /api/participation]', error.message)
      return NextResponse.json(
        { count: DEFAULT_COUNT },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        },
      )
    }

    const count = parseCountField(data?.count)

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
