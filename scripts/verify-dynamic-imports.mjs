// Verifies every relative dynamic import() specifier found in server/dist actually
// resolves under Node's ESM resolver -- the exact failure mode fixed by
// fix-dynamic-import-extensions.mjs (missing .js extensions).
import { readFileSync, readdirSync, statSync } from 'fs'
import { dirname, resolve, join, extname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const scriptDir = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const distDir = resolve(repoRoot, 'server/dist')

const specifierRe = /import\((["'`])(\.[^"'`]*)\1\)/g

function collect(dir) {
  const out = []
  for (const child of readdirSync(dir)) {
    const childPath = join(dir, child)
    const st = statSync(childPath)
    if (st.isDirectory()) out.push(...collect(childPath))
    else if (extname(childPath) === '.js') out.push(childPath)
  }
  return out
}

const files = collect(distDir)
let checked = 0
let failed = 0

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  let m
  while ((m = specifierRe.exec(src))) {
    const spec = m[2]
    checked++
    try {
      // Resolution only -- does not execute the target module, so no DB/Redis/etc
      // side effects from modules that connect on import.
      import.meta.resolve(spec, pathToFileURL(file).href)
    } catch (e) {
      failed++
      console.log(`UNRESOLVED: ${spec}  (from ${file}): ${e.code}`)
    }
  }
}

console.log(`\nChecked ${checked} dynamic import specifiers, ${failed} failed to resolve.`)
process.exit(failed > 0 ? 1 : 0)
