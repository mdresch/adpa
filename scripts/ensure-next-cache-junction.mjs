/**
 * Windows: point project .next at %LOCALAPPDATA%\adpa-next-cache via directory junction.
 * Next.js distDir must stay relative; absolute paths are not supported.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync } from 'node:child_process'

const projectRoot = process.cwd()
const linkPath = path.join(projectRoot, '.next')
const targetPath = path.join(
  process.env.LOCALAPPDATA || os.tmpdir(),
  'adpa-next-cache',
)

if (process.platform !== 'win32') {
  console.log('[dev:cache] Junction setup is Windows-only; using default .next')
  process.exit(0)
}

fs.mkdirSync(targetPath, { recursive: true })

function isJunction(p) {
  try {
    const stat = fs.lstatSync(p)
    return stat.isSymbolicLink() || stat.isJunction?.()
  } catch {
    return false
  }
}

if (fs.existsSync(linkPath)) {
  if (isJunction(linkPath)) {
    console.log(`[dev:cache] .next junction already exists → ${targetPath}`)
    process.exit(0)
  }
  console.error(
    '[dev:cache] .next exists as a normal folder on F:. Remove or rename it, then run pnpm dev:cache again:\n' +
      '  Remove-Item -Recurse -Force .next\n' +
      '  pnpm dev:cache',
  )
  process.exit(1)
}

const cmd = `cmd /c mklink /J "${linkPath}" "${targetPath}"`
console.log(`[dev:cache] ${cmd}`)
execSync(cmd, { stdio: 'inherit' })
console.log(`[dev:cache] Turbopack cache will use ${targetPath}`)
