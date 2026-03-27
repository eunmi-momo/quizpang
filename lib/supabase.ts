import { createClient, SupabaseClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required environment variable: ${name}`)
  return v
}

/**
 * 서버 전용 — RLS 우회, SERVICE_ROLE_KEY 사용 (API Route, Server Actions 등)
 */
export function createSupabaseServerClient(): SupabaseClient {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * 브라우저/클라이언트 컴포넌트용 — ANON_KEY (공개 키)
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, key)
}
