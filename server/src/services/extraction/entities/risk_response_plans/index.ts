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
    await client.query('DELETE FROM risk_response_plans WHERE project_id = $1', [projectId])

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 12
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`
      )

      values.push(
        projectId,
        e.risk_id || null,
        e.risk_title || null,
        e.strategy || null,
        e.actions || [],
        e.owner || null,
        e.due_date || null,
        e.status || null,
        e.cost_estimate ?? null,
        e.residual_risk || null,
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO risk_response_plans (
        project_id, risk_id, risk_title, strategy, actions, owner, due_date,
        status, cost_estimate, residual_risk, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}`,
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
