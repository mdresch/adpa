import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import { isValidUUID } from '../../base/Persistence'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'

export interface RiskTrigger {
  risk_id?: string
  risk_title?: string
  trigger_condition?: string
  threshold?: string
  indicator?: string
  response_action?: string
  monitoring_frequency?: string
  source_document?: string
  source_document_id?: string
  probability?: string
  impact?: string
}

export async function extractRiskTriggers(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<RiskTrigger>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RISK-TRIGGERS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'risk_triggers',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RISK-TRIGGERS] ✅ Using cached result (${cached.length} entities)`)
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
  "risk_triggers": [
    {
      "risk_id": "Risk identifier",
      "risk_title": "Risk title",
      "trigger_condition": "Condition that triggers the risk",
      "threshold": "Numeric or qualitative threshold",
      "indicator": "Early warning indicator",
      "response_action": "Action to take when triggered",
      "monitoring_frequency": "Daily|Weekly|Monthly",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'List risk triggers and early warning indicators',
      'Include thresholds when specified',
      'Capture response actions tied to triggers'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'risk_triggers',
      'risk triggers and early warning indicators',
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
    const rawEntities = parsed.risk_triggers || []

    const validEntities: RiskTrigger[] = []
    rawEntities.forEach((entity: RiskTrigger) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'RISK-TRIGGERS',
        entity.risk_title || entity.risk_id || 'Risk Trigger'
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
        'risk_triggers',
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
        afterDeduplication: rawEntities.length,
        afterSourceResolution: validEntities.length,
        finalCount: validEntities.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RISK-TRIGGERS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

const PROB_IMPACT = new Set(['very_high', 'high', 'medium', 'low', 'very_low'])

function normalizeProbImpact(v: unknown): string | null {
  if (!v) return null
  const s = String(v).toLowerCase().trim().replace(/\s+/g, '_')
  if (PROB_IMPACT.has(s)) return s
  const map: Record<string, string> = {
    veryhigh: 'very_high', verylow: 'very_low'
  }
  return map[s] ?? null
}

export async function saveRiskTriggers(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: RiskTrigger[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    const columnResult = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'risk_triggers'`
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

    const riskIdColumn = pickColumn(['risk_id', 'risk_identifier'])
    const riskTitleColumn = pickColumn(['risk_title', 'risk_name', 'title'])
    const triggerConditionColumn = pickColumn(['trigger_condition', 'condition'])
    const thresholdColumn = pickColumn(['threshold', 'trigger_threshold'])
    const indicatorColumn = pickColumn(['indicator', 'warning_indicator'])
    const responseActionColumn = pickColumn(['response_action', 'action_taken', 'response_strategy'])
    const monitoringFreqColumn = pickColumn(['monitoring_frequency', 'frequency'])
    const sourceDocumentColumn = pickColumn(['source_document_id'])
    const createdByColumn = pickColumn(['created_by'])
    const probabilityColumn = pickColumn(['probability', 'likelihood'])
    const impactColumn = pickColumn(['impact'])

    const columnOrder: Array<{ name: string; value: (entity: RiskTrigger) => any }> = [
      { name: 'project_id', value: () => projectId }
    ]

    if (riskIdColumn) {
      columnOrder.push({ name: riskIdColumn, value: (e) => isValidUUID(e.risk_id) ? e.risk_id : null })
    }
    if (riskTitleColumn) {
      columnOrder.push({ name: riskTitleColumn, value: (e) => e.risk_title || null })
    }
    if (triggerConditionColumn) {
      columnOrder.push({ name: triggerConditionColumn, value: (e) => e.trigger_condition || null })
    }
    if (thresholdColumn) {
      columnOrder.push({ name: thresholdColumn, value: (e) => e.threshold || null })
    }
    if (indicatorColumn) {
      columnOrder.push({ name: indicatorColumn, value: (e) => e.indicator || null })
    }
    if (responseActionColumn) {
      columnOrder.push({ name: responseActionColumn, value: (e) => e.response_action || null })
    }
    if (monitoringFreqColumn) {
      columnOrder.push({ name: monitoringFreqColumn, value: (e) => e.monitoring_frequency || null })
    }
    if (sourceDocumentColumn) {
      columnOrder.push({ name: sourceDocumentColumn, value: (e) => e.source_document_id || null })
    }
    if (createdByColumn) {
      columnOrder.push({ name: createdByColumn, value: () => userId })
    }
    if (probabilityColumn) {
      columnOrder.push({ name: probabilityColumn, value: (e) => normalizeProbImpact(e.probability) })
    }
    if (impactColumn) {
      columnOrder.push({ name: impactColumn, value: (e) => normalizeProbImpact(e.impact) })
    }

    await client.query('DELETE FROM risk_triggers WHERE project_id = $1', [projectId])

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
      `INSERT INTO risk_triggers (${columnOrder.map(col => col.name).join(', ')})
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RISK-TRIGGERS] Failed to save', {
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
