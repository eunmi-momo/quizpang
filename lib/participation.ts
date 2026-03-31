import type { SupabaseClient } from '@supabase/supabase-js'

/** Supabase bigint → 숫자 (문자열로 오는 경우 대비) */
export function parseCountField(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v)
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return Math.round(n)
  }
  return 1000
}

/** DB에 저장된 누적 참여 수 (id=1). 조회 실패 시 1000 */
export async function getParticipationCountFromDb(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('participation_counter')
    .select('count')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    console.error('[participation] getParticipationCountFromDb:', error.message)
    return 1000
  }
  return parseCountField(data?.count)
}
