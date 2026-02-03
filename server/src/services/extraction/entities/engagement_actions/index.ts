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
import { isValidUUID } from '../../base/Persistence'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'

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

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 13
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`
      )

      values.push(
        projectId,
        isValidUUID(e.action_id) ? e.action_id : null, // Validate UUID
        isValidUUID(e.stakeholder_id) ? e.stakeholder_id : null, // Validate UUID
        e.stakeholder_name || null,
        e.action_type || null,
        e.description || null,
        e.planned_date || null,
        e.actual_date || null,
        e.outcome || null,
        e.follow_up_required ?? false,
        e.status || null,
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO engagement_actions (
        project_id, action_id, stakeholder_id, stakeholder_name, action_type, description,
        planned_date, actual_date, outcome, follow_up_required, status, source_document_id, created_by
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
