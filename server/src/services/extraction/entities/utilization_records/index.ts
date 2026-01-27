/**
 * Utilization Records Entity Module
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'

export interface UtilizationRecord {
  resource_id?: string
  resource_name?: string
  period?: string
  planned_utilization_pct?: number | null
  actual_utilization_pct?: number | null
  variance_pct?: number | null
  notes?: string
  source_document?: string
  source_document_id?: string
}

export async function extractUtilizationRecords(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<UtilizationRecord>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-UTILIZATION-RECORDS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'utilization_records',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-UTILIZATION-RECORDS] ✅ Using cached result (${cached.length} entities)`)
      return {
        entities: cached,
        rejectedCount: 0,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: cached.length,
          finalCount: cached.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    const jsonStructure = `{
  "utilization_records": [
    {
      "resource_id": "Resource ID",
      "resource_name": "Resource name",
      "period": "YYYY-MM",
      "planned_utilization_pct": 80,
      "actual_utilization_pct": 92,
      "variance_pct": 12,
      "notes": "Context about utilization variance",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Provide planned vs actual utilization percentages',
      'Include variance_pct when possible',
      'Include period and resource details'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'utilization_records',
      'resource utilization records with variances',
      jsonStructure,
      requirements
    )

    const response = await aiService.generateWithFallback(
      {
        prompt,
        provider: context.provider,
        model: context.model,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 4000
      },
      ['openai', 'google', 'anthropic']
    )

    const parsed = parseAIResponse(response.content)
    const rawEntities = parsed.utilization_records || []

    const normalized: UtilizationRecord[] = rawEntities.map((entity: UtilizationRecord) => ({
      ...entity,
      planned_utilization_pct: coerceNumber(entity?.planned_utilization_pct),
      actual_utilization_pct: coerceNumber(entity?.actual_utilization_pct),
      variance_pct: coerceNumber(entity?.variance_pct)
    }))

    const validEntities: UtilizationRecord[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'UTILIZATION-RECORDS',
        entity.resource_name || entity.resource_id || 'Utilization Record'
      )

      if (resolution.resolved) {
        validEntities.push(entity)
      } else {
        rejectedCount++
      }
    })

    if (validEntities.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'utilization_records',
        validEntities,
        context.provider,
        context.model
      )
    }

    return {
      entities: validEntities,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted: rawEntities.length,
        afterDeduplication: normalized.length,
        afterSourceResolution: validEntities.length,
        finalCount: validEntities.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-UTILIZATION-RECORDS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveUtilizationRecords(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: UtilizationRecord[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM utilization_records WHERE project_id = $1', [projectId])

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 10
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
      )

      values.push(
        projectId,
        e.resource_id || null,
        e.resource_name || null,
        e.period || null,
        e.planned_utilization_pct ?? null,
        e.actual_utilization_pct ?? null,
        e.variance_pct ?? null,
        e.notes || null,
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO utilization_records (
        project_id, resource_id, resource_name, period, planned_utilization_pct,
        actual_utilization_pct, variance_pct, notes, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-UTILIZATION-RECORDS] Failed to save', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      saved: 0,
      skipped: 0,
      failed: entities.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
