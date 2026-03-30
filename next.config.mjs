import { existsSync, readFileSync } from "fs"
import nextEnv from "@next/env"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const projectDir = dirname(fileURLToPath(import.meta.url))
nextEnv.loadEnvConfig(projectDir)

/** .env.local에서 NEXT_PUBLIC_BASE_PATH만 직접 읽음 (@next/env가 빌드에서 비는 경우 대비) */
function readBasePathFromEnvLocal() {
  const p = join(projectDir, ".env.local")
  if (!existsSync(p)) return ""
  const raw = readFileSync(p, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const s = line.trim()
    if (!s || s.startsWith("#")) continue
    const eq = s.indexOf("=")
    if (eq === -1) continue
    const key = s.slice(0, eq).trim()
    if (key !== "NEXT_PUBLIC_BASE_PATH") continue
    let val = s.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    return val
  }
  return ""
}

/** @type {import('next').NextConfig} */
const basePath =
  (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim() ||
  readBasePathFromEnvLocal().trim() ||
  undefined

const nextConfig = {
  output: "standalone",
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  /** basePath 사용 시 localhost:3000/ → /quizpang/ (middleware는 basePath 기준 경로만 매칭되어 여기서 처리) */
  async redirects() {
    if (!basePath) return []
    return [
      {
        source: "/",
        destination: `${basePath}/`,
        permanent: false,
        basePath: false,
      },
    ]
  },
}

export default nextConfig
