#!/usr/bin/env node
/**
 * Estimate how much of the Next.js frontend is exercised by tests (import reachability).
 * Fast static analysis — no Jest instrumentation. Run: pnpm audit:test-reach
 */
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_TOP_DIRS = ['app', 'components', 'lib', 'hooks', 'contexts']

const IMPORT_RE =
  /(?:import|export)\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g

const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|jsx)$/

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'coverage' || name === '.next') continue
      walk(full, acc)
    } else if (/\.(ts|tsx|js|jsx)$/.test(name) && !name.endsWith('.d.ts')) {
      acc.push(full)
    }
  }
  return acc
}

function firstExisting(candidates) {
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c
  }
  return null
}

function isFrontendSource(file) {
  const rel = relative(repoRoot, file).replace(/\\/g, '/')
  const top = rel.split('/')[0]
  return SRC_TOP_DIRS.includes(top) && !rel.includes('/__tests__/')
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith('@/')) {
    const base = resolve(repoRoot, spec.slice(2).replace(/\.(tsx?|jsx?)$/, ''))
    return firstExisting([
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.js`,
      `${base}.jsx`,
      join(base, 'index.ts'),
      join(base, 'index.tsx'),
    ])
  }
  if (spec.startsWith('.')) {
    const base = resolve(dirname(fromFile), spec.replace(/\.(tsx?|jsx?)$/, ''))
    return firstExisting([
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.js`,
      `${base}.jsx`,
      join(base, 'index.ts'),
      join(base, 'index.tsx'),
    ])
  }
  return null
}

function collectReachable(testFiles) {
  const reached = new Set()

  for (const testFile of testFiles) {
    const content = readFileSync(testFile, 'utf8')
    let m
    IMPORT_RE.lastIndex = 0
    while ((m = IMPORT_RE.exec(content)) !== null) {
      const spec = m[1] || m[2]
      if (!spec || spec.startsWith('node:')) continue
      const resolved = resolveImport(testFile, spec)
      if (!resolved || !isFrontendSource(resolved)) continue
      reached.add(resolved)
    }
  }
  return { reached }
}

function collectAllFrontendTests() {
  const tests = new Set()
  const roots = [
    join(repoRoot, '__tests__'),
    join(repoRoot, 'components'),
    join(repoRoot, 'lib'),
    join(repoRoot, 'app'),
    join(repoRoot, 'hooks'),
    join(repoRoot, 'contexts'),
  ]
  for (const root of roots) {
    for (const file of walk(root)) {
      if (!TEST_FILE_RE.test(file)) continue
      if (/[/\\]server[/\\]/.test(file)) continue
      tests.add(file)
    }
  }
  return [...tests].sort()
}

function listJestFrontendTests() {
  try {
    const out = execSync('npx jest --listTests --no-color', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    })
    return out
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((p) => resolve(p))
      .filter((p) => existsSync(p))
      .filter((p) => !/[/\\]server[/\\]/.test(p) && !/[/\\]e2e[/\\]/.test(p))
  } catch (err) {
    const msg = err.stderr?.toString?.() || err.message
    console.warn(`Warning: jest --listTests failed (${msg}); using walk fallback`)
    return collectAllFrontendTests()
  }
}

const allSrc = SRC_TOP_DIRS.flatMap((dir) => walk(join(repoRoot, dir))).filter(isFrontendSource)
const allTests = collectAllFrontendTests()
const jestTests = listJestFrontendTests()
const unitTests = allTests.filter(
  (f) => !/[/\\]integration[/\\]/.test(f) && !/db-integration|project-documents/.test(f),
)
const genuiTests = allTests.filter((f) => /genui|openui|layoutPlan|projectOpenUI/i.test(f))

function report(label, testFiles) {
  const { reached } = collectReachable(testFiles)
  const pct = allSrc.length ? ((reached.size / allSrc.length) * 100).toFixed(1) : '0.0'
  console.log(`\n=== ${label} ===`)
  console.log(`Tests      : ${testFiles.length}`)
  console.log(`Src files  : ${allSrc.length} total (${SRC_TOP_DIRS.join(', ')})`)
  console.log(`Reached    : ${reached.size} (${pct}% of frontend src files referenced by imports)`)

  const byDir = new Map()
  for (const file of allSrc) {
    const rel = relative(repoRoot, file)
    const top = rel.split(/[/\\]/)[0]
    byDir.set(top, byDir.get(top) || { total: 0, hit: 0 })
    byDir.get(top).total++
    if (reached.has(file)) byDir.get(top).hit++
  }

  console.log('\nBy top-level folder:')
  for (const [dir, { total, hit }] of [...byDir.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const p = total ? ((hit / total) * 100).toFixed(0) : '0'
    console.log(`  ${dir.padEnd(14)} ${String(hit).padStart(4)}/${String(total).padStart(4)}  (${p}%)`)
  }

  return { reached, pct, testFiles: testFiles.length }
}

console.log('ADPA frontend test reachability audit (static import graph)')
console.log('Note: "reached" = imported by a test file, not line/branch coverage.')
console.log(`Scope: ${SRC_TOP_DIRS.map((d) => `${d}/`).join(', ')} (excludes server/)`)

report('All frontend tests (walk __tests__, components/lib co-located)', allTests)
report('Jest-discovered frontend tests (root jest.config.js, no server/)', jestTests)
report('Mock-safe-ish unit slice (excludes __tests__/integration)', unitTests)
if (genuiTests.length) {
  report('GenUI / OpenUI-related tests', genuiTests)
}

const jestOnly = jestTests.filter((f) => !allTests.includes(f))
const walkOnly = allTests.filter((f) => !jestTests.includes(f))
if (jestOnly.length || walkOnly.length) {
  console.log('\n=== Jest vs walk drift ===')
  if (walkOnly.length) {
    console.log(`Walk finds ${walkOnly.length} test file(s) not in jest --listTests (add to jest roots/testMatch):`)
    for (const f of walkOnly.slice(0, 8)) {
      console.log(`  · ${relative(repoRoot, f).replace(/\\/g, '/')}`)
    }
    if (walkOnly.length > 8) console.log(`  … and ${walkOnly.length - 8} more`)
  }
  if (jestOnly.length) {
    console.log(`Jest lists ${jestOnly.length} file(s) outside walk (unexpected)`)
  }
}

console.log('\nBackend audit: cd server && npm run audit:test-reach')
console.log('Line coverage: npx jest --coverage (root jest.config.js; slow on Windows)\n')
