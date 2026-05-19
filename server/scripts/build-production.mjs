import { build } from 'esbuild'
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs'
import { extname, join, relative, resolve, sep } from 'path'
import { fileURLToPath } from 'url'

const scriptDir = fileURLToPath(new URL('.', import.meta.url))
const serverDir = resolve(scriptDir, '..')
const workspaceRoot = resolve(serverDir, '..')
const outdir = resolve(serverDir, 'dist')

const sourceRoots = [
  resolve(serverDir, 'src'),
  resolve(workspaceRoot, 'lib'),
  resolve(workspaceRoot, 'types'),
]

const ignoredSegments = new Set([
  '__tests__',
  'tests',
  'examples',
  'dist',
  'node_modules',
])

const ignoredFilePatterns = [
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  '.benchmark.ts',
  '.d.ts',
]

const ignoredWorkspacePrefixes = [
  'lib/analytics/',
  'server/src/components/',
  'server/src/contexts/',
  'server/src/hooks/',
  'server/src/pages/',
]

function toWorkspacePath(filePath) {
  return relative(workspaceRoot, filePath).split(sep).join('/')
}

function shouldSkipPath(filePath) {
  const workspacePath = toWorkspacePath(filePath)
  const parts = workspacePath.split('/')

  return (
    ignoredWorkspacePrefixes.some((prefix) => workspacePath.startsWith(prefix)) ||
    parts.some((part) => ignoredSegments.has(part)) ||
    ignoredFilePatterns.some((pattern) => filePath.endsWith(pattern))
  )
}

function collectEntryPoints(directory) {
  const entries = []

  for (const child of readdirSync(directory)) {
    const childPath = join(directory, child)
    const childStat = statSync(childPath)

    if (shouldSkipPath(childPath)) {
      continue
    }

    if (childStat.isDirectory()) {
      entries.push(...collectEntryPoints(childPath))
      continue
    }

    if (childStat.isFile() && ['.ts', '.tsx'].includes(extname(childPath))) {
      entries.push(childPath)
    }
  }

  return entries
}

function collectAssetFiles(directory) {
  const entries = []

  for (const child of readdirSync(directory)) {
    const childPath = join(directory, child)
    const childStat = statSync(childPath)

    if (shouldSkipPath(childPath)) {
      continue
    }

    if (childStat.isDirectory()) {
      entries.push(...collectAssetFiles(childPath))
      continue
    }

    if (childStat.isFile() && extname(childPath) === '.json') {
      entries.push(childPath)
    }
  }

  return entries
}

function copyAssets(files) {
  for (const file of files) {
    const outputFile = resolve(outdir, relative(workspaceRoot, file))

    mkdirSync(resolve(outputFile, '..'), { recursive: true })
    copyFileSync(file, outputFile)
  }
}

function getOutputKey(filePath) {
  const relativePath = relative(workspaceRoot, filePath)

  return relativePath.replace(/\.(tsx?|jsx?)$/, '.js')
}

function preferSourceFile(existingPath, candidatePath) {
  const extensionPriority = {
    '.ts': 0,
    '.tsx': 1,
  }

  return (
    extensionPriority[extname(candidatePath)] <
    extensionPriority[extname(existingPath)]
  )
}

function dedupeEntryPoints(entries) {
  const entriesByOutput = new Map()

  for (const entry of entries) {
    const outputKey = getOutputKey(entry)
    const existing = entriesByOutput.get(outputKey)

    if (!existing || preferSourceFile(existing, entry)) {
      entriesByOutput.set(outputKey, entry)
    }
  }

  return [...entriesByOutput.values()]
}

const entryPoints = dedupeEntryPoints(
  sourceRoots.flatMap((root) => collectEntryPoints(root))
)

if (entryPoints.length === 0) {
  throw new Error('No backend production source files found to build')
}

rmSync(outdir, { force: true, recursive: true })

await build({
  entryPoints,
  outbase: workspaceRoot,
  outdir,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  bundle: false,
  tsconfig: resolve(serverDir, 'tsconfig.json'),
  sourcemap: false,
  logLevel: 'info',
})

copyAssets(sourceRoots.flatMap((root) => collectAssetFiles(root)))
