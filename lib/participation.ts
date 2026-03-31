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

/**
 * increment_participation RPC 실패 시 select + update로 +1 (폴백)
 */
export async function incrementParticipationFallback(supabase: SupabaseClient): Promise<void> {
  const { data: row, error: selErr } = await supabase
    .from('participation_counter')
    .select('count')
    .eq('id', 1)
    .maybeSingle()

  if (selErr) {
    console.error('[participation] select participation_counter:', selErr.message)
    return
  }

  const cur = parseCountField(row?.count)
  const { error: upErr } = await supabase
    .from('participation_counter')
    .update({ count: cur + 1 })
    .eq('id', 1)

  if (upErr) {
    console.error('[participation] update participation_counter:', upErr.message)
  }
}
