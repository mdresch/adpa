/**
 * Risk Response Plans Entity Module
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

export interface RiskResponsePlan {
  risk_id?: string
  risk_title?: string
  strategy?: string
  actions?: string[]
  owner?: string
  due_date?: string
  status?: string
  cost_estimate?: number | null
  residual_risk?: string
  source_document?: string
  source_document_id?: string
}

export async function extractRiskResponsePlans(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<RiskResponsePlan>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RISK-RESPONSE-PLANS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'risk_response_plans',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RISK-RESPONSE-PLANS] ✅ Using cached result (${cached.length} entities)`)
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
  "risk_response_plans": [
    {
      "risk_id": "Risk identifier",
      "risk_title": "Risk title",
      "strategy": "Avoid|Mitigate|Transfer|Accept",
      "actions": ["Action 1", "Action 2"],
      "owner": "Owner name or role",
      "due_date": "YYYY-MM-DD",
      "status": "planned|in_progress|completed",
      "cost_estimate": 5000,
      "residual_risk": "Residual risk summary",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Include response strategy and concrete actions',
      'Identify owners and due dates when available',
      'Provide cost estimates when mentioned'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'risk_response_plans',
      'risk response plans with actions and owners',
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
    const rawEntities = parsed.risk_response_plans || []

    const normalized: RiskResponsePlan[] = rawEntities.map((entity: RiskResponsePlan) => ({
      ...entity,
      actions: coerceArray<string>(entity?.actions),
      cost_estimate: coerceNumber(entity?.cost_estimate)
    }))

    const validEntities: RiskResponsePlan[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'RISK-RESPONSE-PLANS',
        entity.risk_title || entity.risk_id || 'Risk Response Plan'
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
        'risk_response_plans',
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
    logger.error('[EXTRACTION-RISK-RESPONSE-PLANS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

const RESPONSE_STRATEGY = new Set([
  'avoid', 'mitigate', 'transfer', 'accept', 'exploit', 'enhance', 'share'
])

function normalizeStrategy(v: unknown): string {
  if (!v) return 'accept'
  const s = String(v).toLowerCase().trim()
  if (RESPONSE_STRATEGY.has(s)) return s
  const map: Record<string, string> = {
    avoid: 'avoid', mitigate: 'mitigate', mitigation: 'mitigate',
    transfer: 'transfer', accept: 'accept', exploit: 'exploit',
    enhance: 'enhance', share: 'share'
  }
  return map[s] ?? 'accept'
}

export async function saveRiskResponsePlans(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: RiskResponsePlan[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    const columnResult = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'risk_response_plans'`
    )
    const columnSet = new Set(columnResult.rows.map(row => row.column_name))

    const pick = (opts: string[]) => opts.find(c => columnSet.has(c)) ?? null

    const strategyCol = pick(['response_strategy', 'strategy'])
    const actionsCol = pick(['response_actions', 'actions'])
    const ownerCol = pick(['responsible_party', 'owner'])
    const deadlineCol = pick(['deadline', 'due_date'])
    const costCol = pick(['cost_estimate'])
    const statusCol = pick(['status'])
    const residualCol = pick(['residual_risk_level', 'residual_risk'])
    const riskIdCol = pick(['risk_id'])
    const sourceDocCol = pick(['source_document_id'])
    const createdByCol = pick(['created_by'])

    const columnOrder: Array<{ name: string; value: (e: RiskResponsePlan) => unknown }> = [
      { name: 'project_id', value: () => projectId }
    ]
    if (strategyCol) {
      columnOrder.push({
        name: strategyCol,
        value: (e) => normalizeStrategy(e.strategy)
      })
    }
    if (actionsCol) {
      columnOrder.push({
        name: actionsCol,
        value: (e) => {
          const a = e.actions
          if (Array.isArray(a) && a.length > 0) return a
          return ['(none)']
        }
      })
    }
    if (ownerCol) columnOrder.push({ name: ownerCol, value: (e) => e.owner || null })
    if (deadlineCol) columnOrder.push({ name: deadlineCol, value: (e) => e.due_date || null })
    if (costCol) columnOrder.push({ name: costCol, value: (e) => e.cost_estimate ?? null })
    if (statusCol) columnOrder.push({ name: statusCol, value: (e) => e.status || null })
    if (residualCol) {
      columnOrder.push({
        name: residualCol,
        value: (e) => {
          const v = e.residual_risk
          if (!v) return null
          const s = String(v).toLowerCase().replace(/\s+/g, '_')
          const allowed = ['very_high', 'high', 'medium', 'low', 'very_low']
          if (allowed.includes(s)) return s
          if (['veryhigh', 'very_high'].includes(s)) return 'very_high'
          if (['verylow', 'very_low'].includes(s)) return 'very_low'
          return null
        }
      })
    }
    if (riskIdCol) {
      columnOrder.push({
        name: riskIdCol,
        value: (e) => {
          const v = e.risk_id
          if (!v) return null
          const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          return typeof v === 'string' && uuid.test(v) ? v : null
        }
      })
    }
    if (sourceDocCol) columnOrder.push({ name: sourceDocCol, value: (e) => e.source_document_id || null })
    if (createdByCol) columnOrder.push({ name: createdByCol, value: () => userId })

    if (columnOrder.length <= 1) {
      throw new Error('risk_response_plans table has no writable columns')
    }

    await client.query('DELETE FROM risk_response_plans WHERE project_id = $1', [projectId])

    const values: unknown[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * columnOrder.length
      placeholders.push(
        columnOrder.map((_, i) => `$${offset + i + 1}`).join(', ')
      )
      columnOrder.forEach(col => values.push(col.value(e)))
    })

    await client.query(
      `INSERT INTO risk_response_plans (${columnOrder.map(c => c.name).join(', ')})
       VALUES ${placeholders.map(p => `(${p})`).join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RISK-RESPONSE-PLANS] Failed to save', {
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
