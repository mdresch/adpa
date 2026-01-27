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

<<<<<<< HEAD
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
=======
    const pickColumn = (options: string[]): string | null => {
      for (const option of options) {
        if (columnSet.has(option)) {
          return option
        }
      }
      return null
    }

    const reviewDateColumn = pickColumn(['review_date', 'reviewed_at', 'review_timestamp'])
    const riskIdColumn = pickColumn(['risk_id', 'risk_identifier'])
    const riskTitleColumn = pickColumn(['risk_title', 'risk_name', 'title'])
    const statusBeforeColumn = pickColumn(['status_before', 'previous_status'])
    const statusAfterColumn = pickColumn(['status_after', 'current_status'])
    const actionsColumn = pickColumn(['actions', 'follow_up_actions'])
    const reviewerColumn = pickColumn(['reviewer', 'reviewed_by', 'reviewer_name'])
    const notesColumn = pickColumn(['notes', 'summary', 'review_notes'])
    const sourceDocumentColumn = pickColumn(['source_document_id'])
    const createdByColumn = pickColumn(['created_by'])

    const columnOrder: Array<{ name: string; value: (entity: RiskReview) => any }> = [
      { name: 'project_id', value: () => projectId }
    ]

    if (reviewDateColumn) {
      columnOrder.push({ name: reviewDateColumn, value: (e) => e.review_date || null })
    }
    if (riskIdColumn) {
      columnOrder.push({ name: riskIdColumn, value: (e) => e.risk_id || null })
    }
    if (riskTitleColumn) {
      columnOrder.push({ name: riskTitleColumn, value: (e) => e.risk_title || null })
    }
    if (statusBeforeColumn) {
      columnOrder.push({ name: statusBeforeColumn, value: (e) => e.status_before || null })
    }
    if (statusAfterColumn) {
      columnOrder.push({ name: statusAfterColumn, value: (e) => e.status_after || null })
    }
    if (actionsColumn) {
      columnOrder.push({ name: actionsColumn, value: (e) => e.actions || [] })
    }
    if (reviewerColumn) {
      columnOrder.push({ name: reviewerColumn, value: (e) => e.reviewer || null })
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
>>>>>>> 349abf3391101e9126a8b665d7784e535c158240
      throw new Error('risk_reviews table has no writable columns')
    }

    await client.query('DELETE FROM risk_reviews WHERE project_id = $1', [projectId])

    const values: unknown[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * columnOrder.length
<<<<<<< HEAD
      placeholders.push(
        columnOrder.map((_, i) => `$${offset + i + 1}`).join(', ')
      )
      columnOrder.forEach(col => values.push(col.value(e, index)))
    })

    await client.query(
      `INSERT INTO risk_reviews (${columnOrder.map(c => c.name).join(', ')})
       VALUES ${placeholders.map(p => `(${p})`).join(', ')}`,
=======
      const rowPlaceholders = columnOrder.map((_, columnIndex) => `$${offset + columnIndex + 1}`)
      placeholders.push(`(${rowPlaceholders.join(', ')})`)
      columnOrder.forEach(column => {
        values.push(column.value(e))
      })
    })

    await client.query(
      `INSERT INTO risk_reviews (${columnOrder.map(col => col.name).join(', ')})
      VALUES ${placeholders.join(', ')}`,
>>>>>>> 349abf3391101e9126a8b665d7784e535c158240
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
