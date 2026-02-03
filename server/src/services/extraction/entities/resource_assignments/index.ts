/**
 * Resource Assignments Entity Module
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

export interface ResourceAssignment {
  resource_id?: string
  resource_name?: string
  activity_id?: string
  activity_name?: string
  allocation_pct?: number | null
  start_date?: string
  end_date?: string
  skill_required?: string
  skill_level?: string
  source_document?: string
  source_document_id?: string
}

export async function extractResourceAssignments(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<ResourceAssignment>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RESOURCE-ASSIGNMENTS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'resource_assignments',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RESOURCE-ASSIGNMENTS] ✅ Using cached result (${cached.length} entities)`)
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
  "resource_assignments": [
    {
      "resource_id": "Resource ID or name",
      "resource_name": "Resource name",
      "activity_id": "Activity ID",
      "activity_name": "Activity name",
      "allocation_pct": 50,
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "skill_required": "Skill required",
      "skill_level": "Junior|Intermediate|Senior|Expert",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Map resources to activities with allocation percentages',
      'Include skill requirements or levels when mentioned',
      'Provide start and end dates when available'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'resource_assignments',
      'resource assignments to activities',
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
    const rawEntities = parsed.resource_assignments || []

    const normalized: ResourceAssignment[] = rawEntities.map((entity: ResourceAssignment) => ({
      ...entity,
      allocation_pct: coerceNumber(entity?.allocation_pct)
    }))

    const validEntities: ResourceAssignment[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'RESOURCE-ASSIGNMENTS',
        entity.activity_name || entity.resource_name || 'Resource Assignment'
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
        'resource_assignments',
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
    logger.error('[EXTRACTION-RESOURCE-ASSIGNMENTS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveResourceAssignments(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: ResourceAssignment[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM project_resource_assignments WHERE project_id = $1', [projectId])

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 14
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`
      )

      values.push(
        projectId,
        e.resource_id || null, // user_id (using resource_id as user_id for now)
        null, // role_id (nullable for extraction)
        e.resource_name || null,
        e.activity_id || null,
        e.activity_name || null,
        e.allocation_pct ?? null,
        e.start_date || null,
        e.end_date || null,
        e.skill_required || null,
        e.skill_level || null,
        e.source_document_id || null,
        userId, // created_by
        0.00, // hourly_rate (nullable with default)
        'full-time' // assignment_type (required default)
      )
    })

    await client.query(
      `INSERT INTO project_resource_assignments (
        project_id, user_id, role_id, resource_name, activity_id, activity_name,
        allocation_pct, start_date, end_date, skill_required, skill_level,
        source_document_id, created_by, hourly_rate, assignment_type
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RESOURCE-ASSIGNMENTS] Failed to save', {
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
