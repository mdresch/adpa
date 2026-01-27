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
    const columnResult = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'risk_metrics'`
    )
    const columnSet = new Set(columnResult.rows.map(row => row.column_name))

    const pickColumn = (options: string[]): string | null => {
      for (const option of options) {
        if (columnSet.has(option)) {
          return option
        }
      }
      return null
    }

    const measurementDateColumn = pickColumn([
      'measurement_date',
      'report_date',
      'as_of_date',
      'recorded_at',
      'metric_date'
    ])
    const exposureIndexColumn = pickColumn([
      'exposure_index',
      'risk_exposure_index',
      'exposure_score'
    ])
    const newRisksColumn = pickColumn(['new_risks', 'new_risk_count'])
    const closedRisksColumn = pickColumn(['closed_risks', 'closed_risk_count'])
    const trendColumn = pickColumn(['trend', 'trend_direction'])
    const topCategoriesColumn = pickColumn(['top_categories', 'categories', 'risk_categories'])
    const notesColumn = pickColumn(['notes', 'commentary', 'details'])
    const sourceDocumentColumn = pickColumn(['source_document_id'])
    const createdByColumn = pickColumn(['created_by'])

    const columnOrder: Array<{ name: string; value: (entity: RiskMetric) => any }> = [
      { name: 'project_id', value: () => projectId }
    ]

    if (measurementDateColumn) {
      columnOrder.push({
        name: measurementDateColumn,
        value: (e) => e.measurement_date || new Date().toISOString().split('T')[0]
      })
    }
    if (exposureIndexColumn) {
      columnOrder.push({ name: exposureIndexColumn, value: (e) => e.exposure_index ?? null })
    }
    if (newRisksColumn) {
      columnOrder.push({ name: newRisksColumn, value: (e) => e.new_risks ?? null })
    }
    if (closedRisksColumn) {
      columnOrder.push({ name: closedRisksColumn, value: (e) => e.closed_risks ?? null })
    }
    if (trendColumn) {
      columnOrder.push({ name: trendColumn, value: (e) => e.trend || null })
    }
    if (topCategoriesColumn) {
      columnOrder.push({ name: topCategoriesColumn, value: (e) => e.top_categories || [] })
    }
    if (notesColumn) {
      columnOrder.push({ name: notesColumn, value: (e) => e.notes || null })
    }
    if (sourceDocumentColumn) {
      columnOrder.push({ name: sourceDocumentColumn, value: (e) => e.source_document_id || null })
    }
    if (createdByColumn) {
      columnOrder.push({ name: createdByColumn, value: () => userId })
    }

    if (columnOrder.length === 0) {
      throw new Error('risk_metrics table has no writable columns')
    }

    await client.query('DELETE FROM risk_metrics WHERE project_id = $1', [projectId])

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * columnOrder.length
      const rowPlaceholders = columnOrder.map((_, columnIndex) => `$${offset + columnIndex + 1}`)
      placeholders.push(`(${rowPlaceholders.join(', ')})`)
      columnOrder.forEach(column => {
        values.push(column.value(e))
      })
    })

    await client.query(
      `INSERT INTO risk_metrics (${columnOrder.map(col => col.name).join(', ')})
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
