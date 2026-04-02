/**
 * 클라이언트 전용 — 누적 참여 수 표시 일관성 (낮게 오는 GET·세션과 병합)
 */

export const SESSION_PARTICIPATION_KEY = 'quizpang_latest_participation'
const LOCAL_MAX_KEY = 'quizpang_participation_max'

export function readSessionParticipation(): number | null {
  if (typeof window === 'undefined') return null
  const sync = sessionStorage.getItem(SESSION_PARTICIPATION_KEY)
  if (sync == null) return null
  const v = Number.parseInt(sync, 10)
  return Number.isFinite(v) ? v : null
}

export function readParticipationLocalMax(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCAL_MAX_KEY)
    if (raw == null) return null
    const v = Number.parseInt(raw, 10)
    return Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

/** 서버/GET·퀴즈 직후 session·POST 응답·local 최댓값 중 최대 (누적 참여는 단조 증가 가정) */
export function mergeParticipationDisplayValue(
  fetched: number,
  options?: { optimistic?: number | null; fromPost?: number | null },
): number {
  const optimistic =
    options && 'optimistic' in options ? options.optimistic : readSessionParticipation()
  const fromPost = options?.fromPost ?? null
  const local = readParticipationLocalMax()
  return Math.max(
    Number.isFinite(fetched) ? fetched : 0,
    optimistic ?? 0,
    fromPost ?? 0,
    local ?? 0,
  )
}

/** 서버 값이 세션의 낙관적 값을 따라잡았을 때만 세션 삭제 */
export function tryClearSessionParticipationAfterFetch(serverCount: number): void {
  if (typeof window === 'undefined') return
  const opt = readSessionParticipation()
  if (opt == null || serverCount >= opt) {
    sessionStorage.removeItem(SESSION_PARTICIPATION_KEY)
  }
}

export function bumpParticipationLocalMax(candidate: number): void {
  if (typeof window === 'undefined') return
  if (!Number.isFinite(candidate) || candidate < 0) return
  try {
    const prev = readParticipationLocalMax() ?? 0
    const next = Math.max(prev, Math.round(candidate))
    localStorage.setItem(LOCAL_MAX_KEY, String(next))
  } catch {
    // 저장 실패 시 무시 (사파리 프라이빗 모드 등)
  }
}
