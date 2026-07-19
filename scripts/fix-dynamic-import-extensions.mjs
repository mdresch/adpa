// One-off migration script: Node's ESM dynamic import() resolver (used for every
// `await import("./relative/path")` in esbuild's non-bundled CJS output, regardless
// of the file being CJS) requires explicit extensions, unlike CJS require(). Rewrites
// each relative dynamic-import specifier in server/src to point at the real .ts file
// (as .js, matching the compiled dist output) or its directory's index.ts (as /index.js).
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { dirname, resolve, relative, posix, join, extname } from 'path'
import { fileURLToPath } from 'url'

const scriptDir = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = resolve(scriptDir, '..')
const serverSrc = resolve(repoRoot, 'server/src')

const specifierScanRe = /import\(["'`]\.[^"'`]*["'`]\)/

function collectCandidateFiles(dir) {
  const out = []
  for (const child of readdirSync(dir)) {
    if (['node_modules', 'dist', '__tests__', 'tests', 'examples'].includes(child)) continue
    const childPath = join(dir, child)
    const st = statSync(childPath)
    if (st.isDirectory()) {
      out.push(...collectCandidateFiles(childPath))
    } else if (['.ts', '.tsx'].includes(extname(childPath)) && !child.endsWith('.test.ts') && !child.endsWith('.spec.ts')) {
      out.push(childPath)
    }
  }
  return out
}

const files = collectCandidateFiles(serverSrc)
  .filter((f) => specifierScanRe.test(readFileSync(f, 'utf8')))
  .map((f) => relative(repoRoot, f).split('\\').join('/'))

const specifierRe = /import\((["'`])(\.[^"'`]*)\1\)/g

let totalChanges = 0
const report = []

for (const relFile of files) {
  const absFile = resolve(repoRoot, relFile)
  const dir = dirname(absFile)
  const src = readFileSync(absFile, 'utf8')
  let changed = false

  const next = src.replace(specifierRe, (full, quote, spec) => {
    if (/\.(js|json|mjs|cjs|node)$/.test(spec)) {
      return full // already extensioned (e.g. a .json data file)
    }

    const asFile = resolve(dir, spec + '.ts')
    const asFileTsx = resolve(dir, spec + '.tsx')
    const asIndex = resolve(dir, spec, 'index.ts')

    let resolvedSpec
    if (existsSync(asFile)) {
      resolvedSpec = spec + '.js'
    } else if (existsSync(asFileTsx)) {
      resolvedSpec = spec + '.js'
    } else if (existsSync(asIndex)) {
      resolvedSpec = posix.join(spec, 'index.js')
      if (!spec.endsWith('/') && spec !== '.') {
        resolvedSpec = spec + '/index.js'
      }
    } else {
      report.push(`UNRESOLVED: ${relFile}: ${spec}`)
      return full
    }

    changed = true
    totalChanges++
    return `import(${quote}${resolvedSpec}${quote})`
  })

  if (changed) {
    writeFileSync(absFile, next, 'utf8')
    report.push(`FIXED: ${relFile}`)
  }
}

console.log(report.join('\n'))
console.log(`\nTotal specifiers fixed: ${totalChanges}`)
