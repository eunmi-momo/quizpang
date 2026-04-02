/**
 * `/quizpang` 같은 서브 경로에 배포할 때 API 호출 URL에 사용합니다.
 * next.config의 basePath와 같은 값을 빌드 시 NEXT_PUBLIC_BASE_PATH로 넣으세요.
 */
function normalizeBase(s: string): string {
  return s.replace(/\/$/, '')
}

function envBase(): string {
  return normalizeBase(process.env.NEXT_PUBLIC_BASE_PATH ?? '')
}

/**
 * GCP VM 등에서 빌드에 basePath 없이 올렸는데 nginx는 `/quizpang` 아래로만 노출하는 경우,
 * 브라우저가 `/quizpang/...`에 있으면 API도 `/quizpang/api/...`로 잡히도록 보정합니다.
 */
function inferClientBasePath(): string {
  if (typeof window === 'undefined') return ''
  if (envBase()) return ''
  const pathname = window.location.pathname
  if (pathname === '/quizpang' || pathname.startsWith('/quizpang/')) {
    return '/quizpang'
  }
  return ''
}

export function apiUrl(path: string): string {
  const base = typeof window !== 'undefined' ? envBase() || inferClientBasePath() : envBase()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
