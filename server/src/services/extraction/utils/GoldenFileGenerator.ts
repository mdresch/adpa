/**
 * Golden File Generator
 * 
 * Utilities for generating and comparing golden file outputs.
 * Golden files store expected extraction outputs for regression testing.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { logger } from '../../../utils/logger'
import type { ExtractionResult } from '../base/ExtractionResult'

const GOLDEN_DIR = join(__dirname, '../../../../__tests__/extraction/golden')

/**
 * Ensure golden directory exists
 */
function ensureGoldenDir(): void {
  if (!existsSync(GOLDEN_DIR)) {
    mkdirSync(GOLDEN_DIR, { recursive: true })
    logger.info(`[GOLDEN-FILE] Created golden directory: ${GOLDEN_DIR}`)
  }
}

/**
 * Save extraction result as golden file
 */
export function saveGoldenFile<T>(
  entityType: string,
  result: ExtractionResult<T>,
  metadata?: {
    projectId?: string
    documentCount?: number
    provider?: string
    model?: string
    timestamp?: string
  }
): void {
  ensureGoldenDir()

  const filename = `${entityType}.golden.json`
  const filepath = join(GOLDEN_DIR, filename)

  const goldenData = {
    entityType,
    metadata: {
      ...metadata,
      timestamp: metadata?.timestamp || new Date().toISOString(),
      version: '1.0'
    },
    result: {
      entityCount: result.entities.length,
      rejectedCount: result.rejectedCount,
      skippedCount: result.skippedCount,
      stats: result.stats,
      // Store sample entities (first 10) for structure validation
      sampleEntities: result.entities.slice(0, 10),
      // Store entity summaries (name/title fields only) for count validation
      entitySummaries: result.entities.map((entity: any) => ({
        id: entity.id || entity.name || entity.title || 'unknown',
        source_document_id: entity.source_document_id,
        // Include key identifying fields
        ...(entity.name && { name: entity.name }),
        ...(entity.title && { title: entity.title }),
        ...(entity.team_member && { team_member: entity.team_member })
      }))
    }
  }

  writeFileSync(filepath, JSON.stringify(goldenData, null, 2), 'utf-8')
  logger.info(`[GOLDEN-FILE] Saved golden file: ${filename}`, {
    entityCount: result.entities.length,
    filepath
  })
}

/**
 * Load golden file
 */
export function loadGoldenFile(entityType: string): any | null {
  const filename = `${entityType}.golden.json`
  const filepath = join(GOLDEN_DIR, filename)

  if (!existsSync(filepath)) {
    logger.warn(`[GOLDEN-FILE] Golden file not found: ${filename}`)
    return null
  }

  try {
    const content = readFileSync(filepath, 'utf-8')
    const goldenData = JSON.parse(content)
    logger.info(`[GOLDEN-FILE] Loaded golden file: ${filename}`, {
      entityCount: goldenData.result?.entityCount,
      timestamp: goldenData.metadata?.timestamp
    })
    return goldenData
  } catch (error: any) {
    logger.error(`[GOLDEN-FILE] Failed to load golden file: ${filename}`, {
      error: error.message
    })
    return null
  }
}

/**
 * Compare extraction result with golden file
 */
export function compareWithGoldenFile<T>(
  entityType: string,
  result: ExtractionResult<T>,
  tolerance: number = 0.1
): {
  matches: boolean
  differences: string[]
  goldenData: any | null
} {
  const goldenData = loadGoldenFile(entityType)

  if (!goldenData) {
    return {
      matches: false,
      differences: ['Golden file not found'],
      goldenData: null
    }
  }

  const differences: string[] = []
  const goldenCount = goldenData.result?.entityCount || 0
  const actualCount = result.entities.length
  const maxCount = Math.max(goldenCount, actualCount, 1)
  const variance = Math.abs(goldenCount - actualCount) / maxCount

  if (variance > tolerance) {
    differences.push(
      `Count mismatch: golden=${goldenCount}, actual=${actualCount}, variance=${(variance * 100).toFixed(1)}%`
    )
  }

  // Compare stats
  const goldenStats = goldenData.result?.stats
  const actualStats = result.stats

  if (goldenStats && actualStats) {
    if (goldenStats.finalCount !== actualStats.finalCount) {
      differences.push(
        `Final count mismatch: golden=${goldenStats.finalCount}, actual=${actualStats.finalCount}`
      )
    }
  }

  const matches = differences.length === 0

  logger.info(`[GOLDEN-FILE] Comparison for ${entityType}`, {
    matches,
    goldenCount,
    actualCount,
    variance: (variance * 100).toFixed(1) + '%',
    differences: differences.length
  })

  return {
    matches,
    differences,
    goldenData
  }
}

/**
 * List all golden files
 */
export function listGoldenFiles(): string[] {
  ensureGoldenDir()

  try {
    const { readdirSync } = require('fs')
    const files = readdirSync(GOLDEN_DIR)
    return files
      .filter((file: string) => file.endsWith('.golden.json'))
      .map((file: string) => file.replace('.golden.json', ''))
  } catch (error: any) {
    logger.error('[GOLDEN-FILE] Failed to list golden files', {
      error: error.message
    })
    return []
  }
}

