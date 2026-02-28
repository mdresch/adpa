/**
 * Capacity Forecasts Entity Module
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

export interface CapacityForecast {
  period?: string
  role?: string
  available_hours?: number | null
  demand_hours?: number | null
  forecasted_demand_hours?: number | null
  gap_hours?: number | null
  notes?: string
  source_document?: string
  source_document_id?: string
}

function normalizeIsoDate(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || /^yyyy-mm(-dd)?$/i.test(trimmed)) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`
  return null
}

export async function extractCapacityForecasts(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<CapacityForecast>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-CAPACITY-FORECASTS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'capacity_forecasts',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-CAPACITY-FORECASTS] ✅ Using cached result (${cached.length} entities)`)
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
  "capacity_forecasts": [
    {
      "period": "YYYY-MM",
      "role": "Role or skill group",
      "available_hours": 320,
      "demand_hours": 360,
      "gap_hours": 40,
      "notes": "Any capacity constraints or mitigation notes",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Include capacity forecasts by period and role',
      'Provide available and demand hours as numbers',
      'Include gap_hours when possible'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'capacity_forecasts',
      'capacity forecasts by period and role',
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
    const rawEntities = parsed.capacity_forecasts || []

    const normalized: CapacityForecast[] = rawEntities.map((entity: CapacityForecast) => ({
      ...entity,
      available_hours: coerceNumber(entity?.available_hours),
      demand_hours: coerceNumber(entity?.demand_hours ?? entity?.forecasted_demand_hours),
      forecasted_demand_hours: coerceNumber(entity?.forecasted_demand_hours ?? entity?.demand_hours),
      gap_hours: coerceNumber(entity?.gap_hours)
    }))

    const validEntities: CapacityForecast[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'CAPACITY-FORECASTS',
        entity.role || entity.period || 'Capacity Forecast'
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
        'capacity_forecasts',
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
    logger.error('[EXTRACTION-CAPACITY-FORECASTS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveCapacityForecasts(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: CapacityForecast[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM capacity_forecasts WHERE project_id = $1', [projectId])

    const columnResult = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'capacity_forecasts'`
    )

    const availableColumns = new Set<string>(
      columnResult.rows.map((row: { column_name: string }) => row.column_name)
    )

    const insertColumns = [
      'project_id',
      'period',
      'forecast_date',
      'role',
      'skill_level',
      'available_hours',
      'available_capacity_hours',
      'demand_hours',
      'forecasted_demand_hours',
      'gap_hours',
      'capacity_gap_hours',
      'utilization_forecast_pct',
      'notes',
      'assumptions',
      'mitigation_plan',
      'description',
      'source_document_id',
      'created_by'
    ].filter((column) => availableColumns.has(column))

    if (insertColumns.length === 0) {
      throw new Error('capacity_forecasts table has no expected columns for extraction insert')
    }

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * insertColumns.length
      placeholders.push(`(${insertColumns.map((_, i) => `$${offset + i + 1}`).join(', ')})`)

      const periodDate = normalizeIsoDate(e.period)
      const fallbackDate = new Date().toISOString().slice(0, 10)
      const demandHours = e.demand_hours ?? e.forecasted_demand_hours ?? 0
      const availableHours = e.available_hours ?? 0
      const gapHours = e.gap_hours ?? (availableHours - demandHours)
      const rowData: Record<string, any> = {
        project_id: projectId,
        period: e.period || null,
        forecast_date: periodDate || fallbackDate,
        role: e.role || 'General',
        skill_level: 'all',
        available_hours: availableHours,
        available_capacity_hours: availableHours,
        demand_hours: demandHours,
        forecasted_demand_hours: demandHours,
        gap_hours: gapHours,
        capacity_gap_hours: gapHours,
        utilization_forecast_pct: availableHours > 0 ? Math.max(0, Math.min(100, (demandHours / availableHours) * 100)) : null,
        notes: e.notes || null,
        assumptions: [],
        mitigation_plan: e.notes || null,
        description: e.notes || null,
        source_document_id: e.source_document_id || null,
        created_by: userId
      }

      insertColumns.forEach((column) => {
        values.push(rowData[column] ?? null)
      })
    })

    await client.query(
      `INSERT INTO capacity_forecasts (
        ${insertColumns.join(', ')}
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-CAPACITY-FORECASTS] Failed to save', {
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
