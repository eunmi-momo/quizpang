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

function isUniqueViolation(err: { code?: string; message?: string }): boolean {
  return (
    err.code === '23505' ||
    /duplicate key|unique constraint|violates unique constraint/i.test(String(err.message ?? ''))
  )
}

/**
 * increment_participation RPC 실패 또는 0행 반환 시 사용.
 * `id=1` 행이 없으면 INSERT(1001)로 첫 반영, 있으면 +1 UPDATE.
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

  if (row == null) {
    const { error: insErr } = await supabase.from('participation_counter').insert({ id: 1, count: 1001 })
    if (!insErr) return
    if (isUniqueViolation(insErr)) {
      await incrementParticipationFallback(supabase)
      return
    }
    console.error('[participation] insert participation_counter:', insErr.message)
    return
  }

  const cur = parseCountField(row.count)
  const { error: upErr } = await supabase
    .from('participation_counter')
    .update({ count: cur + 1 })
    .eq('id', 1)

  if (upErr) {
    console.error('[participation] update participation_counter:', upErr.message)
  }
}
