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
  review_type?: string
  risk_id?: string
  risk_title?: string
  status_before?: string
  status_after?: string
  actions?: string[]
  reviewer?: string
  risks_reviewed?: number
  new_risks_identified?: number
  risks_closed?: number
  risks_escalated?: number
  notes?: string
  key_findings?: string
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

function isUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(v => (typeof v === 'string' ? v.trim() : String(v ?? '').trim()))
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(v => v.trim()).filter(Boolean)
    }
    return [trimmed]
  }

  if (value == null) return []
  return [String(value)]
}

function toInteger(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value)
  }
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isNaN(parsed) ? defaultValue : parsed
}

function normalizeReviewDate(value: unknown): string {
  const str = typeof value === 'string' ? value.trim() : ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }
  if (str && !Number.isNaN(Date.parse(str))) {
    return new Date(str).toISOString().slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
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
    const columnResult = await client.query<{ column_name: string; data_type: string; udt_name: string }>(
      `SELECT column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'risk_reviews'`
    )
    const columnSet = new Set(columnResult.rows.map(row => row.column_name))
    const columnMeta = new Map(columnResult.rows.map(row => [row.column_name, row]))

    const pickColumn = (options: string[]): string | null => {
      for (const option of options) {
        if (columnSet.has(option)) {
          return option
        }
      }
      return null
    }

    const reviewIdColumn = pickColumn(['review_id'])
    const reviewDateColumn = pickColumn(['review_date', 'reviewed_at', 'review_timestamp'])
    const reviewTypeColumn = pickColumn(['review_type'])
    const newRisksColumn = pickColumn(['new_risks_identified'])
    const risksClosedColumn = pickColumn(['risks_closed'])
    const risksEscalatedColumn = pickColumn(['risks_escalated'])
    const statusChangesColumn = pickColumn(['status_changes'])
    const keyFindingsColumn = pickColumn(['key_findings', 'notes', 'summary', 'review_notes'])
    const actionItemsColumn = pickColumn(['action_items', 'actions', 'follow_up_actions'])
    const reviewedByColumn = pickColumn(['reviewed_by', 'reviewer', 'reviewer_name'])
    const sourceDocumentColumn = pickColumn(['source_document_id'])
    const createdByColumn = pickColumn(['created_by'])

    const columnOrder: Array<{ name: string; value: (entity: RiskReview, index: number) => unknown }> = [
      { name: 'project_id', value: () => projectId }
    ]

    if (reviewIdColumn) {
      columnOrder.push({
        name: reviewIdColumn,
        value: (e, index) => safeReviewId(e.review_date || '', e.risk_id || e.risk_title, index)
      })
    }
    if (reviewDateColumn) {
      columnOrder.push({ name: reviewDateColumn, value: (e) => normalizeReviewDate(e.review_date) })
    }
    if (reviewTypeColumn) {
      columnOrder.push({
        name: reviewTypeColumn,
        value: (e) => e.review_type || (e.risk_id || e.risk_title ? 'risk_status' : 'periodic')
      })
    }
    if (newRisksColumn) {
      columnOrder.push({ name: newRisksColumn, value: (e) => toInteger(e.new_risks_identified) })
    }
    if (risksClosedColumn) {
      columnOrder.push({ name: risksClosedColumn, value: (e) => toInteger(e.risks_closed) })
    }
    if (risksEscalatedColumn) {
      columnOrder.push({ name: risksEscalatedColumn, value: (e) => toInteger(e.risks_escalated) })
    }
    if (statusChangesColumn) {
      columnOrder.push({
        name: statusChangesColumn,
        value: (e) => {
          if (!e.status_before && !e.status_after) return []
          return [{
            risk_id: e.risk_id || null,
            risk_title: e.risk_title || null,
            status_before: e.status_before || null,
            status_after: e.status_after || null
          }]
        }
      })
    }
    if (keyFindingsColumn) {
      columnOrder.push({
        name: keyFindingsColumn,
        value: (e) => e.key_findings || e.notes || null
      })
    }
    if (actionItemsColumn) {
      columnOrder.push({ name: actionItemsColumn, value: (e) => e.actions || [] })
    }
    if (reviewedByColumn) {
      columnOrder.push({ name: reviewedByColumn, value: (e) => e.reviewer || null })
    }
    if (sourceDocumentColumn) {
      columnOrder.push({ name: sourceDocumentColumn, value: (e) => e.source_document_id || null })
    }
    if (createdByColumn) {
      columnOrder.push({ name: createdByColumn, value: () => userId })
    }

    if (!reviewIdColumn || !reviewDateColumn) {
      throw new Error('risk_reviews table is missing required columns (review_id, review_date)')
    }

    if (columnOrder.length <= 1) {
      throw new Error('risk_reviews table has no writable columns')
    }

    await client.query('DELETE FROM risk_reviews WHERE project_id = $1', [projectId])

    const values: unknown[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * columnOrder.length
      const rowPlaceholders = columnOrder.map((_, columnIndex) => `$${offset + columnIndex + 1}`)
      placeholders.push(`(${rowPlaceholders.join(', ')})`)
      columnOrder.forEach(column => {
        let value = column.value(e, index)
        const meta = columnMeta.get(column.name)

        if (meta?.udt_name === 'uuid') {
          value = isUuid(typeof value === 'string' ? value : null) ? value : null
        } else if (meta?.udt_name === '_uuid') {
          const uuidValues = toStringArray(value).filter(v => isUuid(v))
          value = uuidValues
        } else if (meta?.data_type === 'ARRAY') {
          value = toStringArray(value)
        } else if (meta?.data_type === 'json' || meta?.udt_name === 'jsonb') {
          value = value ?? []
        } else if (meta?.data_type === 'date') {
          value = normalizeReviewDate(value)
        } else if (
          meta?.data_type === 'integer' ||
          meta?.data_type === 'bigint' ||
          meta?.data_type === 'smallint'
        ) {
          value = toInteger(value)
        }

        values.push(value)
      })
    })

    await client.query(
      `INSERT INTO risk_reviews (${columnOrder.map(col => col.name).join(', ')})
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
