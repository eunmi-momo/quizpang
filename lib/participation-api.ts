import { apiUrl } from '@/lib/base-path'

/**
 * 누적 참여 수 (GET /api/stats/participation) — 짧은 간격으로 두 번 요청해
 * CDN/프록시/일시 지연으로 낮게 온 값을 완화합니다.
 */
export async function fetchParticipationTotalWithRetry(): Promise<number | null> {
  const once = async (): Promise<number | null> => {
    const base = apiUrl('/api/stats/participation')
    const sep = base.includes('?') ? '&' : '?'
    const res = await fetch(`${base}${sep}_=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Accept: 'application/json',
      },
    })
    const data = (await res.json().catch(() => ({}))) as { total?: unknown }
    const n = data.total
    if (!res.ok || typeof n !== 'number' || !Number.isFinite(n)) return null
    return Math.round(n)
  }

  const first = await once()
  if (first == null) return null
  await new Promise((r) => setTimeout(r, 450))
  const second = await once()
  if (second == null) return first
  return Math.max(first, second)
}
