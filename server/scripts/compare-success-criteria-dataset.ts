import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
import { connectDatabase, getDatabasePool } from '../src/database/connection'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../.env') })
}

type ComparisonValueType = 'text' | 'number' | 'enum' | 'exact'

type GenericEntity = Record<string, unknown>

type ComparisonField = {
  name: string
  weight: number
  type: ComparisonValueType
}

type ComparisonProfile = {
  threshold: number
  fields: ComparisonField[]
}

type DatasetFile = {
  name: string
  version: string
  entity_type: string
  comparison_profile: ComparisonProfile
  expected: GenericEntity[]
}

type ComparedPair = {
  expected: GenericEntity
  actual: GenericEntity | null
  score: number
  score_breakdown: Record<string, number>
  status: 'matched' | 'missing'
}

type ComparisonReport = {
  dataset: { name: string; version: string }
  entity_type: string
  project_id: string
  generated_at: string
  threshold: number
  summary: {
    expected_count: number
    actual_count: number
    matched_count: number
    missing_count: number
    unexpected_count: number
    average_match_score: number
    coverage_pct: number
  }
  comparisons: ComparedPair[]
  unexpected_actual: GenericEntity[]
}

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  if (index < 0) return undefined
  return process.argv[index + 1]
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function asString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function normalizeText(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .replace(/[^a-z0-9%+\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string): Set<string> {
  const tokens = normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3)
  return new Set(tokens)
}

function jaccard(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (ta.size === 0 && tb.size === 0) return 1
  if (ta.size === 0 || tb.size === 0) return 0

  let intersection = 0
  for (const token of ta) {
    if (tb.has(token)) intersection += 1
  }
  const union = ta.size + tb.size - intersection
  return union === 0 ? 0 : intersection / union
}

function extractNumber(value: string): number | null {
  const match = normalizeText(value).match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function numberSimilarity(expected: string, actual: string): number {
  const expectedNum = extractNumber(expected)
  const actualNum = extractNumber(actual)
  if (expectedNum === null && actualNum === null) {
    return jaccard(expected, actual)
  }
  if (expectedNum === null || actualNum === null) {
    return 0
  }

  const maxVal = Math.max(Math.abs(expectedNum), Math.abs(actualNum), 1)
  const delta = Math.abs(expectedNum - actualNum) / maxVal
  return Math.max(0, 1 - delta)
}

function compareField(expectedValue: unknown, actualValue: unknown, type: ComparisonValueType): number {
  const expectedString = asString(expectedValue)
  const actualString = asString(actualValue)

  switch (type) {
    case 'number':
      return numberSimilarity(expectedString, actualString)
    case 'enum':
    case 'exact':
      return normalizeText(expectedString) === normalizeText(actualString) ? 1 : 0
    case 'text':
    default:
      return jaccard(expectedString, actualString)
  }
}

function compareOne(expected: GenericEntity, actual: GenericEntity, profile: ComparisonProfile) {
  const breakdown: Record<string, number> = {}
  const totalWeight = profile.fields.reduce((sum, field) => sum + field.weight, 0)
  if (totalWeight <= 0) {
    throw new Error('comparison_profile.fields must include positive weights')
  }

  let weightedScore = 0
  for (const field of profile.fields) {
    const score = compareField(expected[field.name], actual[field.name], field.type)
    breakdown[field.name] = Number(score.toFixed(4))
    weightedScore += score * field.weight
  }

  return {
    score: weightedScore / totalWeight,
    score_breakdown: breakdown,
  }
}

async function loadDataset(datasetPath: string): Promise<DatasetFile> {
  const content = await fs.readFile(datasetPath, 'utf8')
  const parsed = JSON.parse(content) as DatasetFile
  if (!Array.isArray(parsed.expected)) {
    throw new Error('Dataset expected[] is missing or invalid')
  }
  if (!parsed.comparison_profile || !Array.isArray(parsed.comparison_profile.fields) || parsed.comparison_profile.fields.length === 0) {
    throw new Error('Dataset comparison_profile.fields is missing or invalid')
  }
  return parsed
}

async function fetchActualSuccessCriteria(projectId: string): Promise<GenericEntity[]> {
  const pool = getDatabasePool()
  const result = await pool.query(
    `SELECT
      sc.title,
      sc.description,
      sc.metric,
      COALESCE(sc.target_value::text, '') as target_value,
      COALESCE(sc.measurement_method, '') as measurement_method,
      COALESCE(sc.priority, 'medium') as priority,
      d.name as source_document
    FROM success_criteria sc
    LEFT JOIN documents d ON d.id = sc.source_document_id
    WHERE sc.project_id = $1
    ORDER BY sc.created_at ASC, sc.title ASC`,
    [projectId]
  )

  return result.rows.map((row: any) => ({
    title: row.title || '',
    description: row.description || '',
    metric: row.metric || '',
    target_value: row.target_value || '',
    measurement_method: row.measurement_method || '',
    priority: row.priority || 'medium',
    source_document: row.source_document || undefined,
  }))
}

async function fetchActualFromDb(projectId: string, entityType: string): Promise<GenericEntity[]> {
  switch (entityType) {
    case 'success_criteria':
      return fetchActualSuccessCriteria(projectId)
    default:
      throw new Error(`Unsupported entity_type for DB source: ${entityType}`)
  }
}

async function fetchActualFromJson(filePath: string): Promise<GenericEntity[]> {
  const content = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(content)

  if (Array.isArray(parsed)) {
    return parsed as GenericEntity[]
  }

  if (parsed && Array.isArray(parsed.actual)) {
    return parsed.actual as GenericEntity[]
  }

  if (parsed && Array.isArray(parsed.success_criteria)) {
    return parsed.success_criteria as GenericEntity[]
  }

  throw new Error('Actual JSON must be an array or contain actual[] or success_criteria[]')
}

function matchCriteria(expected: GenericEntity[], actual: GenericEntity[], threshold: number, profile: ComparisonProfile): ComparisonReport {
  const usedActual = new Set<number>()
  const comparisons: ComparedPair[] = []

  for (const expectedItem of expected) {
    let bestIndex = -1
    let bestScore = -1
    let bestBreakdown: ComparedPair['score_breakdown'] = {}

    for (let index = 0; index < actual.length; index++) {
      if (usedActual.has(index)) continue
      const current = compareOne(expectedItem, actual[index], profile)
      if (current.score > bestScore) {
        bestScore = current.score
        bestIndex = index
        bestBreakdown = current.score_breakdown
      }
    }

    if (bestIndex >= 0 && bestScore >= threshold) {
      usedActual.add(bestIndex)
      comparisons.push({
        expected: expectedItem,
        actual: actual[bestIndex],
        score: Number(bestScore.toFixed(4)),
        score_breakdown: bestBreakdown,
        status: 'matched',
      })
    } else {
      comparisons.push({
        expected: expectedItem,
        actual: null,
        score: Number(Math.max(bestScore, 0).toFixed(4)),
        score_breakdown: bestBreakdown,
        status: 'missing',
      })
    }
  }

  const unexpectedActual = actual.filter((_, index) => !usedActual.has(index))
  const matched = comparisons.filter((item) => item.status === 'matched')
  const average =
    matched.length > 0
      ? matched.reduce((sum, item) => sum + item.score, 0) / matched.length
      : 0

  return {
    dataset: { name: '', version: '' },
    entity_type: '',
    project_id: '',
    generated_at: new Date().toISOString(),
    threshold,
    summary: {
      expected_count: expected.length,
      actual_count: actual.length,
      matched_count: matched.length,
      missing_count: comparisons.length - matched.length,
      unexpected_count: unexpectedActual.length,
      average_match_score: Number(average.toFixed(4)),
      coverage_pct: expected.length > 0 ? Number(((matched.length / expected.length) * 100).toFixed(2)) : 0,
    },
    comparisons,
    unexpected_actual: unexpectedActual,
  }
}

async function main() {
  const projectId = getArg('--projectId')
  const datasetPathArg = getArg('--dataset')
  const actualJsonPathArg = getArg('--actual-json')
  const thresholdArg = getArg('--threshold')
  const writeReport = hasFlag('--write-report')
  const outputPathArg = getArg('--output')

  const datasetPath = datasetPathArg
    ? path.resolve(datasetPathArg)
    : path.resolve(__dirname, '../data/success-criteria-datasets/ideation-template.v1.json')

  const dataset = await loadDataset(datasetPath)
  const profileThreshold = dataset.comparison_profile.threshold
  const threshold = thresholdArg ? Number(thresholdArg) : profileThreshold
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
    throw new Error('--threshold must be a number > 0 and <= 1')
  }

  let actual: GenericEntity[] = []
  let effectiveProjectId = projectId || 'n/a'

  if (actualJsonPathArg) {
    actual = await fetchActualFromJson(path.resolve(actualJsonPathArg))
  } else {
    if (!projectId) {
      throw new Error('Missing required --projectId <uuid> when --actual-json is not provided')
    }
    await connectDatabase()
    actual = await fetchActualFromDb(projectId, dataset.entity_type)
  }

  const report = matchCriteria(dataset.expected, actual, threshold, dataset.comparison_profile)
  report.dataset = { name: dataset.name, version: dataset.version }
  report.entity_type = dataset.entity_type
  report.project_id = effectiveProjectId

  const outputJson = JSON.stringify(report, null, 2)
  console.log(outputJson)

  if (writeReport) {
    const defaultOutputPath = path.resolve(
      __dirname,
      `../reports/${dataset.entity_type}-comparison-${effectiveProjectId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    )
    const outputPath = outputPathArg ? path.resolve(outputPathArg) : defaultOutputPath
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, outputJson, 'utf8')
    console.error(`Report written to ${outputPath}`)
  }
}

main().catch((error) => {
  console.error(`[compare-success-criteria-dataset] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
