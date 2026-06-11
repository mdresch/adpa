#!/usr/bin/env node
/**
 * Level 5.5 governance check:
 * - Every __tests__/modules/<dir> registered in governed-features.manifest.json
 * - Each manifest feature has testPathPattern (or testModuleDir → modules/<dir>)
 * - test:features runs scripts/run-governed-features.mjs (manifest-driven)
 * - SKILL.md presence for each manifest skill
 * - Optional spec + REQ traceability (warnings)
 * - Overlap guard when multiple skills (unless overlapGuard: false)
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(serverRoot, '..')
const manifestPath = join(serverRoot, 'governed-features.manifest.json')
const packagePath = join(serverRoot, 'package.json')
const modulesTestRoot = join(serverRoot, 'src', '__tests__', 'modules')
const testsRoot = join(serverRoot, 'src', '__tests__')
const specsRoot = join(repoRoot, 'docs', 'superpowers', 'specs')
const skillsRoot = join(repoRoot, '.agents', 'skills')
const FEATURES_RUNNER = 'node scripts/run-governed-features.mjs'

function kebabCase(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

function resolveTestPathPattern(feature) {
  if (feature.testPathPattern) return feature.testPathPattern
  if (feature.testModuleDir) return `modules/${feature.testModuleDir}`
  return null
}

function readTestSourcesFromDir(dir) {
  if (!existsSync(dir)) return ''
  return readdirSync(dir)
    .filter((name) => name.endsWith('.test.ts') || name.endsWith('.test.js'))
    .map((name) => readFileSync(join(dir, name), 'utf8'))
    .join('\n')
}

function listTestFilesMatchingPattern(pattern) {
  if (!existsSync(testsRoot)) return []
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (!/\.test\.(ts|js)$/.test(name)) continue
      const rel = full.replace(/\\/g, '/')
      if (rel.includes(pattern) || name.includes(pattern)) {
        files.push(full)
      }
    }
  }
  walk(testsRoot)
  return files
}

function readTestSourcesForFeature(feature) {
  if (feature.testModuleDir) {
    return readTestSourcesFromDir(join(modulesTestRoot, feature.testModuleDir))
  }
  const pattern = resolveTestPathPattern(feature)
  if (!pattern) return ''
  return listTestFilesMatchingPattern(pattern)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n')
}

function findSpecForFeature(featureId) {
  if (!existsSync(specsRoot)) return null
  const needle = featureId.toLowerCase()
  const match = readdirSync(specsRoot).find(
    (name) => name.endsWith('.md') && name.toLowerCase().includes(needle)
  )
  return match ? join(specsRoot, match) : null
}

function fail(errors, warnings) {
  if (warnings.length > 0) {
    console.warn('\nGoverned feature warnings:\n')
    for (const w of warnings) {
      console.warn(`  ⚠ ${w}`)
    }
  }
  if (errors.length > 0) {
    console.error('\nGoverned feature verification failed:\n')
    for (const e of errors) {
      console.error(`  ✗ ${e}`)
    }
    process.exit(1)
  }
}

if (!existsSync(manifestPath)) {
  console.error(`verify-governed-features: missing manifest: ${manifestPath}`)
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
const scripts = pkg.scripts ?? {}

if (!Array.isArray(manifest.features) || manifest.features.length === 0) {
  console.error('verify-governed-features: manifest.features must be a non-empty array')
  process.exit(1)
}

const registeredDirs = new Set()
const legacyDirs = new Set(manifest.legacyModuleDirs ?? [])
const errors = []
const warnings = []
const seenPatterns = new Map()

for (const feature of manifest.features) {
  const { id, testScript, testModuleDir, testPathPattern, skills, spec, overlapGuard } = feature

  if (!id) {
    errors.push(`feature entry missing id: ${JSON.stringify(feature)}`)
    continue
  }

  const pattern = resolveTestPathPattern(feature)
  if (!pattern) {
    errors.push(`feature "${id}" must define testPathPattern or testModuleDir`)
    continue
  }

  if (testPathPattern && testModuleDir && testPathPattern !== `modules/${testModuleDir}`) {
    warnings.push(
      `feature "${id}" testPathPattern "${testPathPattern}" differs from modules/${testModuleDir} — runner uses testPathPattern when both are set`
    )
  }

  if (seenPatterns.has(pattern)) {
    errors.push(
      `duplicate testPathPattern "${pattern}" for features "${seenPatterns.get(pattern)}" and "${id}"`
    )
  } else {
    seenPatterns.set(pattern, id)
  }

  const normalizedId = kebabCase(id)
  if (id !== normalizedId) {
    errors.push(`feature id "${id}" must be kebab-case`)
  }

  if (testScript) {
    warnings.push(
      `feature "${id}" uses deprecated testScript "${testScript}" — register testPathPattern only; use npm run test:features -- ${id}`
    )
  }

  if (testModuleDir) {
    const normalizedDir = kebabCase(testModuleDir)
    if (normalizedId !== normalizedDir) {
      errors.push(
        `feature id "${id}" must match testModuleDir "${testModuleDir}" (kebab-case: ${normalizedDir})`
      )
    }
    if (testModuleDir !== normalizedDir) {
      errors.push(`testModuleDir "${testModuleDir}" must be kebab-case`)
    }

    const moduleDir = join(modulesTestRoot, testModuleDir)
    if (!existsSync(moduleDir)) {
      errors.push(
        `test module dir not found: src/__tests__/modules/${testModuleDir} (feature: ${id})`
      )
    } else {
      registeredDirs.add(testModuleDir)
    }
  }

  const matchingTests = testModuleDir
    ? readdirSync(join(modulesTestRoot, testModuleDir)).filter((n) => /\.test\.(ts|js)$/.test(n))
    : listTestFilesMatchingPattern(pattern).map((f) => f.split(/[/\\]/).pop())

  if (matchingTests.length === 0) {
    errors.push(
      `no test files found for feature "${id}" (testPathPattern: ${pattern})`
    )
  }

  if (!Array.isArray(skills) || skills.length === 0) {
    errors.push(`feature "${id}" must list at least one skill in manifest.skills[]`)
  }

  for (const skill of skills ?? []) {
    if (!skill.startsWith('adpa-')) {
      warnings.push(`skill "${skill}" should use adpa- prefix (feature: ${id})`)
    }
    const skillPath = join(skillsRoot, skill, 'SKILL.md')
    if (!existsSync(skillPath)) {
      errors.push(`skill not found: .agents/skills/${skill}/SKILL.md (feature: ${id})`)
    }
  }

  const testSource = readTestSourcesForFeature(feature)

  const specPathFromManifest =
    typeof spec === 'string' && spec.endsWith('.md') ? join(repoRoot, spec) : null
  const discoveredSpec = findSpecForFeature(normalizedId)
  if (specPathFromManifest && !existsSync(specPathFromManifest)) {
    errors.push(`spec file not found: ${spec} (feature: ${id})`)
  } else if (!specPathFromManifest && !discoveredSpec) {
    warnings.push(
      `no design spec found for feature "${id}" under docs/superpowers/specs/*${normalizedId}*.md`
    )
  }

  // REQ-001 (numeric) or REQ-RAG-001 (semantic category prefix)
  if (!/REQ-(?:[A-Z]+-)?\d{3}/.test(testSource)) {
    warnings.push(
      `feature "${id}" tests do not reference REQ ids (add // REQ-001 or // REQ-RAG-001 in test comments)`
    )
  }

  const needsOverlapGuard = (skills?.length ?? 0) > 1 && overlapGuard !== false
  if (needsOverlapGuard) {
    const hasContractProbe = /validate\w*Contract/.test(testSource)
    const hasBeforeEachGuard = /beforeEach\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?validate\w*Contract/.test(
      testSource
    )
    if (!hasContractProbe || !hasBeforeEachGuard) {
      errors.push(
        `feature "${id}" has multiple skills (overlap) but tests lack overlap guard (beforeEach + validate*Contract), or set overlapGuard: false`
      )
    }
  }
}

if (existsSync(modulesTestRoot)) {
  const discovered = readdirSync(modulesTestRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  for (const dir of discovered) {
    if (registeredDirs.has(dir) || legacyDirs.has(dir)) continue
    errors.push(
      `unregistered test module "src/__tests__/modules/${dir}" — add to governed-features.manifest.json features[] (or legacyModuleDirs if pre-governance)`
    )
  }
}

if (!scripts['test:features']) {
  errors.push('package.json missing aggregate script "test:features"')
} else if (!scripts['test:features'].includes('run-governed-features.mjs')) {
  errors.push(`test:features must run "${FEATURES_RUNNER}" (manifest-driven aggregate)`)
}

const runnerPath = join(serverRoot, 'scripts', 'run-governed-features.mjs')
if (!existsSync(runnerPath)) {
  errors.push(`missing runner script: scripts/run-governed-features.mjs`)
}

if (errors.length > 0 || warnings.length > 0) {
  fail(errors, warnings)
}

console.log(
  `Governed features OK (${manifest.features.length} registered, ${registeredDirs.size} module dirs, Level 5.5)`
)
