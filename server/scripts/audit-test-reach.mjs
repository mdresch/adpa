#!/usr/bin/env node
/**
 * Estimate how much of server/src is exercised by existing tests (import reachability).
 * Fast static analysis — no Jest instrumentation. Run: npm run audit:test-reach
 */
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = join(serverRoot, 'src')
const testsRoot = join(srcRoot, '__tests__')

const IMPORT_RE =
  /(?:import|export)\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'coverage') continue
      walk(full, acc)
    } else if (/\.(ts|tsx|js)$/.test(name) && !name.endsWith('.d.ts')) {
      acc.push(full)
    }
  }
  return acc
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith('@/')) {
    return resolve(srcRoot, spec.slice(2).replace(/\.(ts|js)$/, '') + '.ts')
  }
  if (spec.startsWith('.')) {
    const base = resolve(dirname(fromFile), spec)
    const candidates = [base, `${base}.ts`, join(base, 'index.ts')]
    for (const c of candidates) {
      if (existsSync(c) && statSync(c).isFile()) return c
    }
  }
  return null
}

function collectReachable(testFiles) {
  const reached = new Set()
  const testToSrc = new Map()

  for (const testFile of testFiles) {
    const content = readFileSync(testFile, 'utf8')
    const hits = new Set()
    let m
    IMPORT_RE.lastIndex = 0
    while ((m = IMPORT_RE.exec(content)) !== null) {
      const spec = m[1] || m[2]
      if (!spec || spec.startsWith('node:')) continue
      const resolved = resolveImport(testFile, spec)
      if (!resolved || !resolved.startsWith(srcRoot)) continue
      if (resolved.includes('__tests__')) continue
      hits.add(resolved)
      reached.add(resolved)
    }
    testToSrc.set(testFile, hits)
  }
  return { reached, testToSrc }
}

const allSrc = walk(srcRoot).filter((f) => !f.includes(`${join('src', '__tests__')}`))
const allTests = walk(testsRoot).filter((f) => /\.test\.(ts|js)$/.test(f))

/** Same file set as `npx jest --config jest.config.unit.js --listTests` (single source of truth). */
function listUnitTestsFromJest() {
  try {
    const out = execSync('npx jest --config jest.config.unit.js --listTests --no-color', {
      cwd: serverRoot,
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
  } catch (err) {
    const msg = err.stderr?.toString?.() || err.message
    console.warn(`Warning: jest --listTests failed (${msg}); using pattern fallback`)
    const fallbackPatterns = [
      /[/\\]modules[/\\]/,
      /\.unit\.test\.(ts|js)$/,
      /templateAuditService\.test/,
      /inlineEntityParserService\.test/,
      /documentGenerationService\.test/,
      /documentGenerationRouteGuards\.unit\.test/,
    ]
    return allTests.filter((f) => fallbackPatterns.some((re) => re.test(f)))
  }
}

const unitTests = listUnitTestsFromJest()
const governedTests = allTests.filter((f) => /[/\\]modules[/\\]rag[/\\]/.test(f))

function report(label, testFiles) {
  const { reached } = collectReachable(testFiles)
  const pct = allSrc.length ? ((reached.size / allSrc.length) * 100).toFixed(1) : '0.0'
  console.log(`\n=== ${label} ===`)
  console.log(`Tests      : ${testFiles.length}`)
  console.log(`Src files  : ${allSrc.length} total`)
  console.log(`Reached    : ${reached.size} (${pct}% of src files referenced by imports)`)

  const byDir = new Map()
  for (const file of allSrc) {
    const rel = relative(srcRoot, file)
    const top = rel.split(/[/\\]/)[0]
    byDir.set(top, (byDir.get(top) || { total: 0, hit: 0 }))
    byDir.get(top).total++
    if (reached.has(file)) byDir.get(top).hit++
  }

  console.log('\nBy top-level src folder:')
  for (const [dir, { total, hit }] of [...byDir.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const p = total ? ((hit / total) * 100).toFixed(0) : '0'
    console.log(`  ${dir.padEnd(14)} ${String(hit).padStart(4)}/${String(total).padStart(4)}  (${p}%)`)
  }

  const ragSrc = allSrc.filter((f) => f.includes(`${join('modules', 'rag')}`))
  const ragHit = ragSrc.filter((f) => reached.has(f))
  if (ragSrc.length) {
    console.log(`\nGoverned RAG: ${ragHit.length}/${ragSrc.length} module files referenced`)
    for (const f of ragSrc) {
      const rel = relative(serverRoot, f).replace(/\\/g, '/')
      console.log(`  ${reached.has(f) ? '✓' : '·'} ${rel}`)
    }
  }

  return { reached, pct, testFiles: testFiles.length }
}

console.log('ADPA test reachability audit (static import graph)')
console.log('Note: "reached" = imported by a test file, not line/branch coverage.')

report('All tests', allTests)
report('Mock-safe unit suite (jest.config.unit.js via --listTests)', unitTests)
report('Governed RAG packet', governedTests)

console.log('\nFor line coverage, run: npm run test:coverage:unit && npm run report:coverage:unit')
console.log('(Uses Jest V8 provider; may take several minutes on Windows.)\n')
