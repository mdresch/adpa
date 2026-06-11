#!/usr/bin/env node
/**
 * Run governed feature tests from governed-features.manifest.json.
 *
 * Usage:
 *   node scripts/run-governed-features.mjs           # all features
 *   node scripts/run-governed-features.mjs rag       # single feature by id
 *   npm run test:features -- doc-gen
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(serverRoot, 'governed-features.manifest.json')

function resolveTestPathPattern(feature) {
  if (feature.testPathPattern) {
    return feature.testPathPattern
  }
  if (feature.testModuleDir) {
    return `modules/${feature.testModuleDir}`
  }
  throw new Error(
    `feature "${feature.id}" must define testPathPattern or testModuleDir in governed-features.manifest.json`
  )
}

if (!existsSync(manifestPath)) {
  console.error(`run-governed-features: missing manifest: ${manifestPath}`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const features = manifest.features ?? []
if (features.length === 0) {
  console.error('run-governed-features: manifest.features is empty')
  process.exit(1)
}

const filterId = process.argv[2]?.replace(/^--/, '')
let selected = features
if (filterId) {
  selected = features.filter((f) => f.id === filterId)
  if (selected.length === 0) {
    console.error(
      `run-governed-features: unknown feature id "${filterId}". Registered: ${features.map((f) => f.id).join(', ')}`
    )
    process.exit(1)
  }
}

for (const feature of selected) {
  const pattern = resolveTestPathPattern(feature)
  console.log(`\nGoverned feature: ${feature.id} → testPathPattern=${pattern}`)

  const result = spawnSync(
    'npx',
    [
      'jest',
      '--config',
      'jest.config.unit.js',
      `--testPathPattern=${pattern}`,
      '--no-coverage',
    ],
    { cwd: serverRoot, stdio: 'inherit', shell: true }
  )

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

process.exit(0)
