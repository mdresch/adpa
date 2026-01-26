/**
 * Risk Reviews Entity Module
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceArray } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'

export interface RiskReview {
  review_date?: string
  risk_id?: string
  risk_title?: string
  status_before?: string
  status_after?: string
  actions?: string[]
  reviewer?: string
  notes?: string
  source_document?: string
  source_document_id?: string
}

export async function extractRiskReviews(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<RiskReview>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RISK-REVIEWS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'risk_reviews',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RISK-REVIEWS] ✅ Using cached result (${cached.length} entities)`)
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
  "risk_reviews": [
    {
      "review_date": "YYYY-MM-DD",
      "risk_id": "Risk identifier",
      "risk_title": "Risk title",
      "status_before": "Open|Mitigating|Closed",
      "status_after": "Open|Mitigating|Closed",
      "actions": ["Action 1", "Action 2"],
      "reviewer": "Reviewer name or role",
      "notes": "Review notes",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Capture review dates and status changes',
      'List follow-up actions when mentioned',
      'Include reviewer information if available'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'risk_reviews',
      'risk review records with status changes',
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
    const rawEntities = parsed.risk_reviews || []

    const normalized: RiskReview[] = rawEntities.map((entity: RiskReview) => ({
      ...entity,
      actions: coerceArray<string>(entity?.actions)
    }))

    const validEntities: RiskReview[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'RISK-REVIEWS',
        entity.risk_title || entity.risk_id || 'Risk Review'
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
        'risk_reviews',
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
    logger.error('[EXTRACTION-RISK-REVIEWS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveRiskReviews(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: RiskReview[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM risk_reviews WHERE project_id = $1', [projectId])

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 11
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
      )

      values.push(
        projectId,
        e.review_date || null,
        e.risk_id || null,
        e.risk_title || null,
        e.status_before || null,
        e.status_after || null,
        e.actions || [],
        e.reviewer || null,
        e.notes || null,
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO risk_reviews (
        project_id, review_date, risk_id, risk_title, status_before, status_after,
        actions, reviewer, notes, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RISK-REVIEWS] Failed to save', {
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
