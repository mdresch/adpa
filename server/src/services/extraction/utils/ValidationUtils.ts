/**
 * Validation Utilities
 * 
 * Utilities for validating extraction outputs and comparing new vs legacy extractors.
 */

import { logger } from '../../../utils/logger'
import type { ExtractionResult } from '../base/ExtractionResult'

/**
 * Comparison result between two extraction outputs
 */
export interface ComparisonResult {
  /** Entity counts match (within tolerance) */
  countsMatch: boolean
  /** Count variance percentage */
  countVariance: number
  /** New extractor count */
  newCount: number
  /** Legacy extractor count */
  legacyCount: number
  /** Structure matches */
  structureMatches: boolean
  /** Source document resolution matches */
  sourceResolutionMatches: boolean
  /** Differences found */
  differences: string[]
  /** Overall match status */
  matches: boolean
}

/**
 * Compare extraction results from new vs legacy extractors
 */
export function compareExtractionResults<T>(
  newResult: ExtractionResult<T>,
  legacyResult: T[],
  entityType: string,
  tolerance: number = 0.1 // 10% default tolerance
): ComparisonResult {
  const differences: string[] = []
  
  // Compare counts
  const newCount = newResult.entities.length
  const legacyCount = legacyResult.length
  const maxCount = Math.max(newCount, legacyCount, 1)
  const countVariance = Math.abs(newCount - legacyCount) / maxCount
  const countsMatch = countVariance <= tolerance

  if (!countsMatch) {
    differences.push(
      `Count mismatch: new=${newCount}, legacy=${legacyCount}, variance=${(countVariance * 100).toFixed(1)}%`
    )
  }

  // Compare structure (check that all new entities have required fields)
  let structureMatches = true
  if (newCount > 0) {
    const firstEntity = newResult.entities[0] as any
    const requiredFields = ['source_document_id']
    
    for (const field of requiredFields) {
      if (!(field in firstEntity)) {
        structureMatches = false
        differences.push(`Missing required field: ${field}`)
      }
    }
  }

  // Compare source document resolution
  const newUnresolved = newResult.entities.filter(
    (entity: any) => !entity.source_document_id
  ).length
  const legacyUnresolved = legacyResult.filter(
    (entity: any) => !entity.source_document_id
  ).length
  const sourceResolutionMatches = newUnresolved === legacyUnresolved

  if (!sourceResolutionMatches) {
    differences.push(
      `Source resolution mismatch: new has ${newUnresolved} unresolved, legacy has ${legacyUnresolved} unresolved`
    )
  }

  const matches = countsMatch && structureMatches && sourceResolutionMatches

  logger.info(`[VALIDATION] Comparison for ${entityType}`, {
    matches,
    newCount,
    legacyCount,
    countVariance: (countVariance * 100).toFixed(1) + '%',
    differences: differences.length
  })

  return {
    countsMatch,
    countVariance,
    newCount,
    legacyCount,
    structureMatches,
    sourceResolutionMatches,
    differences,
    matches
  }
}

/**
 * Validate extraction result structure
 */
export function validateExtractionResult<T>(
  result: ExtractionResult<T>,
  entityType: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check that result has required structure
  if (!Array.isArray(result.entities)) {
    errors.push('Result.entities is not an array')
  }

  if (typeof result.rejectedCount !== 'number') {
    errors.push('Result.rejectedCount is not a number')
  }

  if (typeof result.skippedCount !== 'number') {
    errors.push('Result.skippedCount is not a number')
  }

  if (!result.stats) {
    errors.push('Result.stats is missing')
  } else {
    if (typeof result.stats.finalCount !== 'number') {
      errors.push('Result.stats.finalCount is not a number')
    }
  }

  // Validate entities have source_document_id
  const entitiesWithoutSource = result.entities.filter(
    (entity: any) => !entity.source_document_id
  )

  if (entitiesWithoutSource.length > 0) {
    errors.push(
      `${entitiesWithoutSource.length} entities missing source_document_id`
    )
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Generate comparison report
 */
export function generateComparisonReport(
  comparisons: Record<string, ComparisonResult>
): string {
  const lines: string[] = []
  lines.push('='.repeat(80))
  lines.push('EXTRACTION COMPARISON REPORT')
  lines.push('='.repeat(80))
  lines.push('')

  let totalEntities = 0
  let matchedEntities = 0

  for (const [entityType, comparison] of Object.entries(comparisons)) {
    totalEntities++
    if (comparison.matches) {
      matchedEntities++
    }

    lines.push(`Entity: ${entityType}`)
    lines.push(`  Status: ${comparison.matches ? '✅ MATCH' : '❌ MISMATCH'}`)
    lines.push(`  Counts: New=${comparison.newCount}, Legacy=${comparison.legacyCount}, Variance=${(comparison.countVariance * 100).toFixed(1)}%`)
    lines.push(`  Structure: ${comparison.structureMatches ? '✅' : '❌'}`)
    lines.push(`  Source Resolution: ${comparison.sourceResolutionMatches ? '✅' : '❌'}`)
    
    if (comparison.differences.length > 0) {
      lines.push(`  Differences:`)
      comparison.differences.forEach(diff => {
        lines.push(`    - ${diff}`)
      })
    }
    lines.push('')
  }

  lines.push('='.repeat(80))
  lines.push(`Summary: ${matchedEntities}/${totalEntities} entities match`)
  lines.push('='.repeat(80))

  return lines.join('\n')
}

