import assert from 'node:assert/strict'
import {
  computeComplexityScore,
  estimateManualDocumentEffort,
  formatContextCompactionSummary,
  formatProcessingTimeDisplay,
  parseDurationToMs,
  parseMetricNumber,
  resolveContextCompactionTiers,
  resolveEffectiveProcessingTimeMs,
  resolveGenerationJobId,
  resolveProcessingTimeMs,
  resolveProcessingTimeMsFromJob,
  resolveWordCount,
} from './generationMetadataMetrics.ts'

assert.equal(parseMetricNumber('18,662'), 18662)
assert.equal(parseMetricNumber(18662), 18662)

assert.equal(
  resolveWordCount({
    word_count: 18662,
    generation_metadata: { contentMetrics: { wordCount: 100 } },
  }),
  18662
)

assert.equal(
  resolveWordCount({
    generation_metadata: { contentMetrics: { wordCount: 18662 } },
  }),
  18662
)

assert.equal(parseDurationToMs('165.42s'), 165420)
assert.equal(
  resolveProcessingTimeMs({ generation: { duration: 165 } }),
  165000
)
assert.equal(
  resolveProcessingTimeMs({ generation: { duration: 5000 } }),
  5000
)

assert.equal(
  resolveProcessingTimeMs({
    aiProcessing: { processingTimeMs: 1, processingTime: '165.42s' },
  }),
  165420
)

assert.equal(
  resolveProcessingTimeMs({
    aiProcessing: { processingTimeMs: 1 },
  }),
  null
)

assert.equal(
  resolveGenerationJobId({ generation: { job_id: '835863d2-3823-4306-8a61-1b274a13cd0e' } }),
  '835863d2-3823-4306-8a61-1b274a13cd0e'
)
assert.equal(
  resolveGenerationJobId({ job_id: '835863d2-3823-4306-8a61-1b274a13cd0e' }),
  '835863d2-3823-4306-8a61-1b274a13cd0e'
)

const jobStart = '2026-06-05T10:00:00.000Z'
const jobEnd = '2026-06-05T10:19:26.000Z'
assert.equal(
  resolveProcessingTimeMsFromJob({ started_at: jobStart, completed_at: jobEnd }),
  1_166_000
)

assert.equal(
  resolveEffectiveProcessingTimeMs(
    { aiProcessing: { processingTimeMs: 1 } },
    { started_at: jobStart, completed_at: jobEnd }
  ),
  1_166_000
)

assert.equal(formatProcessingTimeDisplay(1_166_000), '19m 26s')

const tiers = resolveContextCompactionTiers({
  p20: { summary: 'A'.repeat(200), timestamp: jobEnd },
  p40: { summary: 'B'.repeat(200), timestamp: jobEnd },
  p60: { summary: 'C'.repeat(200), timestamp: jobEnd },
  p80: { summary: 'D'.repeat(200), timestamp: jobEnd },
})
assert.equal(tiers.filter((t) => t.available).length, 4)
assert.equal(
  formatContextCompactionSummary(tiers),
  '20% · 40% · 60% · 80% summaries ready'
)

assert.equal(
  computeComplexityScore({
    storedScore: 65,
    wordCount: 18662,
    paragraphs: 10,
    sourceDocCount: 1,
    framework: 'PMBOK',
    overallQuality: 90,
  }),
  65
)

assert.equal(
  computeComplexityScore({
    wordCount: 18662,
    paragraphs: 10,
    sourceDocCount: 1,
    framework: 'PMBOK',
    overallQuality: 90,
  }),
  85
)

const effort = estimateManualDocumentEffort({
  outputWordCount: 18662,
  complexityScore: 65,
  sourceDocuments: [{ word_count: 500 }],
})
assert.ok(effort.compositionHours > 70)
assert.ok(effort.totalHours > 20)

console.log('generationMetadataMetrics smoke tests passed')
