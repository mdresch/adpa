#!/usr/bin/env node
/**
 * Print a short coverage rollup from coverage/unit/coverage-summary.json
 * after running: npm run test:coverage:unit
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const summaryPath = join(serverRoot, 'coverage', 'unit', 'coverage-summary.json')

if (!existsSync(summaryPath)) {
  console.error('Missing coverage summary. Run: cd server && npm run test:coverage:unit')
  process.exit(1)
}

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
const total = summary.total

function pct(metric) {
  return `${total[metric].pct}%`
}

console.log('\n=== ADPA unit test coverage (mock-safe suite) ===\n')
console.log(`Statements : ${pct('statements')}  (${total.statements.covered}/${total.statements.total})`)
console.log(`Branches   : ${pct('branches')}  (${total.branches.covered}/${total.branches.total})`)
console.log(`Functions  : ${pct('functions')}  (${total.functions.covered}/${total.functions.total})`)
console.log(`Lines      : ${pct('lines')}  (${total.lines.covered}/${total.lines.total})`)

const entries = Object.entries(summary)
  .filter(([key]) => key !== 'total')
  .map(([file, m]) => ({
    file: file.replace(/\\/g, '/').replace(/^.*\/server\//, 'server/'),
    lines: m.lines.pct,
    covered: m.lines.covered,
    total: m.lines.total,
  }))
  .filter((e) => e.total > 0)
  .sort((a, b) => a.lines - b.lines)

const governed = entries.filter((e) => e.file.includes('/modules/rag/'))
if (governed.length > 0) {
  console.log('\n--- Governed RAG modules ---')
  for (const e of governed) {
    console.log(`  ${e.lines}% lines  ${e.file}`)
  }
}

const low = entries.filter((e) => e.lines < 40 && e.total >= 10).slice(0, 15)
if (low.length > 0) {
  console.log('\n--- Lowest line coverage (≥10 lines, <40%) ---')
  for (const e of low) {
    console.log(`  ${e.lines}%  ${e.covered}/${e.total}  ${e.file}`)
  }
}

const high = entries.filter((e) => e.lines >= 80 && e.total >= 20).slice(-10)
if (high.length > 0) {
  console.log('\n--- Well-covered files (≥80%, ≥20 lines) ---')
  for (const e of high.slice(0, 10)) {
    console.log(`  ${e.lines}%  ${e.covered}/${e.total}  ${e.file}`)
  }
}

console.log('\nHTML report: server/coverage/unit/lcov-report/index.html\n')
