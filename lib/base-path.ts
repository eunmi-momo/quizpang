/**
 * `/quizpang` 같은 서브 경로에 배포할 때 API 호출 URL에 사용합니다.
 * next.config의 basePath와 같은 값을 빌드 시 NEXT_PUBLIC_BASE_PATH로 넣으세요.
 */
export function apiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
