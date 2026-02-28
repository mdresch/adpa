/**
 * Engagement Actions Entity Module
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import { isValidUUID, normalizeDate } from '../../base/Persistence'
import type { PersistenceResult } from '../../base/Persistence'
import type { PoolClient } from 'pg'

export interface EngagementAction {
  action_id?: string
  stakeholder_id?: string
  stakeholder_name?: string
  action_type?: string
  description?: string
  planned_date?: string
  actual_date?: string
  outcome?: string
  follow_up_required?: boolean
  status?: string
  source_document?: string
  source_document_id?: string
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (value === null || value === undefined) return false
  const normalized = String(value).trim().toLowerCase()
  return ['true', 'yes', 'y', '1'].includes(normalized)
}

function normalizeActionType(value?: string | null): string {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')

  const map: Record<string, string> = {
    meeting: 'meeting',
    email: 'email',
    workshop: 'workshop',
    presentation: 'presentation',
    survey: 'survey',
    training: 'training',
    consultation: 'consultation',
    review: 'review',
    approval: 'approval',
    notification: 'notification',
    communication: 'communication',
    engagement: 'engagement',
    feedback: 'feedback',
    feedback_session: 'feedback',
    update: 'update',
    status_update: 'update',
    interview: 'consultation',
    webinar: 'presentation',
    town_hall: 'meeting',
    briefing: 'presentation',
    demo: 'presentation',
    announcement: 'notification',
    report: 'communication',
    focus_group: 'consultation'
  }

  return map[normalized] || 'other'
}

async function getAllowedActionTypes(client: PoolClient): Promise<string[] | null> {
  const result = await client.query(
    `SELECT pg_get_constraintdef(c.oid) AS constraint_def
     FROM pg_constraint c
     JOIN pg_class t ON c.conrelid = t.oid
     JOIN pg_namespace n ON t.relnamespace = n.oid
     WHERE t.relname = 'engagement_actions'
       AND n.nspname = 'public'
       AND c.conname ILIKE '%action_type%'
       AND c.contype = 'c'
     LIMIT 1`
  )

  const constraintDef: string | undefined = result.rows[0]?.constraint_def
  if (!constraintDef) return null

  const matches = [...constraintDef.matchAll(/'([^']+)'/g)].map((m) => m[1].toLowerCase())
  return matches.length > 0 ? matches : null
}

export async function extractEngagementActions(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<EngagementAction>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-ENGAGEMENT-ACTIONS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'engagement_actions',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-ENGAGEMENT-ACTIONS] ✅ Using cached result (${cached.length} entities)`)
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
  "engagement_actions": [
    {
      "action_id": "Action identifier",
      "stakeholder_id": "Stakeholder ID",
      "stakeholder_name": "Stakeholder name",
      "action_type": "Workshop|Interview|Status Update|Survey",
      "description": "Action description",
      "planned_date": "YYYY-MM-DD",
      "actual_date": "YYYY-MM-DD",
      "outcome": "Outcome summary",
      "follow_up_required": true,
      "status": "planned|completed|blocked",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Capture engagement actions with outcomes',
      'Include planned and actual dates when available',
      'Specify whether follow-up is required'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'engagement_actions',
      'stakeholder engagement actions with outcomes',
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
    const rawEntities = parsed.engagement_actions || []

    const normalized: EngagementAction[] = rawEntities.map((entity: EngagementAction) => ({
      ...entity,
      follow_up_required: normalizeBoolean(entity?.follow_up_required)
    }))

    const validEntities: EngagementAction[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'ENGAGEMENT-ACTIONS',
        entity.action_type || entity.action_id || 'Engagement Action'
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
        'engagement_actions',
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
    logger.error('[EXTRACTION-ENGAGEMENT-ACTIONS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveEngagementActions(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: EngagementAction[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM engagement_actions WHERE project_id = $1', [projectId])

    const allowedActionTypes = await getAllowedActionTypes(client)
    const columnResult = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'engagement_actions'`
    )
    const availableColumns = new Set(columnResult.rows.map(row => row.column_name))

    const insertColumns = [
      'project_id',
      'action_id',
      'stakeholder_id',
      'stakeholder_name',
      'action_type',
      'description',
      'planned_date',
      'actual_date',
      'outcome',
      'follow_up_required',
      'status',
      'source_document_id',
      'created_by'
    ].filter(column => availableColumns.has(column))

    if (insertColumns.length === 0) {
      throw new Error('engagement_actions table has no expected columns for extraction insert')
    }

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * insertColumns.length
      placeholders.push(`(${insertColumns.map((_, i) => `$${offset + i + 1}`).join(', ')})`)

      const normalizedActionType = normalizeActionType(e.action_type)
      const safeActionType =
        !allowedActionTypes || allowedActionTypes.length === 0
          ? normalizedActionType
          : (allowedActionTypes.includes(normalizedActionType)
              ? normalizedActionType
              : (allowedActionTypes[0] || 'other'))

      const rowData: Record<string, any> = {
        project_id: projectId,
        action_id: isValidUUID(e.action_id) ? e.action_id : null,
        stakeholder_id: isValidUUID(e.stakeholder_id) ? e.stakeholder_id : null,
        stakeholder_name: e.stakeholder_name || null,
        action_type: safeActionType,
        description: e.description || null,
        planned_date: e.planned_date ? normalizeDate(e.planned_date) : null,
        actual_date: e.actual_date ? normalizeDate(e.actual_date) : null,
        outcome: e.outcome || null,
        follow_up_required: e.follow_up_required ?? false,
        status: e.status ? String(e.status).toLowerCase().trim() : null,
        source_document_id: isValidUUID(e.source_document_id) ? e.source_document_id : null,
        created_by: userId
      }

      insertColumns.forEach((column) => {
        values.push(rowData[column] ?? null)
      })
    })

    await client.query(
      `INSERT INTO engagement_actions (
        ${insertColumns.join(', ')}
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-ENGAGEMENT-ACTIONS] Failed to save', {
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
