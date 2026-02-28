/**
 * Cost Actuals Entity Module
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
import { randomUUID } from 'crypto'

function isUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export interface CostActual {
  cost_actual_id?: string
  period?: string
  category?: string
  wbs_code?: string
  planned_amount?: number | null
  actual_amount?: number | null
  variance?: number | null
  variance_pct?: number | null
  cumulative_actual?: number | null
  source_document?: string
  source_document_id?: string
}

export async function extractCostActuals(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<CostActual>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-COST-ACTUALS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'cost_actuals',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-COST-ACTUALS] ✅ Using cached result (${cached.length} entities)`)
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
  "cost_actuals": [
    {
      "period": "YYYY-MM or YYYY-MM-DD",
      "category": "Labor|Materials|Software|Equipment|Overhead",
      "wbs_code": "1.2.3",
      "planned_amount": 10000,
      "actual_amount": 12000,
      "variance": 2000,
      "variance_pct": 20,
      "cumulative_actual": 45000,
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Extract actual costs by period and category',
      'Include WBS codes when provided',
      'Compute variance and variance_pct if both planned and actual are present',
      'Use numbers for all amounts'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'cost_actuals',
      'cost actuals by period and category',
      jsonStructure,
      requirements
    )

    const response = await aiService.generateWithFallback(
      {
        prompt,
        provider: context.provider,
        model: context.model,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxTokens ?? 4000
      },
      ['openai', 'google', 'anthropic']
    )

    const parsed = parseAIResponse(response.content)
    const rawEntities = parsed.cost_actuals || []

    const normalized: CostActual[] = rawEntities.map((entity: CostActual) => ({
      ...entity,
      planned_amount: coerceNumber(entity?.planned_amount),
      actual_amount: coerceNumber(entity?.actual_amount),
      variance: coerceNumber(entity?.variance),
      variance_pct: coerceNumber(entity?.variance_pct),
      cumulative_actual: coerceNumber(entity?.cumulative_actual)
    }))

    const validEntities: CostActual[] = []

    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'COST-ACTUALS',
        entity.category || 'Cost Actual'
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
        'cost_actuals',
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
    logger.error('[EXTRACTION-COST-ACTUALS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveCostActuals(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: CostActual[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM cost_actuals WHERE project_id = $1', [projectId])

    const columnResult = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'cost_actuals'`
    )

    const availableColumns = new Set<string>(
      columnResult.rows.map((row: { column_name: string }) => row.column_name)
    )

    const insertColumns = [
      'cost_actual_id',
      'id',
      'project_id',
      'period',
      'period_label',
      'reporting_period',
      'cost_date',
      'actual_date',
      'period_start_date',
      'period_end_date',
      'period_start',
      'period_end',
      'category',
      'wbs_code',
      'planned_amount',
      'actual_amount',
      'variance',
      'variance_pct',
      'cumulative_actual',
      'source_document_id',
      'created_by'
    ].filter((column) => availableColumns.has(column))

    if (insertColumns.length === 0) {
      throw new Error('cost_actuals table has no expected columns for extraction insert')
    }

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * insertColumns.length
      placeholders.push(`(${insertColumns.map((_, i) => `$${offset + i + 1}`).join(', ')})`)

      const generatedId = randomUUID()
      const fallbackDate = new Date().toISOString().slice(0, 10)
      const normalizedPeriodDate = e.period && /^\d{4}-\d{2}-\d{2}$/.test(e.period)
        ? e.period
        : e.period && /^\d{4}-\d{2}$/.test(e.period)
          ? `${e.period}-01`
          : fallbackDate

      const plannedAmount = e.planned_amount ?? null
      const actualAmount = e.actual_amount ?? plannedAmount ?? e.cumulative_actual ?? 0
      const varianceAmount = e.variance ?? (plannedAmount !== null ? actualAmount - plannedAmount : null)
      const variancePct =
        e.variance_pct ??
        (plannedAmount && plannedAmount !== 0 && varianceAmount !== null
          ? (varianceAmount / plannedAmount) * 100
          : null)
      const cumulativeActual = e.cumulative_actual ?? actualAmount

      const rowData: Record<string, any> = {
        cost_actual_id: e.cost_actual_id || generatedId,
        id: generatedId,
        project_id: projectId,
        period: e.period || null,
        period_label: e.period || null,
        reporting_period: e.period || null,
        cost_date: normalizedPeriodDate,
        actual_date: normalizedPeriodDate,
        period_start_date: normalizedPeriodDate,
        period_end_date: normalizedPeriodDate,
        period_start: normalizedPeriodDate,
        period_end: normalizedPeriodDate,
        category: e.category || null,
        wbs_code: e.wbs_code || null,
        planned_amount: plannedAmount,
        actual_amount: actualAmount,
        variance: varianceAmount,
        variance_pct: variancePct,
        cumulative_actual: cumulativeActual,
        source_document_id: isUuid(e.source_document_id) ? e.source_document_id : null,
        created_by: userId
      }

      insertColumns.forEach((column) => {
        values.push(rowData[column] ?? null)
      })
    })

    await client.query(
      `INSERT INTO cost_actuals (
        ${insertColumns.join(', ')}
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-COST-ACTUALS] Failed to save', {
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
