import type { ContentMetrics, GenerationMetadata } from '@/types/adpa'

/** Ignore sub-second timings — they are placeholders or clock skew, not real job duration. */
export const MIN_TRUSTED_PROCESSING_MS = 1_000

export interface DocumentMetricsSource {
  word_count?: number
  character_count?: number
  sentence_count?: number
  paragraph_count?: number
  generation_metadata?: GenerationMetadata & {
    wordCount?: number
    characterCount?: number
    sentenceCount?: number
    paragraphCount?: number
  }
}

export function parseMetricNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseInt(value.replace(/[^\d]/g, ''), 10)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function readContentMetric(
  cm: ContentMetrics | undefined,
  camel: keyof ContentMetrics,
  snake: keyof ContentMetrics
): number {
  if (!cm) return 0
  const record = cm as Record<string, unknown>
  return parseMetricNumber(record[camel as string] ?? record[snake as string])
}

export function resolveWordCount(doc: DocumentMetricsSource): number {
  if (doc.word_count && doc.word_count > 0) return doc.word_count
  const meta = doc.generation_metadata
  if (meta?.wordCount && meta.wordCount > 0) return meta.wordCount
  const fromMetrics = readContentMetric(meta?.contentMetrics, 'wordCount' as keyof ContentMetrics, 'words')
  return fromMetrics > 0 ? fromMetrics : 0
}

export function resolveCharacterCount(doc: DocumentMetricsSource): number {
  if (doc.character_count && doc.character_count > 0) return doc.character_count
  const meta = doc.generation_metadata
  if (meta?.characterCount && meta.characterCount > 0) return meta.characterCount
  const fromMetrics = readContentMetric(meta?.contentMetrics, 'characterCount' as keyof ContentMetrics, 'characters')
  return fromMetrics > 0 ? fromMetrics : 0
}

export function resolveSentenceCount(doc: DocumentMetricsSource): number {
  if (doc.sentence_count && doc.sentence_count > 0) return doc.sentence_count
  const meta = doc.generation_metadata
  if (meta?.sentenceCount && meta.sentenceCount > 0) return meta.sentenceCount
  return readContentMetric(meta?.contentMetrics, 'sentenceCount' as keyof ContentMetrics, 'sentences')
}

export function resolveParagraphCount(doc: DocumentMetricsSource): number {
  if (doc.paragraph_count && doc.paragraph_count > 0) return doc.paragraph_count
  const meta = doc.generation_metadata
  if (meta?.paragraphCount && meta.paragraphCount > 0) return meta.paragraphCount
  return readContentMetric(meta?.contentMetrics, 'paragraphCount' as keyof ContentMetrics, 'paragraphs')
}

export function resolveAvgWordsPerSentence(doc: DocumentMetricsSource): number | null {
  const cm = doc.generation_metadata?.contentMetrics
  if (cm) {
    const record = cm as Record<string, unknown>
    const avg = parseMetricNumber(record.avgWordsPerSentence ?? record.averageWordsPerSentence)
    if (avg > 0) return avg
  }
  const words = resolveWordCount(doc)
  const sentences = resolveSentenceCount(doc)
  if (words > 0 && sentences > 0) return Math.round(words / sentences)
  return null
}

export function resolveReadingTimeMinutes(doc: DocumentMetricsSource): number {
  const cm = doc.generation_metadata?.contentMetrics
  if (cm?.readingTime && cm.readingTime > 0) return cm.readingTime
  const wordCount = resolveWordCount(doc)
  if (wordCount <= 0) return 0
  return Math.round((wordCount / 250) * 10) / 10
}

/** Parse duration strings like "165.42s", "2m 30s", "165s". Returns ms or null. */
export function parseDurationToMs(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null

  const trimmed = value.trim()
  const minuteMatch = trimmed.match(/^(\d+)\s*m(?:\s*(\d+)\s*s)?$/i)
  if (minuteMatch) {
    const mins = parseInt(minuteMatch[1], 10)
    const secs = minuteMatch[2] ? parseInt(minuteMatch[2], 10) : 0
    return (mins * 60 + secs) * 1000
  }

  const secondMatch = trimmed.match(/^([\d.]+)\s*s(?:ec(?:ond)?s?)?$/i)
  if (secondMatch) {
    const secs = parseFloat(secondMatch[1])
    return Number.isFinite(secs) && secs > 0 ? Math.round(secs * 1000) : null
  }

  const asNumber = parseFloat(trimmed)
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber * 1000
  }

  return null
}

function parseLegacyDurationNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  // Milliseconds when already in ms range
  if (value >= MIN_TRUSTED_PROCESSING_MS) return value
  // Legacy routes stored seconds as small numbers
  const asMs = value * 1000
  return asMs >= MIN_TRUSTED_PROCESSING_MS ? asMs : null
}

export function resolveProcessingTimeMs(
  meta?: GenerationMetadata & { generation?: { duration?: number | string; durationFormatted?: string; job_id?: string } }
): number | null {
  if (!meta) return null

  const stringCandidates = [
    meta.aiProcessing?.processingTime,
    meta.generation?.durationFormatted,
  ]

  for (const candidate of stringCandidates) {
    const ms = parseDurationToMs(candidate)
    if (ms !== null && ms >= MIN_TRUSTED_PROCESSING_MS) return ms
  }

  const rawMs = meta.aiProcessing?.processingTimeMs
  if (typeof rawMs === 'number' && rawMs >= MIN_TRUSTED_PROCESSING_MS) return rawMs

  return parseLegacyDurationNumber(meta.generation?.duration)
}

export interface JobTimingSource {
  started_at?: string | null
  completed_at?: string | null
  created_at?: string | null
}

/** Wall-clock duration from a completed jobs row when metadata timing is missing or bogus. */
export function resolveProcessingTimeMsFromJob(job?: JobTimingSource | null): number | null {
  if (!job) return null
  const startRaw = job.started_at || job.created_at
  if (!startRaw) return null
  const startMs = new Date(startRaw).getTime()
  if (!Number.isFinite(startMs)) return null

  const endRaw = job.completed_at
  const endMs = endRaw ? new Date(endRaw).getTime() : Date.now()
  if (!Number.isFinite(endMs)) return null

  const durationMs = endMs - startMs
  return durationMs >= MIN_TRUSTED_PROCESSING_MS ? durationMs : null
}

export function resolveEffectiveProcessingTimeMs(
  meta?: GenerationMetadata & { generation?: { duration?: number | string; durationFormatted?: string; job_id?: string } },
  job?: JobTimingSource | null
): number | null {
  return resolveProcessingTimeMs(meta) ?? resolveProcessingTimeMsFromJob(job)
}

export function resolveGenerationJobId(
  meta?: GenerationMetadata & { generation?: { job_id?: string }; job_id?: string }
): string | null {
  const nested = meta?.generation?.job_id
  if (typeof nested === 'string' && nested.length > 0) return nested
  const topLevel = meta?.job_id
  return typeof topLevel === 'string' && topLevel.length > 0 ? topLevel : null
}

export const CONTEXT_COMPACTION_TIERS = [
  { key: 'p20', percent: 20, shortLabel: '20%', label: '20% Token-Optimized Capsule' },
  { key: 'p40', percent: 40, shortLabel: '40%', label: '40% Structural Boundary View' },
  { key: 'p60', percent: 60, shortLabel: '60%', label: '60% Governance Logic Baseline' },
  { key: 'p80', percent: 80, shortLabel: '80%', label: '80% High-Density Narrative' },
] as const

function isValidContextSnapshot(summary: unknown): boolean {
  if (typeof summary !== 'string') return false
  const trimmed = summary.trim()
  if (trimmed.length < 80) return false
  if (/^no \d+% snapshot available$/i.test(trimmed)) return false
  return true
}

export interface ContextCompactionTierStatus {
  key: string
  percent: number
  shortLabel: string
  label: string
  available: boolean
  summaryChars: number
}

export function resolveContextCompactionTiers(
  snapshots?: Record<string, { summary?: string; timestamp?: string | null }> | null
): ContextCompactionTierStatus[] {
  const map = snapshots ?? {}
  return CONTEXT_COMPACTION_TIERS.map((tier) => {
    const entry = map[tier.key]
    const summary = entry?.summary
    const available = isValidContextSnapshot(summary)
    return {
      key: tier.key,
      percent: tier.percent,
      shortLabel: tier.shortLabel,
      label: tier.label,
      available,
      summaryChars: available && typeof summary === 'string' ? summary.length : 0,
    }
  })
}

export function formatContextCompactionSummary(tiers: ContextCompactionTierStatus[]): string {
  const available = tiers.filter((t) => t.available)
  if (available.length === 0) return 'Not generated'
  if (available.length === tiers.length) return '20% · 40% · 60% · 80% summaries ready'
  return available.map((t) => t.shortLabel).join(' · ')
}

export function formatProcessingTimeDisplay(ms: number | null): string {
  if (ms === null || ms <= 0) return 'N/A'
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60_000)
  const secs = Math.round((ms % 60_000) / 1000)
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

export function calculateProductivityGain(manualHours: number, aiMs: number | null): number | null {
  if (!aiMs || aiMs < MIN_TRUSTED_PROCESSING_MS || manualHours <= 0) return null
  const aiHours = aiMs / 1000 / 60 / 60
  if (aiHours <= 0) return null
  const gain = manualHours / aiHours
  if (!Number.isFinite(gain) || gain < 1) return null
  return Math.min(Math.round(gain), 9_999)
}

export function calculateReadingRoi(manualHours: number, readingTimeMinutes: number): number | null {
  if (manualHours <= 0 || readingTimeMinutes <= 0) return null
  const roi = Math.round((manualHours * 60) / readingTimeMinutes)
  if (!Number.isFinite(roi) || roi < 1) return null
  return Math.min(roi, 9_999)
}

export interface ComplexityInputs {
  storedScore?: number
  wordCount: number
  paragraphs: number
  sourceDocCount: number
  framework?: string | null
  overallQuality?: number
}

export function computeComplexityScore(inputs: ComplexityInputs): number {
  if (typeof inputs.storedScore === 'number' && inputs.storedScore > 0) {
    return Math.min(100, Math.max(0, Math.round(inputs.storedScore)))
  }

  const { wordCount, paragraphs, sourceDocCount, framework, overallQuality = 0 } = inputs
  let complexity = 0

  if (wordCount > 5000) complexity += 30
  else if (wordCount > 3000) complexity += 25
  else if (wordCount > 1500) complexity += 20
  else if (wordCount > 800) complexity += 15
  else complexity += 10

  const avgWordsPerParagraph = paragraphs > 0 ? wordCount / paragraphs : 0
  if (avgWordsPerParagraph > 100) complexity += 25
  else if (avgWordsPerParagraph > 70) complexity += 20
  else if (avgWordsPerParagraph > 50) complexity += 15
  else complexity += 10

  if (sourceDocCount > 10) complexity += 20
  else if (sourceDocCount > 5) complexity += 15
  else if (sourceDocCount > 3) complexity += 10
  else if (sourceDocCount > 0) complexity += 5

  if (framework && framework !== 'Not specified') complexity += 15

  if (overallQuality > 85) complexity += 10
  else if (overallQuality > 70) complexity += 7
  else if (overallQuality > 50) complexity += 5

  return Math.min(100, Math.max(0, complexity))
}

export function resolveSourceDocuments(meta?: GenerationMetadata): unknown[] {
  if (!meta) return []
  return (
    meta.source_documentDatas ||
    meta.sourceDocuments ||
    meta.source_documents ||
    []
  )
}

export type ManualEffortLevel = 'Simple' | 'Moderate' | 'Complex' | 'Very Complex'

export interface ManualEffortEstimate {
  level: ManualEffortLevel
  complexityScore: number
  outputReadingMinutes: number
  /** Reading and synthesizing source/context material */
  contextResearchHours: number
  /** Drafting the output (typing + reasoning + structure) */
  compositionHours: number
  /** Review, edit, and polish pass */
  reviewHours: number
  totalHours: number
}

/** Expert governance/PM writing speed (words/hour), including thinking time — not raw typing. */
function expertCompositionWordsPerHour(complexityScore: number): number {
  if (complexityScore >= 76) return 120
  if (complexityScore >= 51) return 175
  if (complexityScore >= 26) return 280
  return 400
}

function resolveManualEffortLevel(complexityScore: number): ManualEffortLevel {
  if (complexityScore >= 76) return 'Very Complex'
  if (complexityScore >= 51) return 'Complex'
  if (complexityScore >= 26) return 'Moderate'
  return 'Simple'
}

function estimateSourceWordCount(
  sourceDocuments: Array<Record<string, unknown>>
): number {
  return sourceDocuments.reduce((sum, doc) => {
    const fromWords = parseMetricNumber(doc.word_count ?? doc.wordCount)
    if (fromWords > 0) return sum + fromWords
    const tokens = parseMetricNumber(doc.originalTokens)
    if (tokens > 0) return sum + Math.round(tokens * 0.75)
    const chars = parseMetricNumber(doc.character_count ?? doc.characterCount)
    if (chars > 0) return sum + Math.round(chars / 5)
    return sum
  }, 0)
}

/** Format hours for UI — switches to days from 8 h. */
export function formatEffortHours(hours: number): string {
  if (hours <= 0) return 'N/A'
  if (hours >= 8) {
    const days = Math.round((hours / 8) * 10) / 10
    return `${days} day${days === 1 ? '' : 's'}`
  }
  return `${Math.round(hours * 10) / 10} hour${hours === 1 ? '' : 's'}`
}

/** Format a min–max hour range for composition display. */
export function formatHourRange(minHours: number, maxHours: number): string {
  if (maxHours >= 16) {
    return `${formatEffortHours(minHours)}–${formatEffortHours(maxHours)}`
  }
  return `${Math.round(minHours * 10) / 10}–${Math.round(maxHours * 10) / 10} hours`
}

/**
 * Estimate how long an expert would need to produce this document manually:
 * context research + composition (typing & reasoning) + review.
 */
export function estimateManualDocumentEffort(options: {
  outputWordCount: number
  complexityScore: number
  sourceDocuments?: Array<Record<string, unknown>>
}): ManualEffortEstimate {
  const { outputWordCount, complexityScore } = options
  const sourceDocuments = options.sourceDocuments ?? []

  const outputReadingMinutes =
    outputWordCount > 0 ? Math.round((outputWordCount / 250) * 10) / 10 : 0
  const outputReadingHours = outputReadingMinutes / 60

  const sourceWords = estimateSourceWordCount(sourceDocuments)
  let contextResearchHours = 0
  if (sourceWords > 0) {
    // Slower than casual reading — note-taking and cross-referencing (~200 wpm)
    contextResearchHours = Math.round((sourceWords / 200 / 60) * 10) / 10
  } else if (outputReadingHours > 0) {
    // No source stats: assume background research ≈ 2× final doc reading time
    contextResearchHours = Math.round(outputReadingHours * 2 * 10) / 10
  }

  const wordsPerHour = expertCompositionWordsPerHour(complexityScore)
  const compositionHours =
    outputWordCount > 0
      ? Math.round((outputWordCount / wordsPerHour) * 10) / 10
      : 0

  const reviewHours =
    compositionHours > 0 ? Math.round(compositionHours * 0.15 * 10) / 10 : 0

  const totalHours =
    Math.round((contextResearchHours + compositionHours + reviewHours) * 10) / 10

  return {
    level: resolveManualEffortLevel(complexityScore),
    complexityScore,
    outputReadingMinutes,
    contextResearchHours,
    compositionHours,
    reviewHours,
    totalHours,
  }
}
