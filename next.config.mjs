import nextEnv from "@next/env"
import { dirname } from "path"
import { fileURLToPath } from "url"

// 빌드 시 .env.local이 next.config보다 늦게 적용되는 경우를 막음 (VM 배포 등)
const projectDir = dirname(fileURLToPath(import.meta.url))
nextEnv.loadEnvConfig(projectDir)

/** @type {import('next').NextConfig} */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim() || undefined

const nextConfig = {
  output: "standalone",
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
}

export default nextConfig
