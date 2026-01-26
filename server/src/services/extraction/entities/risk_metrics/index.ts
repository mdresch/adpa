/**
 * Risk Metrics Entity Module
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceArray, coerceNumber } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'

export interface RiskMetric {
  measurement_date?: string
  exposure_index?: number | null
  new_risks?: number | null
  closed_risks?: number | null
  trend?: string
  top_categories?: string[]
  notes?: string
  source_document?: string
  source_document_id?: string
}

export async function extractRiskMetrics(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<RiskMetric>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RISK-METRICS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'risk_metrics',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RISK-METRICS] ✅ Using cached result (${cached.length} entities)`)
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
  "risk_metrics": [
    {
      "measurement_date": "YYYY-MM-DD",
      "exposure_index": 0.42,
      "new_risks": 3,
      "closed_risks": 1,
      "trend": "improving|stable|declining",
      "top_categories": ["Schedule", "Technical"],
      "notes": "Context for risk metrics",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Include exposure index and trend when provided',
      'Capture new and closed risk counts',
      'List top risk categories if mentioned'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'risk_metrics',
      'risk metrics and trend indicators',
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
    const rawEntities = parsed.risk_metrics || []

    const normalized: RiskMetric[] = rawEntities.map((entity: RiskMetric) => ({
      ...entity,
      exposure_index: coerceNumber(entity?.exposure_index),
      new_risks: coerceNumber(entity?.new_risks),
      closed_risks: coerceNumber(entity?.closed_risks),
      top_categories: coerceArray<string>(entity?.top_categories)
    }))

    const validEntities: RiskMetric[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'RISK-METRICS',
        entity.measurement_date || 'Risk Metrics'
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
        'risk_metrics',
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
    logger.error('[EXTRACTION-RISK-METRICS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveRiskMetrics(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: RiskMetric[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM risk_metrics WHERE project_id = $1', [projectId])

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 10
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
      )

      values.push(
        projectId,
        e.measurement_date || null,
        e.exposure_index ?? null,
        e.new_risks ?? null,
        e.closed_risks ?? null,
        e.trend || null,
        e.top_categories || [],
        e.notes || null,
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO risk_metrics (
        project_id, measurement_date, exposure_index, new_risks, closed_risks,
        trend, top_categories, notes, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RISK-METRICS] Failed to save', {
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
