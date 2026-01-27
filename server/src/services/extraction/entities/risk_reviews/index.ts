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

function safeReviewId(date: string, riskId: string | undefined, index: number): string {
  const d = (date || '').replace(/[^0-9-]/g, '').slice(0, 10) || 'unknown'
  const r = (riskId || `i${index}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32)
  return `ra-${d}-${r}`
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
    const columnResult = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'risk_reviews'`
    )
    const columnSet = new Set(columnResult.rows.map(row => row.column_name))

    const pick = (opts: string[]) => opts.find(c => columnSet.has(c)) ?? null

    const reviewIdCol = pick(['review_id'])
    const reviewDateCol = pick(['review_date'])
    const reviewTypeCol = pick(['review_type'])
    const actionItemsCol = pick(['action_items', 'actions'])
    const reviewedByCol = pick(['reviewed_by', 'reviewer'])
    const keyFindingsCol = pick(['key_findings', 'notes'])
    const statusChangesCol = pick(['status_changes'])
    const sourceDocCol = pick(['source_document_id'])
    const createdByCol = pick(['created_by'])

    const columnOrder: Array<{ name: string; value: (e: RiskReview, index: number) => unknown }> = [
      { name: 'project_id', value: () => projectId }
    ]
    if (reviewIdCol) {
      columnOrder.push({
        name: reviewIdCol,
        value: (e, i) => safeReviewId(e.review_date || '', e.risk_id, i)
      })
    }
    if (reviewDateCol) {
      columnOrder.push({
        name: reviewDateCol,
        value: (e) => e.review_date || new Date().toISOString().split('T')[0]
      })
    }
    if (reviewTypeCol) columnOrder.push({ name: reviewTypeCol, value: () => 'ad_hoc' })
    if (actionItemsCol) columnOrder.push({ name: actionItemsCol, value: (e) => e.actions || [] })
    if (reviewedByCol) {
      columnOrder.push({
        name: reviewedByCol,
        value: (e) => (e.reviewer ? [e.reviewer] : [])
      })
    }
    if (keyFindingsCol) columnOrder.push({ name: keyFindingsCol, value: (e) => e.notes || null })
    if (statusChangesCol) {
      columnOrder.push({
        name: statusChangesCol,
        value: (e) => {
          if (!e.status_before && !e.status_after) return []
          return [{ old_status: e.status_before, new_status: e.status_after }]
        }
      })
    }
    if (sourceDocCol) columnOrder.push({ name: sourceDocCol, value: (e) => e.source_document_id || null })
    if (createdByCol) columnOrder.push({ name: createdByCol, value: () => userId })

    if (columnOrder.length <= 1) {
      throw new Error('risk_reviews table has no writable columns')
    }

    await client.query('DELETE FROM risk_reviews WHERE project_id = $1', [projectId])

    const values: unknown[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * columnOrder.length
      placeholders.push(
        columnOrder.map((_, i) => `$${offset + i + 1}`).join(', ')
      )
      columnOrder.forEach(col => values.push(col.value(e, index)))
    })

    await client.query(
      `INSERT INTO risk_reviews (${columnOrder.map(c => c.name).join(', ')})
       VALUES ${placeholders.map(p => `(${p})`).join(', ')}`,
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
