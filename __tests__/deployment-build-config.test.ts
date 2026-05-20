import { readFileSync } from 'fs'
import { join } from 'path'

const readWorkspaceFile = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')

describe('deployment build configuration', () => {
  it('serves Vercel keepalive from the local Next.js route instead of rewriting it to Render', () => {
    const nextConfig = readWorkspaceFile('next.config.mjs')

    expect(nextConfig).toMatch(/keepalive/)
    expect(nextConfig).toMatch(/source:\s*['"]\/api\/:path\(\(\?![^'"]*keepalive/)
  })

  it('uses the production backend transpile script for Render builds', () => {
    const serverPackage = JSON.parse(readWorkspaceFile('server/package.json'))

    expect(serverPackage.scripts.build).toBe(
      'node scripts/build-production.mjs && tsc-alias -p tsconfig.json'
    )
    expect(serverPackage.devDependencies.esbuild).toBeDefined()
  })

  it('includes server context providers in the production build allowlist', () => {
    const buildScript = readWorkspaceFile('server/scripts/build-production.mjs')

    expect(buildScript).not.toMatch(/server\/src\/contexts\//)
  })
})
